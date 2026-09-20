# Deployment

Three pieces, three providers:

| Piece | Provider | Config in repo |
|---|---|---|
| `apps/web` (React/Vite frontend) | Vercel | `apps/web/vercel.json` |
| `apps/api` (Node/Express backend) | Render | `render.yaml` (repo root) |
| Postgres | Neon | none - a hosted connection string |

Neon instead of Render's built-in Postgres: Render's free Postgres is deleted after
90 days. Neon's free tier has no such expiry.

This is a monorepo with npm workspaces (`apps/*`, `packages/*`). Both Vercel and
Render need to install from the repo root so the `@sajilo-bazar/shared` workspace
package resolves correctly - see each section below for how that's configured.

## 1. Neon (Postgres)

1. Create a project at neon.tech. Note the region - pick one close to wherever
   you deploy the API (Render's `oregon` region by default in `render.yaml`, so
   an Oregon/US-West Neon region minimizes latency).
2. In the Neon dashboard, copy the **pooled connection string** (not the direct
   one - the pooled one goes through PgBouncer and is what you want for a
   normal web app with many short-lived connections). It looks like:
   ```
   postgres://<user>:<password>@ep-xxx-pooler.<region>.aws.neon.tech/<dbname>?sslmode=require
   ```
3. That whole string is your `DATABASE_URL`. Nothing else to configure -
   `apps/api/src/db/pool.js` turns SSL on automatically for any non-localhost
   host, which covers Neon.
4. Running migrations against it:
   - **Automatic**: `render.yaml`'s `buildCommand` runs
     `npm run migrate --workspace=apps/api` on every deploy, so migrations
     apply themselves once `DATABASE_URL` is set on the Render service.
   - **Manual** (e.g. to check it works before deploying anything, or to run
     migrations without triggering a deploy): from the repo root,
     ```bash
     DATABASE_URL="<your Neon pooled connection string>" npm run migrate --workspace=apps/api
     ```
     This is safe to re-run - applied migrations are tracked in a
     `schema_migrations` table and skipped on subsequent runs.

## 2. Render (API)

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec).
Importing it creates one web service (`sajilo-bazar-api`) with the right build/start
commands for this monorepo already filled in - you only need to supply the secrets.

- **Build command**: `npm install && npm run migrate --workspace=apps/api`
  (installs the whole workspace from the root, then applies migrations)
- **Start command**: `npm run start --workspace=apps/api`
- **Health check**: `/health`

### Environment variables

| Variable | Where it comes from | Notes |
|---|---|---|
| `DATABASE_URL` | Neon (step 1) | Set manually in Render - marked `sync: false` in the blueprint so it prompts you |
| `JWT_SECRET` | Render generates it | `generateValue: true` in the blueprint - no action needed |
| `JWT_EXPIRES_IN` | Fixed at `7d` | Already in the blueprint |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard | Set manually in Render |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard | Set manually in Render |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard | Set manually in Render |
| `WEB_ORIGIN` | Your Vercel deployment URL | Set manually **after** step 3 deploys and you have the Vercel URL - see below |
| `PORT` | Render sets this itself | Don't set it - `apps/api` already reads `process.env.PORT` |

`WEB_ORIGIN` is used for CORS (`apps/api/src/app.js`) - it must be the exact
Vercel origin (e.g. `https://sajilo-bazar.vercel.app`, no trailing slash) or
the frontend's API calls will be blocked by the browser.

## 3. Vercel (web)

Vercel auto-detects Vite when the project's **Root Directory** is set to
`apps/web`. It also auto-detects the npm workspace root (because there's a
`package-lock.json` and a `workspaces` field in the root `package.json`), so
install still runs from the repo root and `@sajilo-bazar/shared` resolves
correctly - you don't need a custom install command.

`apps/web/vercel.json` adds one thing Vercel's zero-config Vite preset doesn't
do on its own: a rewrite so client-side routes (react-router) resolve on
direct load/refresh instead of 404ing.

### Environment variables

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | Your Render service URL, e.g. `https://sajilo-bazar-api.onrender.com` | No trailing slash. Must be set **before** the first production build - Vite inlines env vars at build time. |

If you change `VITE_API_URL` later, you need to trigger a new Vercel deploy for
it to take effect (redeploy, don't just save the env var).

## Deploy order

Because `WEB_ORIGIN` needs the Vercel URL and `VITE_API_URL` needs the Render
URL, there's a natural order:

1. **Neon** first - get `DATABASE_URL`.
2. **Render** next - deploy with `DATABASE_URL` and the Cloudinary vars set;
   `WEB_ORIGIN` can be a placeholder for now (or Render's default service URL,
   which still lets you test the API directly). Note the resulting
   `https://<service>.onrender.com` URL.
3. **Vercel** next - deploy with `VITE_API_URL` set to that Render URL. Note
   the resulting `https://<project>.vercel.app` URL.
4. **Back to Render** - update `WEB_ORIGIN` to the real Vercel URL and
   redeploy (or just save the env var - Render redeploys automatically on
   env var changes).

## Troubleshooting

- **"self-signed certificate in certificate chain" on Render connecting to
  Neon**: rare, but if you hit it, change `ssl: needsSSL ? true : false` to
  `ssl: needsSSL ? { rejectUnauthorized: false } : false` in
  `apps/api/src/db/pool.js`. This is a common workaround for Postgres poolers
  and is safe here since the connection is still encrypted - it just skips
  CA chain verification.
- **CORS errors in the browser console**: `WEB_ORIGIN` on Render doesn't
  exactly match the Vercel origin (check for a trailing slash or `www.`
  mismatch).
- **Frontend calls hit `/api/api/...` or 404s on every request**: `VITE_API_URL`
  has a trailing slash - it shouldn't.
- **Worker document upload fails on production**: check the three
  `CLOUDINARY_*` vars are set on Render - the same failure mode you'd see
  locally without them configured.
