// Scheduled via pg-boss in jobs/index.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const LIVE_CURRENCIES = ['THB','USD','EUR','GBP','AED','SGD','JPY','MYR','CAD','AUD'];

async function fetchLiveRates() {
  const res = await fetch('https://api.frankfurter.app/latest?from=INR', {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
  const data = await res.json();
  const map = {};
  for (const cur of LIVE_CURRENCIES) {
    if (data.rates[cur]) map[cur] = Math.round((1 / data.rates[cur]) * 10000) / 10000;
  }
  return { map, date: data.date };
}

async function refreshAllUsers() {
  const { map, date } = await fetchLiveRates();
  const users = await prisma.user.findMany({ select: { id: true } });

  await Promise.all(
    users.flatMap((u) =>
      Object.entries(map).map(([from, rate]) =>
        prisma.exchangeRate.upsert({
          where: { userId_fromCurrency_toCurrency: { userId: u.id, fromCurrency: from, toCurrency: 'INR' } },
          update: { rate },
          create: { userId: u.id, fromCurrency: from, toCurrency: 'INR', rate },
        })
      )
    )
  );

  console.log(`[exchange-rates] refreshed ${Object.keys(map).length} currencies for ${users.length} users (${date})`);
}

module.exports = { refreshAllUsers };
