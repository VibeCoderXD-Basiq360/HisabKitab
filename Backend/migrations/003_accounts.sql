-- Every stored amount means money in the account; cards are negative when you owe.
CREATE TABLE accounts (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users (id),
  name            TEXT NOT NULL CHECK (name = btrim(name) AND name <> ''),
  kind            TEXT NOT NULL CHECK (kind IN ('bank', 'cash', 'wallet', 'credit_card')),
  opening_balance NUMERIC(12,2) NOT NULL,
  opening_date    DATE NOT NULL,
  billing_day     SMALLINT CHECK (billing_day BETWEEN 1 AND 31),
  due_day         SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  last_four       CHAR(4) CHECK (last_four ~ '^[0-9]{4}$'),
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT card_fields_match_kind CHECK (
    CASE WHEN kind = 'credit_card'
      THEN billing_day IS NOT NULL AND due_day IS NOT NULL AND last_four IS NOT NULL
      ELSE billing_day IS NULL AND due_day IS NULL AND last_four IS NULL
    END
  )
);

CREATE UNIQUE INDEX accounts_unarchived_name ON accounts (user_id, name) WHERE archived_at IS NULL;

-- Every movement of money, one row per account it touches. Balances are sums
-- of this view. Later migrations add one branch per movement type.
CREATE VIEW account_movements AS
  SELECT id AS account_id, opening_balance AS amount, opening_date AS date,
         'opening'::text AS source, id AS source_id
  FROM accounts;
