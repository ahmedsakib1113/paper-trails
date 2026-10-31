# Put Paper Trails online for free

This project is configured for **Render Free + a Turso libSQL Free database**. The Turso database is connected through the ignored local `.env` file and has passed the cloud letter-flow check. The web app has not been published yet. Choose only the free plans; do not enable a paid plan, paid disk, or paid database. If a provider asks you to add a payment method, stop before submitting it.

## 1. Create the database

1. Sign in to [Turso](https://app.turso.tech/) and choose the Free plan.
2. Create a **libSQL / SQLite-compatible** database named `paper-trails`. This app uses Turso's `@libsql/client` SDK. If the dashboard offers a choice of database engines, select libSQL.
3. Copy its connection URL and create a database token that allows reading and writing. Keep that token private.

You need these two values:

```text
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your-database-token
```

Enter them only into Render's environment settings or your ignored local `.env` file. Do not put the token in `public/`, GitHub, screenshots, or chat.

If using Turso's CLI instead of its dashboard, its documented commands include `turso db create paper-trails` and `turso db tokens create paper-trails`. Create a **database token**, not a token with permission to administer the whole Turso account.

## 2. Put the source in GitHub

The project source is prepared as a Git repository for private GitHub hosting. Render needs access to the selected repository. If setting up a separate copy of this app, create a private repository and upload only its source.

Include `package.json`, `package-lock.json`, `server.js`, `database.js`, `render.yaml`, `public/`, `scripts/`, and `test/`. Include `public/maps/cities.json` and `public/maps/land.json`; they are already built.

Exclude `data/`, `.env`, `node_modules/`, and local SQLite files. The project's `.gitignore` contains these rules. Your local accounts and letters should never be uploaded as source code.

## 3. Deploy using Render's Blueprint

1. Sign in to [Render](https://dashboard.render.com/).
2. Choose **New → Blueprint**, connect the GitHub repository, and select its branch.
3. Render reads `render.yaml`. Verify that the service plan is **Free** and that it creates no paid resources.
4. Enter `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` when prompted.
5. Deploy. The app creates its empty tables and indexes automatically, then starts accepting requests.

The Blueprint already sets:

| Setting | Value |
| --- | --- |
| Runtime | Node 24.22.1 |
| Build command | `npm ci --omit=dev && npm run check` |
| Start command | `npm start` |
| Health check | `/api/health` |
| `HOST` | `0.0.0.0` |
| `NODE_ENV` | `production` |
| `PAPER_TRAILS_DEMO` | `false` |
| `COOKIE_SECURE` | `true` |
| `PAPER_TRAILS_REQUIRE_TURSO` | `true` |

Render supplies `PORT`; do not hardcode it. The app refuses to start on Render without both Turso values, so it cannot silently save personal data into Render's temporary filesystem.

## 4. Check the hosted site

1. Open the returned HTTPS `onrender.com` URL. You should see the sign-in screen, without switchable sample accounts.
2. Visit `/api/health`; it should return `{"ok":true}`. This checks a real database query and exposes no credentials.
3. Register two accounts on that same URL. Send a one-minute letter from one to the other.
4. Follow the dotted route in **On the journey**, wait for delivery, and open it from the second account.
5. Restart the Render service and sign in again. The accounts, letters, drafts, and delivery timestamps should still be present in Turso.

The automated checks cover this data flow locally and test the Turso HTTP client with a simulated transport. The real Turso connection has also passed `npm run verify:cloud`: registration, draft saving, atomic posting, sealed delivery, persistence after an app restart, arrival, read receipts, and keepsakes. This command creates two temporary test accounts and removes their own test records afterward; it does not print credentials. The final hosted web URL still needs its own verification after deployment.

## Optional: copy existing local accounts and letters

Do this **before anyone registers on the hosted site**. The destination must be empty. Stop writing locally during the copy so you take one consistent snapshot.

1. Copy `.env.example` to `.env` and replace both Turso placeholders with real values. Leave `COOKIE_SECURE=false` for local HTTP.
2. Run a dry run, which prints counts only and makes no remote connection:

   ```text
   npm run db:import
   ```

3. To copy the listed data into the empty remote database:

   ```text
   npm run db:import -- --confirm-import
   ```

An optional source path can be supplied after `--`. The import preserves account IDs, password hashes, letter delivery times, and drafts. It excludes demo accounts by default and excludes old sign-in sessions; sign in again on the hosted URL. To deliberately include the sample accounts, add `--include-demo`.

The source is opened read-only. The destination import is a transaction: if any row fails, it rolls back. It refuses to merge into a populated destination rather than overwrite existing accounts or letters.

## Local use

With no `.env` and no Turso variables, the app still uses `data/paper-trails.sqlite`:

```text
npm ci
npm start
```

In Windows PowerShell, use `npm.cmd` if your execution policy blocks `npm.ps1`. The start command loads `.env` automatically when that file exists. Remove the Turso variables from your local environment to return to local storage; doing so does not copy cloud data back to this computer.

## Free-plan limits

Render Free sleeps after idle time and may take a while to wake up. Its local files are temporary; all hosted app records are therefore written directly to Turso. Letters use stored timestamps, so sleeping does not reset a delivery timer. The map does not use a paid map API.

Free services have quotas. Check the providers' current Free plan details before deploying and do not authorize an upgrade if you want to keep the cost at zero.

Official references: [Render Blueprints](https://render.com/docs/blueprint-spec), [Render Free limitations](https://render.com/docs/free), [Turso libSQL client](https://docs.turso.tech/sdk/ts/reference), [Turso pricing](https://turso.tech/pricing).
