import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

test('the complete postal journey respects delivery times and mailbox ownership', async t => {
  let time = Date.now();
  const app = await createApp({ database: ':memory:', seed: false, now: () => time });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  function client() {
    let cookie = '';
    return async (path, method = 'GET', data, origin) => {
      const res = await fetch(base + path, { method, headers: { cookie, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { origin } : {}) }, body: data ? JSON.stringify(data) : undefined });
      if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
      return { status: res.status, data: await res.json(), headers: res.headers };
    };
  }
  const alice = client(), bob = client(), eve = client();
  let aliceId, letterId, draftId;
  await t.test('anonymous mail is private; account names are validated and unique', async () => {
    assert.equal((await alice('/api/session')).data.demoAvailable, false);
    assert.equal((await alice('/api/mail')).status, 401);
    assert.equal((await alice('/api/auth/register', 'POST', { username: 'invalid address', password: 'a-secure-password', name: 'Alice' })).status, 400);
    const result = await alice('/api/auth/register', 'POST', { username: 'alice', password: 'a-secure-password', name: 'Alice Smith', city: 'Kuala Lumpur', country: 'Malaysia' });
    assert.equal(result.status, 200); aliceId = result.data.user.id;
    assert.equal(result.data.user.password, undefined);
    assert.match(result.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await bob('/api/auth/register', 'POST', { username: 'alice', password: 'another-password', name: 'Other Alice' })).status, 409);
    assert.equal((await bob('/api/auth/register', 'POST', { username: 'bob', password: 'another-password', name: 'Bob Jones', city: 'Kyoto', country: 'Japan' })).status, 200);
    assert.equal((await eve('/api/auth/register', 'POST', { username: 'eve', password: 'another-password', name: 'Eve' })).status, 200);
  });
  await t.test('drafts persist, are private, and cannot be overwritten by another account', async () => {
    const result = await alice('/api/drafts', 'POST', { subject: 'Thoughts', body: 'A private draft', recipient: 'bob', paper: 'sage', stamp: 'moon', delivery: 'express' });
    draftId = result.data.id;
    assert.equal((await alice('/api/mail')).data.drafts[0].body, 'A private draft');
    assert.equal((await bob('/api/mail')).data.drafts.length, 0);
    assert.equal((await bob('/api/drafts', 'POST', { id: draftId, body: 'Tampered' })).status, 403);
    await bob(`/api/drafts/${draftId}`, 'DELETE');
    assert.equal((await alice('/api/mail')).data.drafts.length, 1);
  });
  await t.test('invalid recipients and cross-site writes are rejected', async () => {
    const payload = { recipient: 'missing', subject: 'Hello', body: 'A thought', delivery: 'express' };
    assert.equal((await alice('/api/letters', 'POST', payload)).status, 400);
    assert.equal((await alice('/api/letters', 'POST', { ...payload, recipient: 'bob' }, 'https://another-site.example')).status, 403);
  });
  await t.test('posting removes the draft; the recipient cannot read or unseal an in-transit letter', async () => {
    const result = await alice('/api/letters', 'POST', { recipient: '@bob', subject: 'A little hello', body: 'Dear Bob,\nA private thought.', delivery: 'express', paper: 'sage', stamp: 'moon', draftId });
    assert.equal(result.status, 201); letterId = result.data.id;
    const sent = (await alice('/api/mail')).data;
    assert.equal(sent.drafts.length, 0);
    assert.equal(sent.letters[0].body, 'Dear Bob,\nA private thought.');
    const received = (await bob('/api/mail')).data.letters[0];
    assert.equal(received.status, 'travelling');
    assert.equal(received.body, null);
    assert.notEqual(received.subject, 'A little hello');
    assert.equal((await bob(`/api/letters/${letterId}/open`, 'POST', {})).status, 409);
    assert.equal((await bob(`/api/letters/${letterId}/archive`, 'POST', {})).status, 409);
    assert.equal((await eve('/api/mail')).data.letters.length, 0);
  });
  await t.test('arrival unlocks the letter; only its recipient can open and keep it', async () => {
    time += 60_001;
    let letter = (await bob('/api/mail')).data.letters[0];
    assert.equal(letter.status, 'delivered');
    assert.equal(letter.subject, 'A little hello');
    assert.equal(letter.body, 'Dear Bob,\nA private thought.');
    assert.equal((await eve(`/api/letters/${letterId}/open`, 'POST', {})).status, 404);
    assert.equal((await alice(`/api/letters/${letterId}/archive`, 'POST', {})).status, 404);
    assert.equal((await bob(`/api/letters/${letterId}/open`, 'POST', {})).status, 200);
    letter = (await alice('/api/mail')).data.letters[0];
    assert.equal(letter.opened_at, time);
    await bob(`/api/letters/${letterId}/archive`, 'POST', {});
    assert.equal((await bob('/api/mail')).data.letters[0].archived, 1);
    await bob(`/api/letters/${letterId}/archive`, 'POST', {});
    assert.equal((await bob('/api/mail')).data.letters[0].archived, 0);
  });
  await t.test('future-self letters reject past dates and use the writer as recipient', async () => {
    const payload = { recipient: 'bob', subject: 'For later', body: 'Remember this day.', delivery: 'capsule', arrivesAt: time - 1 };
    assert.equal((await alice('/api/letters', 'POST', payload)).status, 400);
    const result = await alice('/api/letters', 'POST', { ...payload, arrivesAt: time + 86_400_000 });
    assert.equal(result.status, 201);
    const capsule = (await alice('/api/mail')).data.letters.find(l => l.id === result.data.id);
    assert.equal(capsule.recipient_id, aliceId);
    assert.equal(capsule.status, 'travelling');
    assert.equal(capsule.body, null);
    assert.equal((await alice(`/api/letters/${capsule.id}/open`, 'POST', {})).status, 409);
  });
  await t.test('logout revokes access and login restores the saved mailbox', async () => {
    await alice('/api/auth/logout', 'POST', {});
    assert.equal((await alice('/api/mail')).status, 401);
    assert.equal((await alice('/api/auth/login', 'POST', { username: 'alice', password: 'incorrect-password' })).status, 401);
    assert.equal((await alice('/api/auth/login', 'POST', { username: 'alice', password: 'a-secure-password' })).status, 200);
    assert.equal((await alice('/api/mail')).data.letters.length, 2);
  });
  await t.test('pages have browser protections and no arbitrary file access', async () => {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal((await fetch(`${base}/server.js`)).status, 404);
    assert.equal((await fetch(`${base}/data/paper-trails.sqlite`)).status, 404);
  });
});

test('sample mailbox switching works without exposing demo passwords', async t => {
  const app = await createApp({ database: ':memory:' });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const res = await fetch(`${base}/api/demo`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({persona:'alex'}) });
  const user = (await res.json()).user;
  assert.equal(user.username, 'alex.demo');
  assert.equal(user.password, undefined);
  const mail = await fetch(`${base}/api/mail`, {headers:{cookie:res.headers.get('set-cookie').split(';')[0]}});
  const letters=(await mail.json()).letters;
  assert.equal(letters.length, 3);
  assert.equal(letters.filter(l=>l.status==='travelling').length, 1);
});
