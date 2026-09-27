CREATE TABLE categories (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id),
  name        TEXT NOT NULL CHECK (name = btrim(name) AND name <> ''),
  -- The same eight names are listed in src/categories/handlers.js.
  colour      TEXT NOT NULL
              CHECK (colour IN ('saffron', 'sand', 'rose', 'plum', 'indigo', 'sky', 'teal', 'slate')),
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX categories_unarchived_name ON categories (user_id, name) WHERE archived_at IS NULL;
