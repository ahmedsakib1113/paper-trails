import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createApp} from '../server.js';

// This uses two temporary accounts, then removes only the records it creates.
let time=Date.now(), app, base;
const users=[], letters=[];
const options={seed:false,tursoUrl:process.env.TURSO_DATABASE_URL,tursoToken:process.env.TURSO_AUTH_TOKEN,requireTurso:true,now:()=>time};
const start=async()=>{
  app=await createApp(options);
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${app.server.address().port}`;
};
function client() {
  let cookie='';
  return async(path,method='GET',data)=>{
    const response=await fetch(base+path,{method,headers:{cookie,...(data ? {'content-type':'application/json'} : {})},body:data ? JSON.stringify(data) : undefined});
    if(response.headers.get('set-cookie')) cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,data:await response.json()};
  };
}

try {
  await start();
  const sender=client(), recipient=client();
  const suffix=randomBytes(6).toString('hex');
  for(const [index,request] of [sender,recipient].entries()) {
    const username=`pt_check_${suffix}_${index}`;
    const response=await request('/api/auth/register','POST',{username,name:`Connection check ${index+1}`,password:randomBytes(24).toString('hex'),city:index ? 'Kyoto' : 'Kuala Lumpur',country:index ? 'Japan' : 'Malaysia'});
    assert.equal(response.status,200,'Cloud registration failed');
    users.push({id:response.data.user.id,username});
  }
  const draft=await sender('/api/drafts','POST',{recipient:users[1].username,subject:'Temporary connection check',body:'Cloud delivery verification.',delivery:'express'});
  assert.equal(draft.status,200);
  const posted=await sender('/api/letters','POST',{recipient:users[1].username,subject:'Temporary connection check',body:'Cloud delivery verification.',delivery:'express',draftId:draft.data.id});
  assert.equal(posted.status,201,'Cloud posting failed');
  letters.push(posted.data.id);
  const before=await recipient('/api/mail');
  const sealed=before.data.letters.find(letter=>letter.id===posted.data.id);
  assert.equal(sealed.body,null,'An in-transit letter must stay sealed');
  assert.equal((await recipient(`/api/letters/${posted.data.id}/open`,'POST',{})).status,409);
  assert.ok(!(await sender('/api/mail')).data.drafts.some(item=>item.id===draft.data.id),'Posting must remove the draft');

  await app.close();
  app=undefined;
  await start();
  const restored=await recipient('/api/mail');
  assert.equal(restored.status,200,'Cloud sessions must survive an app restart');
  assert.ok(restored.data.letters.some(letter=>letter.id===posted.data.id),'Letters must survive an app restart');
  time=posted.data.arrives_at;
  assert.equal((await recipient(`/api/letters/${posted.data.id}/open`,'POST',{})).status,200);
  assert.equal((await recipient('/api/mail')).data.letters.find(letter=>letter.id===posted.data.id).body,'Cloud delivery verification.');
  assert.equal((await sender('/api/mail')).data.letters.find(letter=>letter.id===posted.data.id).opened_at,time);
  assert.equal((await recipient(`/api/letters/${posted.data.id}/archive`,'POST',{})).status,200);
  assert.deepEqual((await sender('/api/health')).data,{ok:true});
  console.log('Cloud verification passed: registration, drafts, posting, sealed delivery, restart persistence, arrival, read receipts, and keepsakes.');
} catch(error) {
  console.error('Cloud verification failed:',error instanceof assert.AssertionError ? error.message : error.code || error.name);
  process.exitCode=1;
} finally {
  if(users.length) {
    try {
      if(!app) await start();
      const cleanup=letters.map(id=>({sql:'DELETE FROM letters WHERE id=? AND sender_id=?',args:[id,users[0].id]}));
      for(const user of users) cleanup.push(
        {sql:'DELETE FROM drafts WHERE user_id=?',args:[user.id]},
        {sql:'DELETE FROM sessions WHERE user_id=?',args:[user.id]},
        {sql:'DELETE FROM users WHERE id=? AND username=?',args:[user.id,user.username]}
      );
      await app.db.batch(cleanup);
      console.log('Temporary verification accounts and letters removed.');
    } catch(error) {
      console.error('Verification cleanup could not finish:',error.code || error.name);
      process.exitCode=1;
    }
  }
  await app?.close();
}
