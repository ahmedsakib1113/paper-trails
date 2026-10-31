# Paper Trails

A slower, more thoughtful corner of the internet. Write digital letters, decorate their envelopes, and let them travel through virtual post offices before they arrive.

**Live website:** https://paper-trails-o6a8.onrender.com — hosted on Render Free, with persistent data in Turso Free. Create an account to get your own postal address. A sleeping free instance can take around a minute to wake up.

## Open the post office

Requires **Node.js 24**. Install the database client once with `npm ci`. Local use needs no external service or API key; optional cloud storage uses your Turso database URL and token.

1. Open this folder in VS Code.
2. In the VS Code terminal, run `npm ci`, then `npm start` (`npm.cmd` in PowerShell if its execution policy blocks `npm.ps1`).
3. Visit **http://localhost:3000**.

On Windows you can also double-click `start.cmd`. VS Code includes an **Open Paper Trails** debug configuration (F5). Run only one server on port 3000 at a time.

Use the Node server above when previewing. VS Code Live Server cannot serve the app's API or its root-relative assets from `public/index.html`.

## Mobile preview

The phone layout includes a sticky header, a slide-out navigation menu, full-width letter cards, larger touch controls, and a single-column writing desk. The menu closes with its close button, the shaded backdrop, or Escape.

In Chrome, open **http://localhost:3000**, press **F12**, then **Ctrl+Shift+M** to toggle the device toolbar. Choose **iPhone 16** (393 × 852) or **Responsive** to try different widths. The captured [phone preview](previews/mobile-home.png) and [full page](previews/mobile-home-full.png) are saved in `previews/`.

## Try the complete journey

Your first visit opens Alex's clearly labelled sample post office, containing example letters.

1. Choose **Write a letter** and address it to `@june.demo`.
2. Add a title and message. Pick paper and a stamp.
3. Choose **The little journey** for one-minute delivery, then **Seal & send**.
4. Select **Post my letter**. Follow its postal journey.
5. Click your profile at the bottom left and choose **June's mailbox**.
6. Wait for arrival. Open **Mailbox**, select the letter, and **Break the seal**.
7. Choose **Write back** or **Keep this letter**.

Mail refreshes every ten seconds while the site is visible, except while writing or reading. A manual Refresh is also available. Demo accounts are shared sample mailboxes, not private accounts; do not use them for personal information.

## Make it yours

Choose **Create your own postal address**. Register with a name, unique username, password of at least eight characters, city, and country. Friends must register on the **same running server**. Send to their `@username`; this is an internal postal address, not an email address.

- **Mailbox:** sealed envelopes and opened letters; search by name, title, or city.
- **Writing desk:** three paper colours, three stamps, word count, recipient lookup, and drafts that automatically save after a short pause.
- **Delivery:** one minute, 24 hours, three days, or a chosen date for your future self.
- **Journey:** a map with city pins, a dotted route, and a letter marker that moves as delivery time passes. Four postal stops and an arrival estimate explain its progress. Recent sent letters remain visible after delivery.
- **Sent letters:** delivery state and opened receipts.
- **Drafts:** resume or delete unfinished letters.
- **Keepsakes:** save received letters and move them back to the mailbox.
- **Time capsules:** write to your future self from the Account screen or the writing desk.

## What runs locally

The site runs a Node HTTP server with a persistent SQLite database at `data/paper-trails.sqlite` by default. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to store accounts, drafts, letters, and sessions in Turso instead. Both modes preserve data across server restarts. Arrival is determined by timestamps: no background scheduler is required. Letters arrive even while the server is stopped and become available the next time it starts. Closing a browser does not delete letters.

The local server listens only on this computer by default. Friends can use the live HTTPS website above; all users must use the same instance to exchange letters. Hosted data is stored in Turso rather than the hosting server's temporary files. No email or push notifications are sent.

## Checks

```text
npm run check
npm test
```

The tests use isolated in-memory and temporary databases. They check account validation, sessions, draft ownership, recipient validation, cross-site write rejection, sealed delivery, exact arrival boundaries, read receipts, archiving, time capsules, private file access, persistence after reopening, transaction rollback, import safeguards, and the Turso HTTP transport without real credentials.

