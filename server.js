import http from 'node:http';
import { openDatabase } from './database.js';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const DAY = 86_400_000;
const fail = (status, message) => Object.assign(new Error(message), { status });
const clean = (value, max = 100) => String(value ?? '').trim().slice(0, max);
const hashPassword = (password, salt = randomBytes(16).toString('hex')) => `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const validPassword = (password, stored) => {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashPassword(password, salt).split(':')[1], 'hex'));
};
const publicUser = u => ({ id: u.id, name: u.name, username: u.username, city: u.city, country: u.country, demo: Boolean(u.demo) });

export async function createApp({ database = join(root, 'data', 'paper-trails.sqlite'), seed = true, now = () => Date.now(), tursoUrl, tursoToken, requireTurso = false } = {}) {
  const db = await openDatabase({database,url:tursoUrl,authToken:tursoToken,requireRemote:requireTurso});
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, city TEXT NOT NULL, country TEXT NOT NULL, demo INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS letters (id TEXT PRIMARY KEY, sender_id TEXT REFERENCES users(id), recipient_id TEXT REFERENCES users(id), subject TEXT NOT NULL, body TEXT NOT NULL, paper TEXT NOT NULL, stamp TEXT NOT NULL, delivery TEXT NOT NULL, sent_at INTEGER NOT NULL, arrives_at INTEGER NOT NULL, opened_at INTEGER, archived INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), content TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS letters_sender ON letters(sender_id,sent_at);
      CREATE INDEX IF NOT EXISTS letters_recipient ON letters(recipient_id,sent_at);
      CREATE INDEX IF NOT EXISTS drafts_writer ON drafts(user_id,updated_at);
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);`);
    if (seed && !(await db.prepare('SELECT id FROM users WHERE id=?').get('demo-alex'))) {
      const samples = [];
      const insert = {run:(...args)=>samples.push({sql:'INSERT INTO users VALUES (?,?,?,?,?,?,1)',args})};
      const password = hashPassword(randomBytes(32).toString('hex'));
      insert.run('demo-alex', 'alex.demo', 'Alex Morgan', password, 'Kuala Lumpur', 'Malaysia');
      insert.run('demo-june', 'june.demo', 'June Park', password, 'Kyoto', 'Japan');
      insert.run('demo-oliver', 'oliver.demo', 'Oliver Bennett', password, 'London', 'United Kingdom');
      const letter = {run:(...args)=>samples.push({sql:'INSERT INTO letters VALUES (?,?,?,?,?,?,?,?,?,?,?,0)',args})};
      letter.run('sample-june', 'demo-june', 'demo-alex', 'A little piece of Kyoto', 'Dear Alex,\n\nI found a tiny café tucked away on a quiet street today. There were just four seats, a sleeping cat, and the best coffee I have had in months.\n\nIt made me think of you. Of all the places we said we would visit, and all the little things we forget to tell each other when life gets busy.\n\nThe leaves are starting to turn here. I wish I could tuck one into this envelope. For now, imagine a small, perfectly golden leaf falling into your hands.\n\nWrite when you have a quiet moment. There is no hurry.\n\nWith love,\nJune', 'cream', 'botanical', 'tomorrow', now()-3*DAY, now()-2*DAY, null);
      letter.run('sample-oliver', 'demo-oliver', 'demo-alex', 'The art of doing absolutely nothing', 'Hello you,\n\nThis is your permission slip to do absolutely nothing this Sunday. Make tea. Leave your phone in another room. Read the same page of a book three times.\n\nI spent the afternoon watching rain race down the window. A remarkably good use of an afternoon, as it turns out.\n\nHope your corner of the world is kind to you this week.\n\nYour friend,\nOliver', 'sage', 'moon', 'tomorrow', now()-5*DAY, now()-4*DAY, now()-3*DAY);
      letter.run('sample-sent', 'demo-alex', 'demo-june', 'Some things are better on paper', 'Dear June,\n\nI am trying something a little slower. A proper letter, with room to think and a little distance to travel.\n\nI hope this finds you on a good day. Tell me about the little café when you write back.\n\nUntil then,\nAlex', 'cream', 'sunrise', 'three-days', now()-DAY, now()+2*DAY, null);
      await db.batch(samples);
    }
  } catch (error) { db.close(); throw error; }
  const limits = new Map();
  const getUser = async req => {
    const token = /(?:^|;\s*)pt_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
    const user = token ? (await db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(token, now())) : null;
    return user?.demo && !seed ? null : user;
  };
  const auth = async req => { const user = await getUser(req); if (!user) throw fail(401, 'Please sign in to visit your post office.'); return user; };
  const session = async (res, id) => {
    const token = randomBytes(32).toString('hex');
    await db.batch([
      {sql:'DELETE FROM sessions WHERE expires<?',args:[now()]},
      {sql:'INSERT INTO sessions VALUES (?,?,?)',args:[token,id,now()+7*DAY]}
    ]);
    res.setHeader('Set-Cookie', `pt_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
  };
  const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const body = async req => {
    let input = '';
    for await (const chunk of req) { input += chunk; if (Buffer.byteLength(input) > 50_000) throw fail(413, 'This envelope is a little too full. Keep your letter under 20,000 characters.'); }
    try { return JSON.parse(input || '{}'); } catch { throw fail(400, 'We could not read that request. Please try again.'); }
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      if (path === '/api/health' && ['GET','HEAD'].includes(req.method)) {
        try { await db.prepare('SELECT 1 AS ready').get(); }
        catch { return json(res,503,{ok:false}); }
        return json(res,200,{ok:true});
      }
      if (path.startsWith('/api/')) {
        if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) throw fail(403, 'Please send this request from Paper Trails.');
        if (path === '/api/session' && req.method === 'GET') { const user = await getUser(req); return json(res, 200, { user: user ? publicUser(user) : null, demoAvailable: seed }); }
        if (path === '/api/demo' && req.method === 'POST') {
          if (!seed) throw fail(404, 'The demo is unavailable.');
          const data = await body(req);
          const id = data.persona === 'june' ? 'demo-june' : 'demo-alex';
          await session(res, id); return json(res, 200, { user: publicUser((await db.prepare('SELECT * FROM users WHERE id=?').get(id))) });
        }
        if (path === '/api/auth/register' || path === '/api/auth/login') {
          if (req.method !== 'POST') throw fail(405, 'Use the sign-in form.');
          const key = req.socket.remoteAddress;
          const limit = limits.get(key);
          if (!limit || limit.until < now()) limits.set(key, { count: 1, until: now()+900_000 });
          else if (++limit.count > 30) throw fail(429, 'Too many attempts. Please return in 15 minutes.');
          const data = await body(req);
          const username = clean(data.username, 40).toLowerCase().replace(/^@/, '');
          const password = String(data.password || '');
          if (password.length > 200) throw fail(400, 'Please use a password under 200 characters.');
          let user;
          if (path.endsWith('register')) {
            if (!/^[a-z0-9_]{3,24}$/.test(username)) throw fail(400, 'Use 3–24 letters, numbers, or underscores for your postal address.');
            if (password.length < 8) throw fail(400, 'Choose a password with at least 8 characters.');
            const name = clean(data.name, 70);
            if (!name) throw fail(400, 'Tell us your name for your mailbox.');
            if ((await db.prepare('SELECT id FROM users WHERE username=?').get(username))) throw fail(409, 'That postal address is already taken. Try another.');
            const id = randomUUID();
            try {
              await db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,0)').run(id, username, name, hashPassword(password), clean(data.city, 60) || 'My town', clean(data.country, 60) || 'My corner of the world');
            } catch (error) {
              if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.errcode === 2067) throw fail(409, 'That postal address is already taken. Try another.');
              throw error;
            }
            user = (await db.prepare('SELECT * FROM users WHERE id=?').get(id));
          } else {
            user = (await db.prepare('SELECT * FROM users WHERE username=? AND demo=0').get(username));
            if (!user || !validPassword(password, user.password)) throw fail(401, 'That address and password do not match.');
          }
          await session(res, user.id); return json(res, 200, { user: publicUser(user) });
        }
        if (path === '/api/auth/logout' && req.method === 'POST') {
          const token = /pt_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
          if (token) (await db.prepare('DELETE FROM sessions WHERE token=?').run(token));
          res.setHeader('Set-Cookie', 'pt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
          return json(res, 200, { ok: true });
        }
        const user = await auth(req);
        if (path === '/api/mail' && req.method === 'GET') {
          const letters = (await db.prepare(`SELECT l.*, s.name AS sender_name, s.username AS sender_username, s.city AS sender_city, s.country AS sender_country, r.name AS recipient_name, r.username AS recipient_username, r.city AS recipient_city, r.country AS recipient_country FROM letters l JOIN users s ON s.id=l.sender_id JOIN users r ON r.id=l.recipient_id WHERE sender_id=? OR recipient_id=? ORDER BY sent_at DESC`).all(user.id, user.id));
          for (const letter of letters) {
            letter.status = letter.arrives_at <= now() ? 'delivered' : 'travelling';
            if (letter.recipient_id === user.id && letter.status !== 'delivered' && (letter.sender_id !== user.id || letter.delivery === 'capsule')) {
              letter.body = null;
              if (letter.sender_id !== user.id) letter.subject = 'A little something is on its way';
            }
          }
          const drafts = (await db.prepare('SELECT * FROM drafts WHERE user_id=? ORDER BY updated_at DESC').all(user.id)).map(d => ({ ...JSON.parse(d.content), id: d.id, updated_at: d.updated_at }));
          return json(res, 200, { letters, drafts, now: now() });
        }
        if (path === '/api/people' && req.method === 'GET') {
          const q = clean(url.searchParams.get('q'), 30).toLowerCase().replace(/^@/, '');
          const people = q ? (await db.prepare('SELECT * FROM users WHERE username=? AND (demo=0 OR ?=1) LIMIT 1').all(q, user.demo)) : [];
          return json(res, 200, { people: people.map(publicUser) });
        }
        if (path === '/api/letters' && req.method === 'POST') {
          const data = await body(req);
          const recipient = data.delivery === 'capsule' ? user : (await db.prepare('SELECT * FROM users WHERE username=? AND (demo=0 OR ?=1)').get(clean(data.recipient, 40).toLowerCase().replace(/^@/, ''), user.demo));
          if (!recipient) throw fail(400, 'We could not find that postal address. Ask your friend to create an account here first.');
          if (recipient.demo && !user.demo) throw fail(400, 'Sample mailboxes cannot receive personal letters.');
          const subject = clean(data.subject, 120), message = clean(data.body, 20_000);
          if (!subject || !message) throw fail(400, 'Give your letter a title and a few words before sealing it.');
          const sent = now();
          const times = { express: sent+60_000, tomorrow: sent+DAY, 'three-days': sent+3*DAY, capsule: Number(data.arrivesAt) };
          const arrives = times[data.delivery];
          if (!arrives || arrives <= sent || arrives > sent+3660*DAY) throw fail(400, 'Choose an arrival date in the future, within the next 10 years.');
          const id = randomUUID();
          const posting = [{sql:'INSERT INTO letters VALUES (?,?,?,?,?,?,?,?,?,?,NULL,0)',args:[id, user.id, recipient.id, subject, message, ['cream','sage','rose'].includes(data.paper) ? data.paper : 'cream', ['botanical','moon','sunrise'].includes(data.stamp) ? data.stamp : 'botanical', data.delivery, sent, arrives]}];
          if (data.draftId) posting.push({sql:'DELETE FROM drafts WHERE id=? AND user_id=?',args:[data.draftId,user.id]});
          await db.batch(posting);
          return json(res, 201, { id, arrives_at: arrives });
        }
        if (path === '/api/drafts' && req.method === 'POST') {
          const data = await body(req);
          const id = clean(data.id, 80) || randomUUID();
          const existing = (await db.prepare('SELECT user_id FROM drafts WHERE id=?').get(id));
          if (existing && existing.user_id !== user.id) throw fail(403, 'This draft belongs to another writer.');
          const content = { recipient: clean(data.recipient, 40), subject: clean(data.subject, 120), body: clean(data.body, 20_000), paper: clean(data.paper, 10), stamp: clean(data.stamp, 15), delivery: clean(data.delivery, 20), arrivesAt: Number(data.arrivesAt) || null };
          const saved = await db.prepare('INSERT INTO drafts VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at WHERE drafts.user_id=excluded.user_id').run(id, user.id, JSON.stringify(content), now());
          if (!saved.rowsAffected) throw fail(403, 'This draft belongs to another writer.');
          return json(res, 200, { id });
        }
        const draftMatch = /^\/api\/drafts\/([^/]+)$/.exec(path);
        if (draftMatch && req.method === 'DELETE') { (await db.prepare('DELETE FROM drafts WHERE id=? AND user_id=?').run(draftMatch[1], user.id)); return json(res, 200, { ok: true }); }
        const letterMatch = /^\/api\/letters\/([^/]+)\/(open|archive)$/.exec(path);
        if (letterMatch && req.method === 'POST') {
          const letter = (await db.prepare('SELECT * FROM letters WHERE id=? AND recipient_id=?').get(letterMatch[1], user.id));
          if (!letter) throw fail(404, 'This letter is not in your mailbox.');
          if (letter.arrives_at > now()) throw fail(409, 'This letter is still travelling. Come back when it arrives.');
          if (letterMatch[2] === 'open') (await db.prepare('UPDATE letters SET opened_at=COALESCE(opened_at,?) WHERE id=?').run(now(), letter.id));
          else (await db.prepare('UPDATE letters SET archived=1-archived WHERE id=?').run(letter.id));
          return json(res, 200, { ok: true });
        }
        throw fail(404, 'That post office could not be found.');
      }
      if (!['GET','HEAD'].includes(req.method)) throw fail(405, 'This page cannot accept that request.');
      const file = { '/': 'index.html', '/app.js': 'app.js', '/journey-map.js': 'journey-map.js', '/maps/land.json': 'maps/land.json', '/maps/cities.json': 'maps/cities.json', '/styles.css': 'styles.css', '/favicon.svg': 'favicon.svg' }[path];
      if (!file) throw fail(404, 'Page not found.');
      const location = join(root, 'public', file);
      if (!existsSync(location)) throw fail(404, 'Page not found.');
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)];
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : readFileSync(location));
    } catch (error) { if (!error.status) console.error('Post office request failed:',error.code || error.name); json(res, error.status || 500, { error: error.status ? error.message : 'The post office hit a snag. Please try again.' }); }
  });
  return { server, db, close: () => new Promise(resolve => server.close(() => { db.close(); resolve(); })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const port = Number(process.env.PORT || 3000);
    const app = await createApp({
      database:process.env.PAPER_TRAILS_DB || undefined,
      tursoUrl:process.env.TURSO_DATABASE_URL,
      tursoToken:process.env.TURSO_AUTH_TOKEN,
      requireTurso:process.env.PAPER_TRAILS_REQUIRE_TURSO === 'true' || process.env.RENDER === 'true',
      seed:process.env.PAPER_TRAILS_DEMO ? process.env.PAPER_TRAILS_DEMO !== 'false' : process.env.NODE_ENV !== 'production'
    });
    const host = process.env.HOST || (process.env.RENDER === 'true' ? '0.0.0.0' : '127.0.0.1');
    app.server.listen(port,host,()=>console.log(`Paper Trails is open at http://localhost:${port} (${app.db.kind})`));
    app.server.on('error',error=>{ console.error('Could not start the post office:',error.code || error.name); app.db.close(); process.exitCode=1; });
    const stop = () => app.close().then(()=>process.exit(0));
    process.once('SIGTERM',stop);
    process.once('SIGINT',stop);
  } catch (error) {
    // SDK errors may contain a URL; do not print connection strings or tokens.
    const message = /^(Set both TURSO|TURSO_DATABASE_URL)/.test(error.message) ? error.message : 'Could not open the database. Check its credentials and connection, then restart.';
    console.error(message);
    process.exitCode=1;
  }
}
