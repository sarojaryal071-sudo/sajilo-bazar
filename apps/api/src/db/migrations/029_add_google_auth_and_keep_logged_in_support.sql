-- Google OAuth sign-in: a Google-authenticated user's stable subject id
-- (the JWT "sub" claim from their ID token) - unique, nullable (phone+
-- password accounts never set it). password_hash becomes nullable to
-- support a Google-only account that's never set a password (it can
-- still gain one later via "Forgot password").
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- No SMS/OTP exists anywhere in this codebase yet (deferred to a later
-- round) - every phone number today, whether typed in on signup or
-- collected after a Google sign-in, is equally unverified. This flag
-- makes that explicit and gives a later OTP rollout a column to flip,
-- rather than treating "verified" as an assumption baked into having a
-- phone number at all.
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT false;
