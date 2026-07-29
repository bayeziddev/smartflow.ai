-- Run this ONLY if you already applied schema.sql before the
-- platform-admin Client List feature existed (check first: run
-- `SHOW COLUMNS FROM users LIKE 'is_platform_admin';` — if it already
-- exists, skip this file).
ALTER TABLE users
  ADD COLUMN is_platform_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER plan;

-- After running this, make YOUR OWN account the platform admin —
-- replace the email with whichever one you registered with:
--   UPDATE users SET is_platform_admin = 1 WHERE email = 'your-email@example.com';
-- Do this for your own account only. There is no signup flow that can
-- set this flag — it's a manual, one-time step by design.
