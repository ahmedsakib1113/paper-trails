import { createClient } from '@libsql/client/web';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function queries(connection) {
  return {
    prepare(sql) {
      const execute = args => connection.execute({sql,args});
      return {
        async get(...args) { return (await execute(args)).rows[0]; },
        async all(...args) { return (await execute(args)).rows; },
        run(...args) { return execute(args); }
      };
    }
  };
}

export async function openDatabase({database, url, authToken, requireRemote = false, fetch: transport}) {
  const remote = Boolean(url || authToken || requireRemote);
  if (remote) {
    if (!url || !authToken) throw new Error('Set both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before starting the hosted app.');
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('TURSO_DATABASE_URL must be a valid libsql:// or https:// URL.'); }
    if (!['libsql:','https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error('TURSO_DATABASE_URL must use libsql:// or https:// without embedded credentials.');
    }
  } else {
    if (!database) throw new Error('A local database path is required.');
    return openLocalDatabase(database);
  }
  const client = createClient({url,authToken:remote ? authToken : undefined,intMode:'number',fetch:transport});
  try {
    await client.execute('PRAGMA foreign_keys=ON');
  } catch (error) { client.close(); throw error; }
  return {
    ...queries(client),
    kind:remote ? 'turso' : 'sqlite',
    exec(sql) { return client.executeMultiple(sql); },
    batch(statements) { return client.batch(statements,'write'); },
    async transaction(work) {
      const transaction = await client.transaction('write');
      try {
        const result = await work(queries(transaction));
        await transaction.commit();
        return result;
      } catch (error) {
        try { await transaction.rollback(); } catch { /* Keep the original failure. */ }
        throw error;
      } finally { transaction.close(); }
    },
    close() { client.close(); }
  };
}

function openLocalDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)),{recursive:true});
  const database = new DatabaseSync(path);
  database.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  const execute = ({sql,args=[]}) => {
    const statement = database.prepare(sql);
    if (statement.columns().length) return {rows:statement.all(...args)};
    const result = statement.run(...args);
    return {rows:[],rowsAffected:Number(result.changes)};
  };
  // Administrative imports hold the connection exclusively until commit.
  let pending = Promise.resolve();
  const serial = work => {
    const operation = pending.then(work);
    pending = operation.catch(()=>{});
    return operation;
  };
  const transaction = async work => {
    database.exec('BEGIN IMMEDIATE');
    try {
      const result = await work(queries({execute}));
      database.exec('COMMIT');
      return result;
    } catch (error) {database.exec('ROLLBACK'); throw error;}
  };
  return {
    ...queries({execute:statement=>serial(()=>execute(statement))}),
    kind:'sqlite',
    exec:sql=>serial(()=>database.exec(sql)),
    batch:statements=>serial(()=>transaction(async()=>statements.map(execute))),
    transaction:work=>serial(()=>transaction(work)),
    close:()=>database.close()
  };
}
