-- Lets transfers prove, in the database, that both accounts belong to the
-- person who recorded the transfer.
ALTER TABLE accounts ADD CONSTRAINT accounts_id_user_id_key UNIQUE (id, user_id);

CREATE TABLE transfers (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users (id),
  from_account_id BIGINT NOT NULL,
  to_account_id   BIGINT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date            DATE NOT NULL,
  note            TEXT CHECK (note = btrim(note) AND note <> ''),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_account_id <> to_account_id),
  FOREIGN KEY (from_account_id, user_id) REFERENCES accounts (id, user_id),
  FOREIGN KEY (to_account_id, user_id) REFERENCES accounts (id, user_id)
);

CREATE INDEX transfers_from_account ON transfers (from_account_id);
CREATE INDEX transfers_to_account ON transfers (to_account_id);

-- Each transfer appears once on each of its two accounts: minus where the
-- money left, plus where it arrived. Deleted transfers drop out.
-- Negating a NUMERIC(12,2) gives plain NUMERIC, and a replaced view cannot
-- change a column's type, so a negated amount is cast back.
CREATE OR REPLACE VIEW account_movements AS
  SELECT id AS account_id, opening_balance AS amount, opening_date AS date,
         'opening'::text AS source, id AS source_id
  FROM accounts
  UNION ALL
  SELECT from_account_id, (-amount)::numeric(12,2), date, 'transfer', id
  FROM transfers
  WHERE deleted_at IS NULL
  UNION ALL
  SELECT to_account_id, amount, date, 'transfer', id
  FROM transfers
  WHERE deleted_at IS NULL;
