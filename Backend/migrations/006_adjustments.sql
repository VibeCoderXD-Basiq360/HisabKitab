CREATE TABLE adjustments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id),
  account_id BIGINT NOT NULL,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  direction  TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  date       DATE NOT NULL,
  note       TEXT NOT NULL CHECK (note = btrim(note) AND note <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, user_id) REFERENCES accounts (id, user_id)
);

CREATE INDEX adjustments_account ON adjustments (account_id);

-- Adds the adjustment branch. Negating a NUMERIC(12,2) gives plain NUMERIC,
-- and a replaced view cannot change a column's type, so it is cast back.
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
  WHERE deleted_at IS NULL
  UNION ALL
  SELECT account_id, (CASE WHEN direction = 'in' THEN amount ELSE -amount END)::numeric(12,2),
         date, 'adjustment', id
  FROM adjustments;
