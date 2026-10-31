import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../database.js';
import {createApp} from '../server.js';
import {readLocalSnapshot,importSnapshot} from '../scripts/import-to-turso.js';

const user={id:'alice',username:'alice',name:'Alice',password:'stored-password-hash',city:'Kuala Lumpur',country:'Malaysia',demo:0};
const snapshot=()=>({users:[{...user}],letters:[],drafts:[{id:'draft-1',user_id:'alice',content:'{"subject":"Keep these words","body":"Hello"}',updated_at:1000}]});

test('hosted mode requires both Turso values and refuses local or insecure URLs',async()=>{
  await assert.rejects(openDatabase({database:':memory:',requireRemote:true}),/Set both TURSO/);
  await assert.rejects(openDatabase({url:'libsql://example.turso.io'}),/Set both TURSO/);
  await assert.rejects(openDatabase({authToken:'secret'}),/Set both TURSO/);
  for(const url of ['file:local.sqlite','http://example.test','https://name:password@example.test']) {
    await assert.rejects(openDatabase({url,authToken:'secret'}),/TURSO_DATABASE_URL/);
  }
});

test('Turso HTTP transport sends server-side authorization and decodes SQL results',async()=>{
  const calls=[];
  const db=await openDatabase({url:'https://test-db.turso.io',authToken:'test-token',fetch:async request=>{
    const body=await request.json();
    calls.push({authorization:request.headers.get('authorization'),body});
    const results=body.requests.map(operation=>({type:'ok',response:operation.type==='execute' ? {
      type:'execute',result:{cols:[{name:'ready',decltype:'INTEGER'}],rows:[[{type:'integer',value:'1'}]],affected_row_count:0,last_insert_rowid:null}
    } : {type:'close'}}));
    return new Response(JSON.stringify({baton:null,base_url:null,results}),{headers:{'content-type':'application/json'}});
  }});
  try {
    assert.equal(db.kind,'turso');
    assert.equal((await db.prepare('SELECT 1 AS ready').get()).ready,1);
    assert.equal(calls.length,2);
    assert.ok(calls.every(call=>call.authorization==='Bearer test-token'));
    assert.equal(calls[1].body.requests[0].stmt.sql,'SELECT 1 AS ready');
  } finally {db.close();}
});

test('accounts, sessions, and drafts remain available after closing and reopening a disk database',async t=>{
  const folder=await mkdtemp(join(tmpdir(),'paper-trails-persistence-'));
  const database=join(folder,'post.sqlite');
  let app=await createApp({database,seed:false});
  t.after(async()=>{await app.close(); await rm(folder,{recursive:true,force:true});});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  let base=`http://127.0.0.1:${app.server.address().port}`;
  const registration=await fetch(`${base}/api/auth/register`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Alice',username:'alice',password:'a-long-password',city:'Kyoto',country:'Japan'})});
  assert.equal(registration.status,200);
  const cookie=registration.headers.get('set-cookie').split(';')[0];
  const result=await fetch(`${base}/api/drafts`,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({subject:'For another day',body:'Still here after a restart.'})});
  assert.equal(result.status,200);
  await app.close();
  app=await createApp({database,seed:false});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${app.server.address().port}`;
  const mail=await fetch(`${base}/api/mail`,{headers:{cookie}});
  assert.equal(mail.status,200);
  assert.equal((await mail.json()).drafts[0].body,'Still here after a restart.');
  const health=await fetch(`${base}/api/health`);
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{ok:true});
});

test('imports preserve account IDs and password hashes and refuse a nonempty destination',async t=>{
  const app=await createApp({database:':memory:',seed:false});
  t.after(()=>app.close());
  assert.deepEqual(await importSnapshot(snapshot(),app.db),{users:1,letters:0,drafts:1});
  assert.equal((await app.db.prepare('SELECT password FROM users WHERE id=?').get('alice')).password,user.password);
  assert.equal((await app.db.prepare('SELECT content FROM drafts').get()).content,snapshot().drafts[0].content);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM sessions').get()).count,0);
  await assert.rejects(importSnapshot(snapshot(),app.db),/destination must be empty/);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM users').get()).count,1);
});

test('a failed import rolls back all accounts and drafts',async t=>{
  const app=await createApp({database:':memory:',seed:false});
  t.after(()=>app.close());
  const invalid=snapshot();
  invalid.drafts[0].user_id='missing-user';
  await assert.rejects(importSnapshot(invalid,app.db));
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM users').get()).count,0);
});

test('reading a legacy SQLite file excludes demo accounts and leaves the source intact',async t=>{
  const folder=await mkdtemp(join(tmpdir(),'paper-trails-import-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  const path=join(folder,'old.sqlite');
  const app=await createApp({database:path});
  await app.db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,0)').run(user.id,user.username,user.name,user.password,user.city,user.country);
  await app.db.prepare('INSERT INTO drafts VALUES (?,?,?,?)').run('d','alice','{}',1000);
  await app.close();
  const exported=readLocalSnapshot(path);
  assert.equal(exported.users.length,1);
  assert.equal(exported.users[0].password,user.password);
  assert.equal(exported.drafts.length,1);
  assert.equal(exported.letters.length,0);
  assert.equal(readLocalSnapshot(path,{includeDemo:true}).users.length,4);
  const legacy=new DatabaseSync(path,{readOnly:true});
  assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM users').get().count,4);
  legacy.close();
});

test('batch failure cannot post a partial letter or remove its saved draft',async t=>{
  const app=await createApp({database:':memory:',seed:false});
  t.after(()=>app.close());
  await importSnapshot(snapshot(),app.db);
  await assert.rejects(app.db.batch([
    {sql:'DELETE FROM drafts WHERE id=?',args:['draft-1']},
    {sql:'INSERT INTO letters VALUES (?,?,?,?,?,?,?,?,?,?,NULL,0)',args:['bad','alice','missing','Subject','Body','cream','moon','express',1000,61000]}
  ]));
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM drafts').get()).count,1);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM letters').get()).count,0);
});

test('concurrent registration of one address returns a conflict rather than a server error',async t=>{
  const app=await createApp({database:':memory:',seed:false});
  t.after(()=>app.close());
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${app.server.address().port}/api/auth/register`;
  const create=()=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'same-address'.replace('-','_'),name:'Alice',password:'a-long-password'})});
  const responses=await Promise.all([create(),create()]);
  assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
});
