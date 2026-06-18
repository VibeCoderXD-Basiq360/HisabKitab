// seed-thailand.js — Create Thailand Trip group with THB expenses
// Run: node seed-thailand.js

require('dotenv').config();
const admin = require('./src/config/firebase');

const WEB_API_KEY = 'AIzaSyAC8_1tmELIgt8BMhSQEj9cpPWXmZR_sks';
const BASE        = 'http://localhost:5000';
const MAIN_EMAIL  = 'hisabkitab.notify@gmail.com';

const DEMO = [
  { email: 'rahul@hisabkitab.demo', password: 'Demo@1234', name: 'Rahul Sharma' },
  { email: 'priya@hisabkitab.demo', password: 'Demo@1234', name: 'Priya Patel'  },
  { email: 'arjun@hisabkitab.demo', password: 'Demo@1234', name: 'Arjun Mehta'  },
];

async function fpost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw Object.assign(new Error(`POST ${url} → ${r.status}`), { data: d });
  return d;
}

function makeApi(jwt) {
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` };
  return {
    get:    async (p)    => { const r = await fetch(`${BASE}${p}`, { headers: h }); return r.json(); },
    post:   async (p, b) => { const r = await fetch(`${BASE}${p}`, { method: 'POST',   headers: h, body: JSON.stringify(b) }); return r.json(); },
    delete: async (p)    => { const r = await fetch(`${BASE}${p}`, { method: 'DELETE', headers: h }); return r.ok; },
  };
}

async function signIn(email, password) {
  const r = await fpost(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, { email, password, returnSecureToken: true });
  return r.idToken;
}
async function signInCustom(uid) {
  const ct = await admin.auth().createCustomToken(uid);
  const r  = await fpost(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, { token: ct, returnSecureToken: true });
  return r.idToken;
}
async function backendLogin(idToken) {
  const r = await fpost(`${BASE}/api/auth/login`, { token: idToken });
  return { jwt: r.token, user: r.user };
}

function d(month, day) { return new Date(2026, month - 1, day, 12, 0, 0).toISOString(); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🇹🇭  Seeding Thailand Trip group…\n');

  // ── Auth ────────────────────────────────────────────────────────────────────
  const mainFb = await admin.auth().getUserByEmail(MAIN_EMAIL);
  const mainS  = await backendLogin(await signInCustom(mainFb.uid));
  console.log('🔑 Main signed in');

  const demoSessions = [];
  for (const acc of DEMO) {
    const s = await backendLogin(await signIn(acc.email, acc.password));
    demoSessions.push({ ...acc, ...s });
    console.log(`🔑 ${acc.name}`);
    await sleep(100);
  }

  const [rahulS, priyaS, arjunS] = demoSessions;
  const mainA  = makeApi(mainS.jwt);
  const rahulA = makeApi(rahulS.jwt);

  // ── Create group (main account creates it) ──────────────────────────────────
  console.log('\n📦 Creating Thailand Trip group…');

  // Creator (Aditya) is auto-added as ADMIN — only pass the other 3 members
  const group = await mainA.post('/api/groups', {
    name: 'Thailand Trip 🇹🇭',
    type: 'TRIP',
    icon: '✈️',
    members: [
      { userId: rahulS.user.id, name: 'Rahul Sharma',  email: 'rahul@hisabkitab.demo' },
      { userId: priyaS.user.id, name: 'Priya Patel',   email: 'priya@hisabkitab.demo' },
      { userId: arjunS.user.id, name: 'Arjun Mehta',   email: 'arjun@hisabkitab.demo' },
    ],
  });

  if (!group?.id) { console.error('❌ Group creation failed:', group); process.exit(1); }
  console.log(`✅ Group created: ${group.name} (${group.id})`);

  // ── Resolve member IDs ───────────────────────────────────────────────────────
  const fullGroup = await mainA.get(`/api/groups/${group.id}`);
  const members   = fullGroup.members;

  const mid = (userId) => members.find(m => m.userId === userId)?.id;
  const mMain  = mid(mainS.user.id);
  const mRahul = mid(rahulS.user.id);
  const mPriya = mid(priyaS.user.id);
  const mArjun = mid(arjunS.user.id);

  console.log(`  Members: Aditya(${mMain?.slice(-4)}) Rahul(${mRahul?.slice(-4)}) Priya(${mPriya?.slice(-4)}) Arjun(${mArjun?.slice(-4)})\n`);

  // ── Helper ───────────────────────────────────────────────────────────────────
  async function addExp(api, paidBy, title, amount, date, note = null) {
    const r = await api.post(`/api/groups/${group.id}/expenses`, {
      title, amount, currency: 'THB', expenseDate: date,
      paidByMemberId: paidBy, splitType: 'EQUAL',
      ...(note && { note }),
    });
    if (!r?.id) console.warn(`  ⚠️  Failed: ${title}`, r);
    return r;
  }

  // ── Trip expenses (May 10-17, 2026) ─────────────────────────────────────────
  console.log('💸 Adding expenses in THB…\n');

  // Day 1 – May 10 – Arrival
  console.log('📅 Day 1 — May 10 · Arrival');
  await addExp(mainA,  mMain,  'Bangkok Airport Transfer',      1200, d(5,10), 'Grab from Suvarnabhumi'); await sleep(50);
  await addExp(rahulA, mRahul, 'Hotel Check-in Advance',       18000, d(5,10), 'Avani+ Riverside Bangkok – 4 nights'); await sleep(50);
  await addExp(mainA,  mMain,  'Welcome Dinner – Riverside',    4800, d(5,10), 'Chao Phraya river view restaurant'); await sleep(50);
  await addExp(mainA,  mArjun, '7-Eleven Snacks & Drinks',       420, d(5,10)); await sleep(50);

  // Day 2 – May 11 – Temples
  console.log('📅 Day 2 — May 11 · Temples & Markets');
  await addExp(mainA,  mMain,  'Tuk-Tuk Tour – Grand Palace',   1800, d(5,11), 'Shared tuk-tuk'); await sleep(50);
  await addExp(mainA,  mPriya, 'Wat Pho Entry Tickets',          800, d(5,11), '200 THB x 4 people'); await sleep(50);
  await addExp(mainA,  mRahul, 'Chatuchak Weekend Market',      3600, d(5,11), 'Shopping + street food'); await sleep(50);
  await addExp(mainA,  mMain,  'Mango Sticky Rice & Snacks',     640, d(5,11), 'Famous street cart'); await sleep(50);
  await addExp(mainA,  mArjun, 'BTS Skytrain Passes – Day 2',    480, d(5,11)); await sleep(50);

  // Day 3 – May 12 – Day trip
  console.log('📅 Day 3 — May 12 · Ayutthaya Day Trip');
  await addExp(mainA,  mMain,  'Ayutthaya Tour Bus',             5600, d(5,12), 'Round trip group tour'); await sleep(50);
  await addExp(mainA,  mPriya, 'Ayutthaya Temple Entry x4',     1200, d(5,12)); await sleep(50);
  await addExp(mainA,  mRahul, 'Lunch at River Restaurant',     2800, d(5,12), 'Authentic Thai food by the river'); await sleep(50);
  await addExp(mainA,  mArjun, 'Elephant Sanctuary Visit',      4400, d(5,12), 'Ethical sanctuary – 1100 THB each'); await sleep(50);

  // Day 4 – May 13 – Chiang Mai travel
  console.log('📅 Day 4 — May 13 · Bangkok → Chiang Mai');
  await addExp(mainA,  mMain,  'Bangkok–Chiang Mai Flights',    14800, d(5,13), 'Bangkok Airways x4 – incl. taxes'); await sleep(50);
  await addExp(mainA,  mPriya, 'Chiang Mai Guesthouse – 2 nts', 9600, d(5,13), 'Tamarind Village – deluxe room'); await sleep(50);
  await addExp(mainA,  mRahul, 'Night Bazaar Shopping',         5200, d(5,13), 'Handicrafts + clothes'); await sleep(50);
  await addExp(mainA,  mMain,  'Khao Soi at Famous Lammduan',    960, d(5,13), 'Best khao soi in CM'); await sleep(50);

  // Day 5 – May 14 – Adventure
  console.log('📅 Day 5 — May 14 · Doi Inthanon & Zip-line');
  await addExp(mainA,  mArjun, 'Doi Inthanon National Park Fee', 1200, d(5,14), '300 THB x 4'); await sleep(50);
  await addExp(mainA,  mMain,  'Zip-line Adventure Park',        8800, d(5,14), 'Flight of the Gibbon – 2200 each'); await sleep(50);
  await addExp(mainA,  mPriya, 'Longneck Village Visit',         1600, d(5,14)); await sleep(50);
  await addExp(mainA,  mRahul, 'Thai Cooking Class',             6000, d(5,14), 'Zabb-E-Lee Cooking School x4'); await sleep(50);
  await addExp(mainA,  mMain,  'Dinner – Heuan Phen',            2400, d(5,14), 'Northern Thai cuisine'); await sleep(50);

  // Day 6 – May 15 – Beaches (Phuket)
  console.log('📅 Day 6 — May 15 · Chiang Mai → Phuket');
  await addExp(mainA,  mArjun, 'Chiang Mai–Phuket Flights',     18400, d(5,15), 'Thai AirAsia x4'); await sleep(50);
  await addExp(mainA,  mMain,  'Phuket Beach Resort – 2 nts',  22000, d(5,15), 'Kata Beach Resort – 2 rooms'); await sleep(50);
  await addExp(mainA,  mPriya, 'Welcome Cocktails at Pool Bar', 2200, d(5,15)); await sleep(50);
  await addExp(mainA,  mRahul, 'Phuket Night Market',           3800, d(5,15), 'Food + shopping'); await sleep(50);

  // Day 7 – May 16 – Islands
  console.log('📅 Day 7 — May 16 · Phi Phi Islands');
  await addExp(mainA,  mMain,  'Phi Phi Island Speedboat Tour', 12000, d(5,16), '3000 THB each – Maya Bay'); await sleep(50);
  await addExp(mainA,  mArjun, 'Snorkelling Gear Rental',       2400, d(5,16), '600 THB x4'); await sleep(50);
  await addExp(mainA,  mPriya, 'Seafood Lunch on Phi Phi Don',  4800, d(5,16)); await sleep(50);
  await addExp(mainA,  mRahul, 'Patong Beach Club Entry',       3200, d(5,16)); await sleep(50);
  await addExp(mainA,  mMain,  'Dinner at Baan Rim Pa',         6400, d(5,16), 'Cliffside fine dining'); await sleep(50);

  // Day 8 – May 17 – Departure
  console.log('📅 Day 8 — May 17 · Departure');
  await addExp(mainA,  mMain,  'Airport Transfer – Taxi',       1600, d(5,17)); await sleep(50);
  await addExp(mainA,  mArjun, 'Duty Free Shopping',            8400, d(5,17), 'Perfumes, chocolates, Thai spices'); await sleep(50);
  await addExp(mainA,  mPriya, 'Final Airport Breakfast',       1680, d(5,17)); await sleep(50);
  await addExp(mainA,  mRahul, 'Phuket–Bangalore Flights',     42000, d(5,17), 'Thai Airways – incl. taxes x4'); await sleep(50);

  // ── Fetch final group to show summary ────────────────────────────────────────
  const finalGroup = await mainA.get(`/api/groups/${group.id}`);
  const expenses   = finalGroup.groupExpenses || [];
  const totalTHB   = expenses.reduce((s, e) => s + Number(e.amount), 0);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          🇹🇭  Thailand Trip Group Created!                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Group: Thailand Trip 🇹🇭                                    ║
║  Members: Aditya · Rahul · Priya · Arjun                     ║
║  Trip dates: May 10–17, 2026 (8 days)                        ║
║                                                              ║
║  Total expenses: ${String(expenses.length).padEnd(3)} in THB                        ║
║  Total spend:    ฿${String(totalTHB.toLocaleString('en-IN')).padEnd(17)}(Thai Baht)          ║
║  Approx INR:     ₹${String(Math.round(totalTHB * 2.3).toLocaleString('en-IN')).padEnd(17)}(@ ~₹2.30/THB)          ║
║                                                              ║
║  Route: Bangkok → Ayutthaya → Chiang Mai → Phuket            ║
║  Balances show who owes what — all in ฿ THB                  ║
╚══════════════════════════════════════════════════════════════╝
`);

  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Failed:', e.message);
  if (e.data) console.error('API:', JSON.stringify(e.data, null, 2));
  process.exit(1);
});