## Files

```text
server.js                 HTTP service, sessions, postal delivery, SQLite
database.js               Asynchronous local SQLite and remote Turso adapters
render.yaml               Free Render deployment configuration
DEPLOY.md                 Hosting, secret setup, and data import instructions
scripts/import-to-turso.js Optional transactional import from local SQLite
public/index.html         Application entry point
public/styles.css         Responsive paper-and-postage design
public/app.js             Writing desk, mailbox, journey, and accounts
public/favicon.svg        Paper Trails envelope mark
test/post-office.test.js  End-to-end service tests
.vscode/launch.json       VS Code launch configuration
```

## Before sharing a hosted version

This is an initial local version. Passwords use salted scrypt hashes; sessions use random, HttpOnly, same-site cookies. The service checks mailbox ownership, rejects letters opened before arrival, and does not send an in-transit incoming letter's contents to the recipient's browser. Time capsule contents are also withheld until arrival. Letters are **not end-to-end encrypted**; the server stores readable text.

There is no password recovery, email verification, attachment storage, notification service, administrative moderation, or production backup system yet. Demo mailboxes are intentionally switchable. Production hosting should disable demo access, add appropriate abuse controls and account recovery, and back up the database.

Optional environment variables: `PORT` (default `3000`), `HOST` (default `127.0.0.1`), `PAPER_TRAILS_DB` (local database path), `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `COOKIE_SECURE=true` when serving behind HTTPS. `npm start` reads an ignored `.env` file if present; see `.env.example`. Demo access defaults off in production and can also be disabled with `PAPER_TRAILS_DEMO=false`. The Render configuration requires Turso with `PAPER_TRAILS_REQUIRE_TURSO=true`.

The type, illustrations, envelope art, and icons are built into the project, so the app works without loading remote fonts or images.

## The journey map

Open **On the journey** to see each letter's route. A compact map also appears under **Words on their way** on the home page. Travelled sections turn rust red; the remaining route is dotted. The envelope marker and progress update every second while the page is visible. Once the delivery time is reached, the letter appears at its destination. A time capsule stays in its own city.

This is a virtual journey based on the letter's delivery timestamps, using city-centre coordinates. It does not track anyone's device or physical mail. Cities that cannot be found in the bundled atlas show an explanation and retain their delivery timeline.

Land outlines are public-domain Natural Earth data. The city atlas contains 34,193 GeoNames cities and is licensed CC BY 4.0; attribution appears on every map and in [the map data notice](public/maps/NOTICE.md). Both datasets are served locally with the app; there is no map API key or per-view map service fee. Rebuild the assets with `python scripts/build-map-atlas.py` if needed.

## Free hosting with persistent data

Checked against the providers' documentation on 31 October 2026:

| Option | Hosting and storage | Changes needed |
| --- | --- | --- |
| Render Free + Turso Free | Render runs the Node service; Turso stores data in a hosted SQLite-compatible database. | Supported now. Follow [DEPLOY.md](DEPLOY.md) to provide your free account configuration. |
| Cloudflare Workers Free + D1 Free | Workers hosts the application; D1 stores its SQL data. D1 currently includes 5 GB total storage, 5 million row reads/day, and 100,000 row writes/day. | Adapt the HTTP service, database calls, and Node-specific password hashing to the Workers runtime. |

**The current SQLite file cannot be used as durable storage on Render Free.** Its local filesystem is temporary, free services sleep after 15 idle minutes, and the free Render Postgres offering expires after 30 days. Hosting the current files as a static site also cannot run the API.

Render + Turso is deployed at the live URL above. The included `render.yaml` selects the Free plan, configures HTTPS cookies, disables demo access, and prompts for database credentials. The optional import script copies existing local records into an empty database. See [the complete deployment guide](DEPLOY.md). The database, public HTTPS page, health endpoint, and bundled map assets have been verified. No paid resources or payment method were added.

Provider references: [Render Free](https://render.com/docs/free), [Turso pricing](https://turso.tech/pricing), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/). Free plans have usage limits and can change.
