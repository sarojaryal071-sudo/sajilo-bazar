import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

// Neon (and most hosted Postgres) require SSL and aren't reachable at
// localhost, so use that as the signal - local dev needs no SSL at all.
const needsSSL = Boolean(connectionString) && !connectionString.includes('localhost');

export const pool = new pg.Pool({
  connectionString,
  ssl: needsSSL ? true : false,
});
