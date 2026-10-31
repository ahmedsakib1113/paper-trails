import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';

export function readLocalSnapshot(path, {includeDemo = false} = {}) {
  const source = new DatabaseSync(resolve(path),{readOnly:true});
  try {
    const users = source.prepare('SELECT * FROM users').all().filter(user=>includeDemo || !user.demo);
    const ids = new Set(users.map(user=>user.id));
    return {
      users,
      letters:source.prepare('SELECT * FROM letters').all().filter(letter=>ids.has(letter.sender_id) && ids.has(letter.recipient_id)),
      drafts:source.prepare('SELECT * FROM drafts').all().filter(draft=>ids.has(draft.user_id))
    };
  } finally { source.close(); }
}

const columns = {
  users:['id','username','name','password','city','country','demo'],
  letters:['id','sender_id','recipient_id','subject','body','paper','stamp','delivery','sent_at','arrives_at','opened_at','archived'],
  drafts:['id','user_id','content','updated_at']
};

export async function importSnapshot(snapshot, target) {
  return target.transaction(async transaction => {
    const {total} = await transaction.prepare('SELECT (SELECT COUNT(*) FROM users)+(SELECT COUNT(*) FROM letters)+(SELECT COUNT(*) FROM drafts)+(SELECT COUNT(*) FROM sessions) AS total').get();
    if (total !== 0) throw new Error('Import stopped: the destination must be empty. No existing data was changed.');
    const counts = {};
    for (const [table,fields] of Object.entries(columns)) {
      const insert = transaction.prepare(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`);
      for (const row of snapshot[table]) await insert.run(...fields.map(field=>row[field] ?? null));
      counts[table] = snapshot[table].length;
    }
    return counts;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const path = args.find(arg=>!arg.startsWith('--')) || 'data/paper-trails.sqlite';
  let target;
  try {
    const snapshot = readLocalSnapshot(path,{includeDemo:args.includes('--include-demo')});
    console.log(`Ready to copy ${snapshot.users.length} accounts, ${snapshot.letters.length} letters, and ${snapshot.drafts.length} drafts. Existing sign-in sessions are excluded.`);
    if (!args.includes('--confirm-import')) {
      console.log('Dry run only. To import into an empty Turso database, set its environment variables and rerun with --confirm-import.');
    } else {
      target = await createApp({seed:false,tursoUrl:process.env.TURSO_DATABASE_URL,tursoToken:process.env.TURSO_AUTH_TOKEN,requireTurso:true});
      const counts = await importSnapshot(snapshot,target.db);
      console.log(`Import complete: ${counts.users} accounts, ${counts.letters} letters, ${counts.drafts} drafts. Sign in again on the hosted site.`);
    }
  } catch (error) {
    const known = /^(Import stopped:|Set both TURSO|TURSO_DATABASE_URL)/.test(error.message);
    console.error(known ? error.message : 'Import failed. Check the source database and Turso connection. No partial import was committed.');
    process.exitCode=1;
  } finally { target?.db.close(); }
}
