// seed-history.js — 3-month historical expense data for all 4 demo accounts
// Run from Backend/: node seed-history.js

require('dotenv').config();
const admin = require('./src/config/firebase');

const WEB_API_KEY = 'AIzaSyAC8_1tmELIgt8BMhSQEj9cpPWXmZR_sks';
const BASE        = 'http://localhost:5000';
const MAIN_EMAIL  = 'hisabkitab.notify@gmail.com';

const DEMO_ACCOUNTS = [
  { name: 'Rahul Sharma', email: 'rahul@hisabkitab.demo', password: 'Demo@1234' },
  { name: 'Priya Patel',  email: 'priya@hisabkitab.demo', password: 'Demo@1234' },
  { name: 'Arjun Mehta',  email: 'arjun@hisabkitab.demo', password: 'Demo@1234' },
];

// ── helpers ──────────────────────────────────────────────────────────────────

async function fpost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw Object.assign(new Error(`POST ${url} → ${r.status}`), { data: d });
  return d;
}

function makeApi(jwt) {
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` };
  return {
    get:  async (p)    => { const r = await fetch(`${BASE}${p}`, { headers: h }); return r.json(); },
    post: async (p, b) => { const r = await fetch(`${BASE}${p}`, { method: 'POST',  headers: h, body: JSON.stringify(b) }); return r.json(); },
    put:  async (p, b) => { const r = await fetch(`${BASE}${p}`, { method: 'PUT',   headers: h, body: JSON.stringify(b) }); return r.json(); },
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Returns ISO string for a specific date in 2026
function d(month, day, hour = 12) {
  return new Date(2026, month - 1, day, hour, 0, 0).toISOString();
}

async function firebaseEmailSignIn(email, password) {
  const r = await fpost(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, { email, password, returnSecureToken: true });
  return r.idToken;
}
async function firebaseCustomSignIn(uid) {
  const ct = await admin.auth().createCustomToken(uid);
  const r  = await fpost(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, { token: ct, returnSecureToken: true });
  return r.idToken;
}
async function backendLogin(idToken) {
  const r = await fpost(`${BASE}/api/auth/login`, { token: idToken });
  return { jwt: r.token, user: r.user };
}

async function exp(api, info, data) {
  try {
    await api.post('/api/expenses', {
      amount: data.amount, currency: 'INR', title: data.title,
      note: data.note || null, expenseDate: data.date,
      categoryId:  info.cats[data.cat] || null,
      paymentTypeId: info.pts[data.pt] || Object.values(info.pts)[0],
      peopleIds: (data.split || []).filter(Boolean),
      paidForPersonId: data.paidFor || null,
      tags: data.tags || [],
    });
  } catch { /* skip duplicates / errors */ }
}

async function groupExp(api, groupId, paidBy, title, amount, date, note) {
  if (!paidBy) return;
  try {
    await api.post(`/api/groups/${groupId}/expenses`, {
      title, amount, note: note || null, expenseDate: date, paidByMemberId: paidBy, splitType: 'EQUAL',
    });
  } catch { /* skip */ }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding 3-month history…\n');

  // ── Auth ────────────────────────────────────────────────────────────────

  const mainFb = await admin.auth().getUserByEmail(MAIN_EMAIL);
  const mainS  = await backendLogin(await firebaseCustomSignIn(mainFb.uid));
  console.log('🔑 Main');

  const sessions = [{ name: 'Aditya', email: MAIN_EMAIL, ...mainS }];
  for (const acc of DEMO_ACCOUNTS) {
    const s = await backendLogin(await firebaseEmailSignIn(acc.email, acc.password));
    sessions.push({ ...acc, ...s });
    console.log(`🔑 ${acc.name}`);
    await sleep(150);
  }
  const [mainS2, rahulS, priyaS, arjunS] = sessions;
  const [mainA, rahulA, priyaA, arjunA]  = sessions.map(s => makeApi(s.jwt));

  // ── Categories & payment types ───────────────────────────────────────────

  const infos = [];
  for (const a of [mainA, rahulA, priyaA, arjunA]) {
    const [cl, pl] = await Promise.all([a.get('/api/categories'), a.get('/api/payment-types')]);
    infos.push({
      cats: Object.fromEntries(cl.map(c => [c.name, c.id])),
      pts:  Object.fromEntries(pl.map(p => [p.name, p.id])),
    });
  }
  const [mI, rI, pI, aI] = infos;

  // ── People IDs ───────────────────────────────────────────────────────────

  async function pid(api, name) {
    const list = await api.get('/api/people');
    return list.find(p => p.name === name)?.id;
  }

  const [mRahul, mPriya, mArjun] = await Promise.all([
    pid(mainA, 'Rahul Sharma'), pid(mainA, 'Priya Patel'), pid(mainA, 'Arjun Mehta'),
  ]);
  const [rAditya, rPriya, rArjun] = await Promise.all([
    pid(rahulA, 'Aditya'), pid(rahulA, 'Priya Patel'), pid(rahulA, 'Arjun Mehta'),
  ]);
  const [pAditya, pRahul, pArjun] = await Promise.all([
    pid(priyaA, 'Aditya'), pid(priyaA, 'Rahul Sharma'), pid(priyaA, 'Arjun Mehta'),
  ]);
  const [aAditya, aRahul, aPriya] = await Promise.all([
    pid(arjunA, 'Aditya'), pid(arjunA, 'Rahul Sharma'), pid(arjunA, 'Priya Patel'),
  ]);
  console.log('✅ People resolved\n');

  // ── Groups ───────────────────────────────────────────────────────────────

  async function groupInfo(api, name) {
    const list = await api.get('/api/groups');
    const g    = list.find(x => x.name === name);
    if (!g) return null;
    const full = await api.get(`/api/groups/${g.id}`);
    return { id: g.id, members: full.members };
  }

  function mid(g, userId) { return g?.members?.find(m => m.userId === userId)?.id; }

  const goaG    = await groupInfo(mainA, 'Goa Trip 2025');
  const flatG   = await groupInfo(mainA, 'Flat 4B');
  const officeG = await groupInfo(mainA, 'Office Squad');
  const weekG   = await groupInfo(rahulA, 'Weekend Warriors');

  const gM  = mid(goaG,    mainS2.user.id);
  const gR  = mid(goaG,    rahulS.user.id);
  const gP  = mid(goaG,    priyaS.user.id);
  const gA  = mid(goaG,    arjunS.user.id);

  const fM  = mid(flatG,   mainS2.user.id);
  const fR  = mid(flatG,   rahulS.user.id);
  const fP  = mid(flatG,   priyaS.user.id);

  const oM  = mid(officeG, mainS2.user.id);
  const oR  = mid(officeG, rahulS.user.id);
  const oA  = mid(officeG, arjunS.user.id);

  const wM  = mid(weekG,   mainS2.user.id);
  const wR  = mid(weekG,   rahulS.user.id);
  const wP  = mid(weekG,   priyaS.user.id);
  const wA  = mid(weekG,   arjunS.user.id);

  console.log('✅ Groups resolved\n');

  // ══════════════════════════════════════════════════════════════════════════
  // MARCH 2026
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📅 March 2026…');

  // ── MAIN – March ──
  const mainMarch = [
    { title: 'Swiggy Instamart',        amount: 1240, cat: 'Grocery',        pt: 'UPI',         date: d(3,2)  },
    { title: 'Metro Rail Monthly Pass', amount: 450,  cat: 'Transport',      pt: 'UPI',         date: d(3,3)  },
    { title: 'Holi Party Supplies',     amount: 2800, cat: 'Entertainment',  pt: 'Credit Card', date: d(3,5),  split: [mRahul, mPriya, mArjun], note: 'Colours + pichkari', tags: ['holi','party'] },
    { title: 'KFC Family Bucket',       amount: 1150, cat: 'Food',           pt: 'UPI',         date: d(3,7)  },
    { title: 'Petrol – HP',             amount: 3200, cat: 'Fuel',           pt: 'Cash',        date: d(3,9)  },
    { title: 'BESCOM Bill – Feb',       amount: 1980, cat: 'Bills',          pt: 'UPI',         date: d(3,10) },
    { title: 'Bangalore Metro – week',  amount: 840,  cat: 'Transport',      pt: 'UPI',         date: d(3,12) },
    { title: 'Pharmacy',                amount: 320,  cat: 'Medical',        pt: 'Cash',        date: d(3,13) },
    { title: 'Zepto Groceries',         amount: 1680, cat: 'Grocery',        pt: 'UPI',         date: d(3,15) },
    { title: 'Pizza Hut Dinner',        amount: 1450, cat: 'Food',           pt: 'Credit Card', date: d(3,17), split: [mPriya] },
    { title: 'Amazon – Headphones',     amount: 3999, cat: 'Shopping',       pt: 'Credit Card', date: d(3,19), tags: ['gadgets'] },
    { title: 'Ola Cab',                 amount: 240,  cat: 'Transport',      pt: 'UPI',         date: d(3,21) },
    { title: 'BigBasket Weekly',        amount: 2100, cat: 'Grocery',        pt: 'UPI',         date: d(3,22) },
    { title: 'Hotstar Annual',          amount: 899,  cat: 'Entertainment',  pt: 'Credit Card', date: d(3,24) },
    { title: 'Dominos Friday Night',    amount: 760,  cat: 'Food',           pt: 'UPI',         date: d(3,25) },
    { title: 'Rapido Bike Rides',       amount: 360,  cat: 'Transport',      pt: 'UPI',         date: d(3,26) },
    { title: 'ACT Internet',            amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(3,28) },
    { title: 'Restaurant with Arjun',   amount: 1800, cat: 'Food',           pt: 'UPI',         date: d(3,29), split: [mArjun] },
    { title: 'Medical Consultation',    amount: 500,  cat: 'Medical',        pt: 'Cash',        date: d(3,30) },
    { title: 'Zepto – Month end',       amount: 920,  cat: 'Grocery',        pt: 'UPI',         date: d(3,31) },
  ];
  for (const e of mainMarch) { await exp(mainA, mI, e); await sleep(40); }
  console.log(`  ✅ Main: ${mainMarch.length} expenses`);

  // ── RAHUL – March ──
  const rahulMarch = [
    { title: 'Blinkit Order',           amount: 1100, cat: 'Grocery',        pt: 'UPI',         date: d(3,1)  },
    { title: 'Ola Bike – Office',       amount: 180,  cat: 'Transport',      pt: 'UPI',         date: d(3,4)  },
    { title: 'Holi Outing split',       amount: 700,  cat: 'Entertainment',  pt: 'UPI',         date: d(3,6),  split: [rAditya], note: 'Reimbursed portion' },
    { title: 'Lunch – Koramangala',     amount: 540,  cat: 'Food',           pt: 'UPI',         date: d(3,8)  },
    { title: 'Reliance Digital',        amount: 2200, cat: 'Shopping',       pt: 'Debit Card',  date: d(3,10), tags: ['gadgets'] },
    { title: 'Petrol – BPCL',           amount: 2400, cat: 'Fuel',           pt: 'Cash',        date: d(3,12) },
    { title: 'Jio Recharge',            amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(3,14) },
    { title: 'Zepto Fresh Vegs',        amount: 680,  cat: 'Grocery',        pt: 'UPI',         date: d(3,16) },
    { title: 'Swiggy Weekend',          amount: 820,  cat: 'Food',           pt: 'UPI',         date: d(3,18) },
    { title: 'Gym Supplement',          amount: 1500, cat: 'Medical',        pt: 'Credit Card', date: d(3,20) },
    { title: 'Rapido – Daily',          amount: 290,  cat: 'Transport',      pt: 'UPI',         date: d(3,22) },
    { title: 'Movie – PVR',             amount: 600,  cat: 'Entertainment',  pt: 'Credit Card', date: d(3,24), split: [rPriya] },
    { title: 'Amazon Household',        amount: 1350, cat: 'Shopping',       pt: 'Credit Card', date: d(3,26) },
    { title: 'Electricity Advance',     amount: 1800, cat: 'Bills',          pt: 'UPI',         date: d(3,28), split: [rAditya] },
    { title: 'Dominos',                 amount: 680,  cat: 'Food',           pt: 'UPI',         date: d(3,30) },
  ];
  for (const e of rahulMarch) { await exp(rahulA, rI, e); await sleep(40); }
  console.log(`  ✅ Rahul: ${rahulMarch.length} expenses`);

  // ── PRIYA – March ──
  const priyaMarch = [
    { title: 'Nykaa Skincare',          amount: 2100, cat: 'Shopping',       pt: 'Credit Card', date: d(3,2),  tags: ['beauty'] },
    { title: 'Uber to Work',            amount: 320,  cat: 'Transport',      pt: 'UPI',         date: d(3,5)  },
    { title: 'Holi Picnic food',        amount: 1600, cat: 'Food',           pt: 'UPI',         date: d(3,6),  split: [pAditya, pRahul], tags: ['holi'] },
    { title: 'Yoga Mat – Amazon',       amount: 1200, cat: 'Medical',        pt: 'Debit Card',  date: d(3,9)  },
    { title: 'Zepto Groceries',         amount: 1450, cat: 'Grocery',        pt: 'UPI',         date: d(3,11) },
    { title: 'PVR Movie',               amount: 600,  cat: 'Entertainment',  pt: 'Credit Card', date: d(3,13), split: [pRahul] },
    { title: 'Cafe Treats',             amount: 480,  cat: 'Food',           pt: 'UPI',         date: d(3,16) },
    { title: 'Airtel Postpaid',         amount: 799,  cat: 'Bills',          pt: 'UPI',         date: d(3,18) },
    { title: 'H&M Online Order',        amount: 3400, cat: 'Shopping',       pt: 'Credit Card', date: d(3,20), tags: ['clothes'] },
    { title: 'Ola Cab Outing',          amount: 280,  cat: 'Transport',      pt: 'UPI',         date: d(3,22) },
    { title: 'Weekend Brunch',          amount: 960,  cat: 'Food',           pt: 'Credit Card', date: d(3,24), split: [pAditya] },
    { title: 'Pharma – Vitamins',       amount: 580,  cat: 'Medical',        pt: 'UPI',         date: d(3,26) },
    { title: 'Swiggy Order',            amount: 410,  cat: 'Food',           pt: 'UPI',         date: d(3,29) },
    { title: 'Books – Amazon',          amount: 760,  cat: 'Education',      pt: 'Credit Card', date: d(3,31) },
  ];
  for (const e of priyaMarch) { await exp(priyaA, pI, e); await sleep(40); }
  console.log(`  ✅ Priya: ${priyaMarch.length} expenses`);

  // ── ARJUN – March ──
  const arjunMarch = [
    { title: 'BPCL Petrol',             amount: 2600, cat: 'Fuel',           pt: 'Cash',        date: d(3,3)  },
    { title: 'Swiggy Breakfast',        amount: 280,  cat: 'Food',           pt: 'UPI',         date: d(3,5)  },
    { title: 'Cricket Practice Gear',   amount: 1800, cat: 'Shopping',       pt: 'Debit Card',  date: d(3,7),  tags: ['cricket','sports'] },
    { title: 'Rapido Week Pass',        amount: 299,  cat: 'Transport',      pt: 'UPI',         date: d(3,9)  },
    { title: 'Medical – Physio',        amount: 800,  cat: 'Medical',        pt: 'Cash',        date: d(3,11) },
    { title: 'Zepto Groceries',         amount: 1200, cat: 'Grocery',        pt: 'UPI',         date: d(3,13) },
    { title: 'Team Lunch',              amount: 1400, cat: 'Food',           pt: 'UPI',         date: d(3,15), split: [aAditya, aRahul] },
    { title: 'Amazon – Mouse + Pad',    amount: 1199, cat: 'Shopping',       pt: 'Credit Card', date: d(3,17), tags: ['gadgets'] },
    { title: 'ACT Broadband',           amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(3,19) },
    { title: 'IPL Streaming',           amount: 599,  cat: 'Entertainment',  pt: 'Credit Card', date: d(3,21), tags: ['cricket','ipl'] },
    { title: 'Dominos with Rahul',      amount: 1100, cat: 'Food',           pt: 'UPI',         date: d(3,23), split: [aRahul] },
    { title: 'Petrol Fill-up',          amount: 2200, cat: 'Fuel',           pt: 'Cash',        date: d(3,26) },
    { title: 'Blinkit Monthly',         amount: 1350, cat: 'Grocery',        pt: 'UPI',         date: d(3,28) },
    { title: 'Swiggy Night Order',      amount: 480,  cat: 'Food',           pt: 'UPI',         date: d(3,30) },
  ];
  for (const e of arjunMarch) { await exp(arjunA, aI, e); await sleep(40); }
  console.log(`  ✅ Arjun: ${arjunMarch.length} expenses`);

  // ── GROUP EXPENSES – March ──
  if (flatG?.id) {
    await groupExp(mainA, flatG.id, fM, 'March Rent',              45000, d(3,1), '3-BHK Koramangala');
    await groupExp(mainA, flatG.id, fR, 'Grocery – March',         7800,  d(3,10));
    await groupExp(mainA, flatG.id, fP, 'Gas Cylinder',            900,   d(3,18));
    await groupExp(mainA, flatG.id, fM, 'Maid Salary – March',     3000,  d(3,25));
    await groupExp(mainA, flatG.id, fM, 'Internet – March',        999,   d(3,28));
    await sleep(100);
  }
  if (officeG?.id) {
    await groupExp(mainA, officeG.id, oM, 'Team Lunch – Meghana',  2800,  d(3,6));
    await groupExp(mainA, officeG.id, oR, 'Tea & Snacks – March',  560,   d(3,14));
    await groupExp(mainA, officeG.id, oA, 'Client Gift – Amazon',  3500,  d(3,22), 'Onboarding gift box');
    await sleep(100);
  }
  if (weekG?.id) {
    await groupExp(rahulA, weekG.id, wR, 'Holi Party Outing',      4200,  d(3,6),  'Lounge + dinner');
    await groupExp(rahulA, weekG.id, wA, 'Cricket Ground Booking', 2000,  d(3,15));
    await sleep(100);
  }
  console.log('  ✅ Groups: March expenses added');

  // ══════════════════════════════════════════════════════════════════════════
  // APRIL 2026
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📅 April 2026…');

  // ── MAIN – April ──
  const mainApril = [
    { title: 'BigBasket Monthly',       amount: 2400, cat: 'Grocery',        pt: 'UPI',         date: d(4,1)  },
    { title: 'Rapido Week',             amount: 380,  cat: 'Transport',      pt: 'UPI',         date: d(4,2)  },
    { title: 'Ram Navami Special Meal', amount: 650,  cat: 'Food',           pt: 'Cash',        date: d(4,4)  },
    { title: 'BESCOM Bill – March',     amount: 2050, cat: 'Bills',          pt: 'UPI',         date: d(4,5)  },
    { title: 'Cult.fit Class Pack',     amount: 1500, cat: 'Medical',        pt: 'UPI',         date: d(4,7)  },
    { title: 'Date Night – Chianti',    amount: 3200, cat: 'Food',           pt: 'Credit Card', date: d(4,9),  split: [mPriya], note: 'Dinner for two' },
    { title: 'HP Petrol',               amount: 3500, cat: 'Fuel',           pt: 'Cash',        date: d(4,11) },
    { title: 'Myntra Sale Haul',        amount: 5600, cat: 'Shopping',       pt: 'Credit Card', date: d(4,13), tags: ['sale','clothes'] },
    { title: 'Zepto Groceries',         amount: 1350, cat: 'Grocery',        pt: 'UPI',         date: d(4,14) },
    { title: 'Ola Cab – Airport Drop',  amount: 680,  cat: 'Transport',      pt: 'UPI',         date: d(4,16), split: [mRahul] },
    { title: 'ACT Internet – April',    amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(4,17) },
    { title: 'Swiggy Lunch',            amount: 480,  cat: 'Food',           pt: 'UPI',         date: d(4,18) },
    { title: 'Summer Clothes',          amount: 4200, cat: 'Shopping',       pt: 'Credit Card', date: d(4,19), tags: ['clothes','summer'] },
    { title: 'Pharmacy Refill',         amount: 420,  cat: 'Medical',        pt: 'Cash',        date: d(4,21) },
    { title: 'Zomato Order',            amount: 780,  cat: 'Food',           pt: 'UPI',         date: d(4,22) },
    { title: 'Chess Club Subscription', amount: 299,  cat: 'Entertainment',  pt: 'UPI',         date: d(4,23) },
    { title: 'BigBasket Refill',        amount: 1800, cat: 'Grocery',        pt: 'UPI',         date: d(4,25) },
    { title: 'Cafe Coffee Day',         amount: 340,  cat: 'Food',           pt: 'UPI',         date: d(4,26) },
    { title: 'Rapido Rides',            amount: 420,  cat: 'Transport',      pt: 'UPI',         date: d(4,28) },
    { title: 'Weekend Dinner Party',    amount: 4800, cat: 'Food',           pt: 'Credit Card', date: d(4,29), split: [mRahul, mPriya, mArjun], note: 'Hosted at home', tags: ['party'] },
    { title: 'Netflix',                 amount: 649,  cat: 'Entertainment',  pt: 'Credit Card', date: d(4,30) },
  ];
  for (const e of mainApril) { await exp(mainA, mI, e); await sleep(40); }
  console.log(`  ✅ Main: ${mainApril.length} expenses`);

  // ── RAHUL – April ──
  const rahulApril = [
    { title: 'Blinkit Fresh',           amount: 980,  cat: 'Grocery',        pt: 'UPI',         date: d(4,2)  },
    { title: 'Zomato Breakfast',        amount: 220,  cat: 'Food',           pt: 'UPI',         date: d(4,4)  },
    { title: 'Airport Cab – Split',     amount: 680,  cat: 'Transport',      pt: 'UPI',         date: d(4,5),  split: [rAditya] },
    { title: 'Gym Membership',          amount: 2000, cat: 'Medical',        pt: 'UPI',         date: d(4,7)  },
    { title: 'Jio Recharge',            amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(4,10) },
    { title: 'Ola Outstation',          amount: 1200, cat: 'Transport',      pt: 'UPI',         date: d(4,12), split: [rArjun] },
    { title: 'Lunchbox Cafeteria',      amount: 380,  cat: 'Food',           pt: 'Cash',        date: d(4,14) },
    { title: 'Mango Season Haul',       amount: 560,  cat: 'Grocery',        pt: 'Cash',        date: d(4,16) },
    { title: 'Amazon – Water Bottle',   amount: 899,  cat: 'Shopping',       pt: 'Debit Card',  date: d(4,18) },
    { title: 'Swiggy Weekend',          amount: 750,  cat: 'Food',           pt: 'UPI',         date: d(4,20) },
    { title: 'Rapido Monthly',          amount: 399,  cat: 'Transport',      pt: 'UPI',         date: d(4,22) },
    { title: 'Weekend Dinner split',    amount: 1200, cat: 'Food',           pt: 'UPI',         date: d(4,23), split: [rAditya] },
    { title: 'BPCL Petrol',             amount: 2400, cat: 'Fuel',           pt: 'Cash',        date: d(4,25) },
    { title: 'Movie Tickets',           amount: 800,  cat: 'Entertainment',  pt: 'Credit Card', date: d(4,27), split: [rArjun] },
    { title: 'Biryani Takeout',         amount: 640,  cat: 'Food',           pt: 'UPI',         date: d(4,29) },
  ];
  for (const e of rahulApril) { await exp(rahulA, rI, e); await sleep(40); }
  console.log(`  ✅ Rahul: ${rahulApril.length} expenses`);

  // ── PRIYA – April ──
  const priyaApril = [
    { title: 'Zepto Fruits',            amount: 480,  cat: 'Grocery',        pt: 'UPI',         date: d(4,1)  },
    { title: 'Yoga Class – April',      amount: 2500, cat: 'Medical',        pt: 'UPI',         date: d(4,3)  },
    { title: 'Myntra Sale Buy',         amount: 4200, cat: 'Shopping',       pt: 'Credit Card', date: d(4,5),  tags: ['sale','clothes'] },
    { title: 'Uber Pool – Daily',       amount: 540,  cat: 'Transport',      pt: 'UPI',         date: d(4,8)  },
    { title: 'Airtel Postpaid',         amount: 799,  cat: 'Bills',          pt: 'UPI',         date: d(4,10) },
    { title: 'Café Outing',             amount: 680,  cat: 'Food',           pt: 'Credit Card', date: d(4,12), split: [pAditya] },
    { title: 'Nykaa Order',             amount: 1680, cat: 'Shopping',       pt: 'Credit Card', date: d(4,14), tags: ['beauty'] },
    { title: 'Swiggy Lunch',            amount: 290,  cat: 'Food',           pt: 'UPI',         date: d(4,17) },
    { title: 'Eye Checkup',             amount: 400,  cat: 'Medical',        pt: 'Cash',        date: d(4,19) },
    { title: 'Weekend Dinner – split',  amount: 1200, cat: 'Food',           pt: 'UPI',         date: d(4,21), split: [pAditya] },
    { title: 'BigBasket Staples',       amount: 1600, cat: 'Grocery',        pt: 'UPI',         date: d(4,23) },
    { title: 'Amazon – Summer Dress',   amount: 1800, cat: 'Shopping',       pt: 'Credit Card', date: d(4,25), tags: ['clothes','summer'] },
    { title: 'Rapido Rides',            amount: 320,  cat: 'Transport',      pt: 'UPI',         date: d(4,27) },
    { title: 'Sunday Brunch',           amount: 1200, cat: 'Food',           pt: 'Credit Card', date: d(4,28), split: [pArjun] },
    { title: 'Pharma – Supplements',    amount: 680,  cat: 'Medical',        pt: 'UPI',         date: d(4,30) },
  ];
  for (const e of priyaApril) { await exp(priyaA, pI, e); await sleep(40); }
  console.log(`  ✅ Priya: ${priyaApril.length} expenses`);

  // ── ARJUN – April ──
  const arjunApril = [
    { title: 'BPCL Petrol',             amount: 2800, cat: 'Fuel',           pt: 'Cash',        date: d(4,2)  },
    { title: 'Outstation Cab – Split',  amount: 1200, cat: 'Transport',      pt: 'UPI',         date: d(4,3),  split: [aRahul] },
    { title: 'IPL Match – Chinnaswamy', amount: 4500, cat: 'Entertainment',  pt: 'Credit Card', date: d(4,6),  split: [aRahul, aPriya], tags: ['ipl','cricket'] },
    { title: 'Blinkit Snacks',          amount: 680,  cat: 'Grocery',        pt: 'UPI',         date: d(4,8)  },
    { title: 'Swiggy Lunch',            amount: 320,  cat: 'Food',           pt: 'UPI',         date: d(4,10) },
    { title: 'ACT Broadband',           amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(4,12) },
    { title: 'New Cricket Gloves',      amount: 1200, cat: 'Shopping',       pt: 'Debit Card',  date: d(4,14), tags: ['cricket','sports'] },
    { title: 'Rapido Monthly',          amount: 399,  cat: 'Transport',      pt: 'UPI',         date: d(4,16) },
    { title: 'Team Outing Lunch',       amount: 2200, cat: 'Food',           pt: 'UPI',         date: d(4,18), split: [aAditya] },
    { title: 'Movie – Rahul Split',     amount: 800,  cat: 'Entertainment',  pt: 'Credit Card', date: d(4,20), split: [aRahul] },
    { title: 'Medical – Checkup',       amount: 600,  cat: 'Medical',        pt: 'Cash',        date: d(4,22) },
    { title: 'Zepto Groceries',         amount: 1100, cat: 'Grocery',        pt: 'UPI',         date: d(4,24) },
    { title: 'Sunday Brunch – Priya',   amount: 1200, cat: 'Food',           pt: 'Credit Card', date: d(4,26), split: [aPriya] },
    { title: 'Bike Maintenance',        amount: 2200, cat: 'Fuel',           pt: 'Cash',        date: d(4,28), note: 'Oil change + service' },
    { title: 'Swiggy Night',            amount: 450,  cat: 'Food',           pt: 'UPI',         date: d(4,30) },
  ];
  for (const e of arjunApril) { await exp(arjunA, aI, e); await sleep(40); }
  console.log(`  ✅ Arjun: ${arjunApril.length} expenses`);

  // ── GROUP EXPENSES – April ──
  if (flatG?.id) {
    await groupExp(mainA, flatG.id, fM, 'April Rent',              45000, d(4,1),  '3-BHK Koramangala');
    await groupExp(mainA, flatG.id, fR, 'Grocery – April',         8200,  d(4,12));
    await groupExp(mainA, flatG.id, fP, 'Internet – April',        999,   d(4,17));
    await groupExp(mainA, flatG.id, fM, 'Maid Salary – April',     3000,  d(4,25));
    await groupExp(mainA, flatG.id, fP, 'Water Bill',              480,   d(4,28));
    await sleep(100);
  }
  if (officeG?.id) {
    await groupExp(mainA, officeG.id, oM, 'Monthly Team Lunch',    3200,  d(4,4));
    await groupExp(mainA, officeG.id, oA, 'Office Stationery',     750,   d(4,16));
    await groupExp(mainA, officeG.id, oR, 'Cake – Rahul Birthday', 800,   d(4,22), 'Surprise from team');
    await groupExp(mainA, officeG.id, oM, 'Client Lunch – April',  6500,  d(4,28));
    await sleep(100);
  }
  if (weekG?.id) {
    await groupExp(rahulA, weekG.id, wR, 'IPL Watch Party',        3600,  d(4,6),  'Snacks + screening');
    await groupExp(rahulA, weekG.id, wA, 'Cricket Tournament Fee', 1600,  d(4,20));
    await groupExp(rahulA, weekG.id, wM, 'Weekend BBQ',            5200,  d(4,27), 'Terrace BBQ party');
    await sleep(100);
  }
  console.log('  ✅ Groups: April expenses added');

  // ══════════════════════════════════════════════════════════════════════════
  // MAY 2026
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📅 May 2026…');

  // ── MAIN – May ──
  const mainMay = [
    { title: 'Zepto Groceries',         amount: 1780, cat: 'Grocery',        pt: 'UPI',         date: d(5,2)  },
    { title: 'Ola Cab – Morning',       amount: 180,  cat: 'Transport',      pt: 'UPI',         date: d(5,3)  },
    { title: 'BESCOM Bill – April',     amount: 2320, cat: 'Bills',          pt: 'UPI',         date: d(5,4)  },
    { title: 'Swiggy Dinner',           amount: 560,  cat: 'Food',           pt: 'UPI',         date: d(5,5)  },
    { title: 'HP Petrol',               amount: 3500, cat: 'Fuel',           pt: 'Cash',        date: d(5,7)  },
    { title: 'Doctors visit',           amount: 600,  cat: 'Medical',        pt: 'Cash',        date: d(5,8)  },
    { title: 'Amazon Prime items',      amount: 2200, cat: 'Shopping',       pt: 'Credit Card', date: d(5,9)  },
    { title: 'BigBasket Bulk',          amount: 2400, cat: 'Grocery',        pt: 'UPI',         date: d(5,10) },
    { title: 'Mother\'s Day Dinner',    amount: 4500, cat: 'Food',           pt: 'Credit Card', date: d(5,11), note: "Family celebration", tags: ['family'] },
    { title: 'ACT Internet – May',      amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(5,12) },
    { title: 'Zomato Lunch',            amount: 420,  cat: 'Food',           pt: 'UPI',         date: d(5,13) },
    { title: 'Summer Vacation Plan',    amount: 8000, cat: 'Travel',         pt: 'Credit Card', date: d(5,14), split: [mRahul, mPriya, mArjun], note: 'Coorg resort booking', tags: ['travel','summer'] },
    { title: 'Rapido Rides – May',      amount: 420,  cat: 'Transport',      pt: 'UPI',         date: d(5,15) },
    { title: 'Pharmacy',                amount: 380,  cat: 'Medical',        pt: 'Cash',        date: d(5,16) },
    { title: 'Zepto Weekly',            amount: 1240, cat: 'Grocery',        pt: 'UPI',         date: d(5,18) },
    { title: 'Dinner – Fatty Bao',      amount: 2800, cat: 'Food',           pt: 'Credit Card', date: d(5,19), split: [mArjun] },
    { title: 'Netflix',                 amount: 649,  cat: 'Entertainment',  pt: 'Credit Card', date: d(5,20) },
    { title: 'Amazon Household',        amount: 1650, cat: 'Shopping',       pt: 'Credit Card', date: d(5,21) },
    { title: 'Petrol – HP',             amount: 3200, cat: 'Fuel',           pt: 'Cash',        date: d(5,23) },
    { title: 'Weekend Trek Supplies',   amount: 1800, cat: 'Travel',         pt: 'UPI',         date: d(5,24), split: [mRahul, mArjun], tags: ['trek','outdoor'] },
    { title: 'Swiggy End-of-week',      amount: 620,  cat: 'Food',           pt: 'UPI',         date: d(5,25) },
    { title: 'BigBasket Refill',        amount: 1420, cat: 'Grocery',        pt: 'UPI',         date: d(5,27) },
    { title: 'Ola Ride',                amount: 220,  cat: 'Transport',      pt: 'UPI',         date: d(5,28) },
    { title: 'Zomato Weekend',          amount: 840,  cat: 'Food',           pt: 'UPI',         date: d(5,30) },
  ];
  for (const e of mainMay) { await exp(mainA, mI, e); await sleep(40); }
  console.log(`  ✅ Main: ${mainMay.length} expenses`);

  // ── RAHUL – May ──
  const rahulMay = [
    { title: 'Blinkit Weekly',          amount: 1100, cat: 'Grocery',        pt: 'UPI',         date: d(5,1)  },
    { title: 'Rapido – Office',         amount: 220,  cat: 'Transport',      pt: 'UPI',         date: d(5,3)  },
    { title: 'Jio Recharge',            amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(5,5)  },
    { title: 'Swiggy Lunch',            amount: 340,  cat: 'Food',           pt: 'UPI',         date: d(5,7)  },
    { title: 'Gym Protein Powder',      amount: 1800, cat: 'Medical',        pt: 'Credit Card', date: d(5,9)  },
    { title: 'Vacation Resort split',   amount: 2000, cat: 'Travel',         pt: 'UPI',         date: d(5,10), split: [rAditya], tags: ['travel'] },
    { title: 'BPCL Petrol',             amount: 2600, cat: 'Fuel',           pt: 'Cash',        date: d(5,12) },
    { title: 'Zomato Dinner',           amount: 580,  cat: 'Food',           pt: 'UPI',         date: d(5,14) },
    { title: 'Trek Supplies split',     amount: 1800, cat: 'Travel',         pt: 'UPI',         date: d(5,15), split: [rAditya], tags: ['trek'] },
    { title: 'Myntra T-shirts',         amount: 1600, cat: 'Shopping',       pt: 'Credit Card', date: d(5,17), tags: ['clothes'] },
    { title: 'Amazon Earbuds',          amount: 2499, cat: 'Shopping',       pt: 'Credit Card', date: d(5,19), tags: ['gadgets'] },
    { title: 'Zepto Vegs',              amount: 640,  cat: 'Grocery',        pt: 'UPI',         date: d(5,21) },
    { title: 'Coffee with Priya',       amount: 540,  cat: 'Food',           pt: 'UPI',         date: d(5,23), split: [rPriya] },
    { title: 'Apartment electricity',   amount: 2900, cat: 'Bills',          pt: 'UPI',         date: d(5,25), split: [rAditya] },
    { title: 'Weekend Biryani',         amount: 760,  cat: 'Food',           pt: 'UPI',         date: d(5,27) },
    { title: 'Rapido End of month',     amount: 380,  cat: 'Transport',      pt: 'UPI',         date: d(5,30) },
  ];
  for (const e of rahulMay) { await exp(rahulA, rI, e); await sleep(40); }
  console.log(`  ✅ Rahul: ${rahulMay.length} expenses`);

  // ── PRIYA – May ──
  const priyaMay = [
    { title: 'Zepto Grocery',           amount: 1240, cat: 'Grocery',        pt: 'UPI',         date: d(5,2)  },
    { title: 'Yoga – May Pack',         amount: 2500, cat: 'Medical',        pt: 'UPI',         date: d(5,4)  },
    { title: 'Airtel Bill',             amount: 799,  cat: 'Bills',          pt: 'UPI',         date: d(5,6)  },
    { title: 'Uber – Commute',          amount: 420,  cat: 'Transport',      pt: 'UPI',         date: d(5,8)  },
    { title: 'Vacation Resort split',   amount: 2000, cat: 'Travel',         pt: 'UPI',         date: d(5,9),  split: [pAditya], tags: ['travel'] },
    { title: 'Swiggy Lunch',            amount: 310,  cat: 'Food',           pt: 'UPI',         date: d(5,11) },
    { title: 'Nykaa Haul',              amount: 2400, cat: 'Shopping',       pt: 'Credit Card', date: d(5,13), tags: ['beauty'] },
    { title: 'Coffee with Rahul',       amount: 540,  cat: 'Food',           pt: 'UPI',         date: d(5,15), split: [pRahul] },
    { title: 'Amazon – Summer outfit',  amount: 2200, cat: 'Shopping',       pt: 'Credit Card', date: d(5,17), tags: ['clothes','summer'] },
    { title: 'Zepto Fresh',             amount: 880,  cat: 'Grocery',        pt: 'UPI',         date: d(5,19) },
    { title: 'Restaurant – Aditya',     amount: 1600, cat: 'Food',           pt: 'Credit Card', date: d(5,21), split: [pAditya] },
    { title: 'Books – Kindle',          amount: 349,  cat: 'Education',      pt: 'UPI',         date: d(5,23) },
    { title: 'Rapido Rides',            amount: 290,  cat: 'Transport',      pt: 'UPI',         date: d(5,25) },
    { title: 'Gym Joining Fee',         amount: 3000, cat: 'Medical',        pt: 'UPI',         date: d(5,27) },
    { title: 'Swiggy Dinner',           amount: 480,  cat: 'Food',           pt: 'UPI',         date: d(5,29) },
  ];
  for (const e of priyaMay) { await exp(priyaA, pI, e); await sleep(40); }
  console.log(`  ✅ Priya: ${priyaMay.length} expenses`);

  // ── ARJUN – May ──
  const arjunMay = [
    { title: 'BPCL Petrol',             amount: 2800, cat: 'Fuel',           pt: 'Cash',        date: d(5,1)  },
    { title: 'ACT Broadband – May',     amount: 999,  cat: 'Bills',          pt: 'UPI',         date: d(5,3)  },
    { title: 'Vacation Resort split',   amount: 2000, cat: 'Travel',         pt: 'UPI',         date: d(5,5),  split: [aAditya], tags: ['travel'] },
    { title: 'Swiggy Breakfast',        amount: 280,  cat: 'Food',           pt: 'UPI',         date: d(5,7)  },
    { title: 'Cricket Kit Maintenance', amount: 650,  cat: 'Shopping',       pt: 'Cash',        date: d(5,9),  tags: ['cricket'] },
    { title: 'Trek Gear – Split',       amount: 1800, cat: 'Travel',         pt: 'UPI',         date: d(5,11), split: [aAditya], tags: ['trek'] },
    { title: 'Zomato Lunch',            amount: 380,  cat: 'Food',           pt: 'UPI',         date: d(5,13) },
    { title: 'Fatty Bao Dinner split',  amount: 2800, cat: 'Food',           pt: 'Credit Card', date: d(5,15), split: [aAditya] },
    { title: 'Rapido Monthly',          amount: 399,  cat: 'Transport',      pt: 'UPI',         date: d(5,17) },
    { title: 'Medical – Physio',        amount: 800,  cat: 'Medical',        pt: 'Cash',        date: d(5,19) },
    { title: 'Blinkit Weekly',          amount: 920,  cat: 'Grocery',        pt: 'UPI',         date: d(5,21) },
    { title: 'Amazon – Summer Fan',     amount: 1499, cat: 'Shopping',       pt: 'Credit Card', date: d(5,23) },
    { title: 'IPL Final Watch party',   amount: 3200, cat: 'Entertainment',  pt: 'UPI',         date: d(5,25), split: [aRahul, aPriya], tags: ['ipl','cricket'] },
    { title: 'Petrol – month end',      amount: 2400, cat: 'Fuel',           pt: 'Cash',        date: d(5,27) },
    { title: 'Swiggy Weekend',          amount: 620,  cat: 'Food',           pt: 'UPI',         date: d(5,30) },
  ];
  for (const e of arjunMay) { await exp(arjunA, aI, e); await sleep(40); }
  console.log(`  ✅ Arjun: ${arjunMay.length} expenses`);

  // ── GROUP EXPENSES – May ──
  if (flatG?.id) {
    await groupExp(mainA, flatG.id, fM, 'May Rent',                45000, d(5,1),  '3-BHK Koramangala');
    await groupExp(mainA, flatG.id, fR, 'Grocery – May',           9100,  d(5,10));
    await groupExp(mainA, flatG.id, fM, 'Internet – May',          999,   d(5,15));
    await groupExp(mainA, flatG.id, fP, 'Maid Salary – May',       3000,  d(5,25));
    await groupExp(mainA, flatG.id, fP, 'Gas + Misc',              1100,  d(5,28));
    await sleep(100);
  }
  if (officeG?.id) {
    await groupExp(mainA, officeG.id, oM, 'May Team Lunch',        2800,  d(5,7));
    await groupExp(mainA, officeG.id, oR, 'Coffee Machine Pods',   480,   d(5,15));
    await groupExp(mainA, officeG.id, oA, 'Client Dinner – May',   7200,  d(5,22), 'New client onboard');
    await groupExp(mainA, officeG.id, oM, 'Farewell – Intern',     1200,  d(5,29));
    await sleep(100);
  }
  if (weekG?.id) {
    await groupExp(rahulA, weekG.id, wR, 'Coorg Weekend Trip',     12000, d(5,10), 'Resort + activities');
    await groupExp(rahulA, weekG.id, wA, 'Trek – Kumara Parvata',  4500,  d(5,17), 'Entry + guide fee');
    await groupExp(rahulA, weekG.id, wM, 'IPL Final Party',        6800,  d(5,25), 'Lounge screening');
    await sleep(100);
  }
  console.log('  ✅ Groups: May expenses added');

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════════

  const totals = {
    main:  mainMarch.length  + mainApril.length  + mainMay.length,
    rahul: rahulMarch.length + rahulApril.length + rahulMay.length,
    priya: priyaMarch.length + priyaApril.length + priyaMay.length,
    arjun: arjunMarch.length + arjunApril.length + arjunMay.length,
  };

  console.log(`
╔══════════════════════════════════════════════════════╗
║          🎉  3-Month History Seed Done!              ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Main (Aditya):   ${String(totals.main).padEnd(3)} new expenses (Mar–May)  ║
║  Rahul Sharma:    ${String(totals.rahul).padEnd(3)} new expenses (Mar–May)  ║
║  Priya Patel:     ${String(totals.priya).padEnd(3)} new expenses (Mar–May)  ║
║  Arjun Mehta:     ${String(totals.arjun).padEnd(3)} new expenses (Mar–May)  ║
║                                                      ║
║  + Group expenses added to all 4 groups per month   ║
║  + Cross-account splits seeded throughout           ║
╚══════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Failed:', e.message);
  if (e.data) console.error('API:', e.data);
  process.exit(1);
});
