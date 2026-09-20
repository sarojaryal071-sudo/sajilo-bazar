# Sajilo Bazar — api

Node/Express backend, raw SQL via `pg`. See the root `README.md` and `docs/` for the full spec.

```bash
cp .env.example .env     # fill in DATABASE_URL, JWT_SECRET, Cloudinary keys
npm run migrate           # applies apps/api/src/db/migrations in order
npm run dev                # starts on http://localhost:4000
```

Each module (`src/modules/<name>/`) follows `routes.js -> controller.js -> service.js
-> model.js`. Migrations are plain numbered `.sql` files in `src/db/migrations/`,
tracked in a `schema_migrations` table by the runner in `src/db/migrate.js`.
