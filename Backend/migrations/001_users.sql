CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE
                CHECK (email = lower(btrim(email)) AND email <> ''),
  display_name  TEXT NOT NULL CHECK (btrim(display_name) <> ''),
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
