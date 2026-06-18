const prisma = require('../../lib/prisma');

const DEFAULTS = [
  { fromCurrency: 'THB', rate: 2.30   },
  { fromCurrency: 'USD', rate: 83.50  },
  { fromCurrency: 'EUR', rate: 90.00  },
  { fromCurrency: 'GBP', rate: 106.00 },
  { fromCurrency: 'AED', rate: 22.75  },
  { fromCurrency: 'SGD', rate: 62.00  },
  { fromCurrency: 'JPY', rate: 0.56   },
  { fromCurrency: 'MYR', rate: 18.50  },
  { fromCurrency: 'CAD', rate: 61.50  },
  { fromCurrency: 'AUD', rate: 54.00  },
];

const LIVE_CURRENCIES = DEFAULTS.map((d) => d.fromCurrency);

// Fetch 1 INR = X foreign, then invert → 1 foreign = Y INR
async function fetchLiveRates() {
  const res = await fetch('https://api.frankfurter.app/latest?from=INR', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = await res.json();
  const map = {};
  for (const cur of LIVE_CURRENCIES) {
    if (data.rates[cur]) {
      map[cur] = Math.round((1 / data.rates[cur]) * 10000) / 10000;
    }
  }
  return { map, date: data.date };
}

async function upsertRates(userId, rateMap) {
  await Promise.all(
    Object.entries(rateMap).map(([from, rate]) =>
      prisma.exchangeRate.upsert({
        where: { userId_fromCurrency_toCurrency: { userId, fromCurrency: from, toCurrency: 'INR' } },
        update: { rate },
        create: { userId, fromCurrency: from, toCurrency: 'INR', rate },
      })
    )
  );
}

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res) => {
  const uid = req.user.userId;

  let rates = await prisma.exchangeRate.findMany({
    where: { userId: uid },
    orderBy: { fromCurrency: 'asc' },
  });

  // Seed defaults for currencies the user hasn't configured yet
  const existing = new Set(rates.map((r) => r.fromCurrency));
  const missing  = DEFAULTS.filter((d) => !existing.has(d.fromCurrency));
  if (missing.length) {
    await prisma.exchangeRate.createMany({
      data: missing.map((d) => ({ userId: uid, fromCurrency: d.fromCurrency, toCurrency: 'INR', rate: d.rate })),
      skipDuplicates: true,
    });
    rates = await prisma.exchangeRate.findMany({ where: { userId: uid }, orderBy: { fromCurrency: 'asc' } });
  }

  // Auto-refresh if any rate is older than 6 hours — fire & forget
  const staleThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const isStale = rates.some((r) => new Date(r.updatedAt) < staleThreshold);
  if (isStale) {
    fetchLiveRates()
      .then(({ map }) => upsertRates(uid, map))
      .catch((e) => console.error('[exchange-rates] auto-refresh failed:', e.message));
  }

  res.json(rates);
};

// ─── refresh (force live fetch) ───────────────────────────────────────────────

const refresh = async (req, res) => {
  const uid = req.user.userId;
  try {
    const { map, date } = await fetchLiveRates();
    await upsertRates(uid, map);
    const rates = await prisma.exchangeRate.findMany({ where: { userId: uid }, orderBy: { fromCurrency: 'asc' } });
    res.json({ rates, source: 'live', date });
  } catch (e) {
    console.error('[exchange-rates] refresh failed:', e.message);
    res.status(503).json({ error: 'Could not fetch live rates. Try again later.' });
  }
};

// ─── upsert (manual edit) ─────────────────────────────────────────────────────

const upsert = async (req, res) => {
  const { rate } = req.body;
  const { from }  = req.params;

  if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) {
    return res.status(400).json({ error: 'rate must be a positive number' });
  }

  const result = await prisma.exchangeRate.upsert({
    where: { userId_fromCurrency_toCurrency: { userId: req.user.userId, fromCurrency: from.toUpperCase(), toCurrency: 'INR' } },
    update: { rate: Number(rate) },
    create: { userId: req.user.userId, fromCurrency: from.toUpperCase(), toCurrency: 'INR', rate: Number(rate) },
  });

  res.json(result);
};

module.exports = { list, refresh, upsert };
