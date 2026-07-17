// seed-demo.js — Comprehensive HisabKitab Demo Seeder
// Run from Backend/: node seed-demo.js
// Requires backend running on port 5000

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

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function fpost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(`POST ${url} → ${r.status}`), { data });
  return data;
}

function makeApi(jwt) {
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` };
  const req = async (method, path, body) => {
    const opts = { method, headers: h };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, opts);
    const d = await r.json();
    if (!r.ok) throw Object.assign(new Error(`${method} ${path} → ${r.status}`), { data: d });
    return d;
  };
  return {
    get:    (p)    => req('GET',    p),
    post:   (p, b) => req('POST',   p, b),
    put:    (p, b) => req('PUT',    p, b),
    patch:  (p, b) => req('PATCH',  p, b),
    delete: (p)    => req('DELETE', p),
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function daysAgo(n, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateStr(n) { return daysAgo(n).slice(0, 10); }

// ── Firebase auth ─────────────────────────────────────────────────────────────

async function firebaseEmailSignIn(email, password) {
  const d = await fpost(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    { email, password, returnSecureToken: true }
  );
  return d.idToken;
}

async function firebaseCustomTokenSignIn(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  const d = await fpost(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`,
    { token: customToken, returnSecureToken: true }
  );
  return d.idToken;
}

async function backendLogin(idToken) {
  const d = await fpost(`${BASE}/api/auth/login`, { token: idToken });
  return { jwt: d.token, user: d.user };
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function upsertPerson(api, name, email) {
  const all = await api.get('/api/people');
  const found = all.find(p => p.name === name);
  if (found) return found;
  return api.post('/api/people', { name, email });
}

async function tryPost(api, path, body, label) {
  try { return await api.post(path, body); }
  catch (e) { console.error(`  ⚠ ${label}: ${e.data?.error || e.message}`); return null; }
}

async function exp(api, info, data) {
  return tryPost(api, '/api/expenses', {
    amount:          data.amount,
    currency:        'INR',
    title:           data.title,
    note:            data.note || null,
    expenseDate:     data.date,
    categoryId:      info.cats[data.cat] || null,
    paymentTypeId:   info.pts[data.pt]  || Object.values(info.pts)[0],
    accountId:       data.accountId || null,
    peopleIds:       (data.splitWith || []).filter(Boolean),
    paidForPersonId: data.paidFor || null,
    tags:            data.tags || [],
  }, `expense "${data.title}"`);
}

async function income(api, info, data) {
  return tryPost(api, '/api/income', {
    amount:     data.amount,
    title:      data.title,
    category:   data.category || 'OTHER',
    source:     data.source || null,
    incomeDate: data.date,
    note:       data.note || null,
    accountId:  data.accountId || null,
    tags:       data.tags || [],
  }, `income "${data.title}"`);
}

async function groupExp(api, groupId, data) {
  return tryPost(api, `/api/groups/${groupId}/expenses`, {
    title:          data.title,
    amount:         data.amount,
    note:           data.note || null,
    expenseDate:    data.date,
    paidByMemberId: data.paidBy,
    splitType:      'EQUAL',
  }, `group expense "${data.title}"`);
}

function mid(group, userId) {
  return group.members?.find(m => m.userId === userId)?.id;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  HisabKitab Demo Seeder v2 starting…\n');

  // ── 1. Firebase users ─────────────────────────────────────────────────────

  console.log('👤 Setting up Firebase users…');
  for (const acc of DEMO_ACCOUNTS) {
    try {
      await admin.auth().createUser({ email: acc.email, password: acc.password, displayName: acc.name, emailVerified: true });
      console.log(`  ✅ Created: ${acc.email}`);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        const u = await admin.auth().getUserByEmail(acc.email);
        await admin.auth().updateUser(u.uid, { password: acc.password, displayName: acc.name });
        console.log(`  ♻️  Updated: ${acc.email}`);
      } else throw e;
    }
  }
  const mainFbUser = await admin.auth().getUserByEmail(MAIN_EMAIL);
  console.log(`  ✅ Found main: ${MAIN_EMAIL}`);

  // ── 2. Backend JWTs ──────────────────────────────────────────────────────

  console.log('\n🔑 Getting backend JWTs…');
  const mainIdToken = await firebaseCustomTokenSignIn(mainFbUser.uid);
  const mainSession = await backendLogin(mainIdToken);
  console.log(`  ✅ Main (${MAIN_EMAIL}) → userId: ${mainSession.user.id}`);

  const demoSessions = [];
  for (const acc of DEMO_ACCOUNTS) {
    const idToken = await firebaseEmailSignIn(acc.email, acc.password);
    const session = await backendLogin(idToken);
    demoSessions.push({ ...acc, ...session });
    console.log(`  ✅ ${acc.name} → userId: ${session.user.id}`);
    await sleep(150);
  }

  const allSessions = [
    { name: 'Aditya', email: MAIN_EMAIL, ...mainSession },
    ...demoSessions,
  ];
  const [mainS, rahulS, priyaS, arjunS] = allSessions;
  const [mainA, rahulA, priyaA, arjunA] = allSessions.map(s => makeApi(s.jwt));

  // ── 3. Categories ─────────────────────────────────────────────────────────

  console.log('\n📂 Creating categories…');

  const CAT_DEFS = [
    { name: 'Food',          icon: '🍔', color: '#FF5722' },
    { name: 'Grocery',       icon: '🛒', color: '#4CAF50' },
    { name: 'Transport',     icon: '🚌', color: '#2196F3' },
    { name: 'Shopping',      icon: '🛍️', color: '#E91E63' },
    { name: 'Entertainment', icon: '🎬', color: '#9C27B0' },
    { name: 'Bills',         icon: '📄', color: '#607D8B' },
    { name: 'Medical',       icon: '💊', color: '#F44336' },
    { name: 'Travel',        icon: '✈️', color: '#00BCD4' },
    { name: 'Education',     icon: '📚', color: '#3F51B5' },
    { name: 'Fuel',          icon: '⛽', color: '#FF9800' },
    { name: 'Rent',          icon: '🏠', color: '#795548' },
    { name: 'Fitness',       icon: '🏋️', color: '#009688' },
  ];

  async function setupCategories(api, label) {
    const existing = await api.get('/api/categories');
    const existingNames = new Set(existing.map(c => c.name));
    let created = 0;
    for (const cat of CAT_DEFS) {
      if (!existingNames.has(cat.name)) {
        await tryPost(api, '/api/categories', cat, `cat ${cat.name}`);
        created++;
        await sleep(50);
      }
    }
    const fresh = await api.get('/api/categories');
    console.log(`  ✅ ${label}: ${fresh.length} categories (${created} new)`);
    return Object.fromEntries(fresh.map(c => [c.name, c.id]));
  }

  const [mainCats, rahulCats, priyaCats, arjunCats] = await Promise.all([
    setupCategories(mainA,  'Main'),
    setupCategories(rahulA, 'Rahul'),
    setupCategories(priyaA, 'Priya'),
    setupCategories(arjunA, 'Arjun'),
  ]);

  // ── 4. Payment types ──────────────────────────────────────────────────────

  console.log('\n💳 Creating payment types…');

  const PT_DEFS = [
    { name: 'UPI',         icon: '📱', color: '#2196F3', isDefault: true },
    { name: 'Credit Card', icon: '💳', color: '#9C27B0', cardType: 'CREDIT_CARD', billingCycleDay: 1, paymentDueDay: 20 },
    { name: 'Debit Card',  icon: '🏦', color: '#FF5722' },
    { name: 'Cash',        icon: '💵', color: '#4CAF50' },
    { name: 'Paytm',       icon: '👛', color: '#FF9800' },
  ];

  async function setupPaymentTypes(api, label) {
    const existing = await api.get('/api/payment-types');
    const existingNames = new Set(existing.map(p => p.name));
    let created = 0;
    for (const pt of PT_DEFS) {
      if (!existingNames.has(pt.name)) {
        await tryPost(api, '/api/payment-types', pt, `pt ${pt.name}`);
        created++;
        await sleep(50);
      }
    }
    const fresh = await api.get('/api/payment-types');
    console.log(`  ✅ ${label}: ${fresh.length} payment types (${created} new)`);
    return Object.fromEntries(fresh.map(p => [p.name, p.id]));
  }

  const [mainPts, rahulPts, priyaPts, arjunPts] = await Promise.all([
    setupPaymentTypes(mainA,  'Main'),
    setupPaymentTypes(rahulA, 'Rahul'),
    setupPaymentTypes(priyaA, 'Priya'),
    setupPaymentTypes(arjunA, 'Arjun'),
  ]);

  // ── 5. Accounts (main user) ───────────────────────────────────────────────

  console.log('\n🏦 Creating accounts…');

  async function getOrCreateAccount(api, data) {
    const existing = await api.get('/api/accounts');
    const found = existing.find(a => a.name === data.name);
    if (found) return found;
    return api.post('/api/accounts', data);
  }

  const hdfcSavings = await getOrCreateAccount(mainA, {
    name: 'HDFC Savings',    type: 'SAVINGS',     openingBalance: 85000,  icon: '🏦', color: '#2563EB',
  });
  const icicCurrent = await getOrCreateAccount(mainA, {
    name: 'ICICI Current',   type: 'CURRENT',     openingBalance: 120000, icon: '🏛️', color: '#7C3AED',
  });
  const hdfcCC = await getOrCreateAccount(mainA, {
    name: 'HDFC Credit Card',type: 'CREDIT_CARD', openingBalance: 0,      icon: '💳', color: '#9C27B0',
  });
  const paytmWallet = await getOrCreateAccount(mainA, {
    name: 'Paytm Wallet',    type: 'WALLET',      openingBalance: 2500,   icon: '👛', color: '#FF9800',
  });
  const cashAccount = await getOrCreateAccount(mainA, {
    name: 'Cash',            type: 'CASH',        openingBalance: 8000,   icon: '💵', color: '#16A34A',
  });

  // Rahul's accounts
  const rahulHDFC = await getOrCreateAccount(rahulA, {
    name: 'HDFC Savings', type: 'SAVINGS', openingBalance: 45000, icon: '🏦', color: '#2563EB',
  });

  console.log(`  ✅ Main: HDFC Savings (${hdfcSavings?.id?.slice(0,8)}…), ICICI, HDFC CC, Paytm, Cash`);
  console.log(`  ✅ Rahul: HDFC Savings`);

  // Link UPI payment type to HDFC Savings for main user
  if (mainPts['UPI'] && hdfcSavings?.id) {
    try {
      await mainA.put(`/api/payment-types/${mainPts['UPI']}`, {
        name: 'UPI', icon: '📱', color: '#2196F3', isDefault: true, linkedAccountId: hdfcSavings.id,
      });
    } catch { /* skip */ }
  }
  // Link Credit Card PT to HDFC CC account
  if (mainPts['Credit Card'] && hdfcCC?.id) {
    try {
      await mainA.put(`/api/payment-types/${mainPts['Credit Card']}`, {
        name: 'Credit Card', icon: '💳', color: '#9C27B0', cardType: 'CREDIT_CARD',
        billingCycleDay: 1, paymentDueDay: 20, linkedAccountId: hdfcCC.id,
      });
    } catch { /* skip */ }
  }
  console.log('  ✅ Payment types linked to accounts');

  // Build info objects
  const infos = [
    { ...mainS,  cats: mainCats,  pts: mainPts,  accs: { savings: hdfcSavings?.id, cc: hdfcCC?.id, wallet: paytmWallet?.id, cash: cashAccount?.id } },
    { ...rahulS, cats: rahulCats, pts: rahulPts, accs: { savings: rahulHDFC?.id } },
    { ...priyaS, cats: priyaCats, pts: priyaPts, accs: {} },
    { ...arjunS, cats: arjunCats, pts: arjunPts, accs: {} },
  ];
  const [mainI, rahulI, priyaI, arjunI] = infos;

  // ── 6. People connections ─────────────────────────────────────────────────

  console.log('\n👥 Creating people connections…');

  const mP = {
    rahul: await upsertPerson(mainA, 'Rahul Sharma', rahulS.email),
    priya: await upsertPerson(mainA, 'Priya Patel',  priyaS.email),
    arjun: await upsertPerson(mainA, 'Arjun Mehta',  arjunS.email),
  };
  const rP = {
    aditya: await upsertPerson(rahulA, 'Aditya',       mainS.email),
    priya:  await upsertPerson(rahulA, 'Priya Patel',  priyaS.email),
    arjun:  await upsertPerson(rahulA, 'Arjun Mehta',  arjunS.email),
  };
  const pP = {
    aditya: await upsertPerson(priyaA, 'Aditya',        mainS.email),
    rahul:  await upsertPerson(priyaA, 'Rahul Sharma',  rahulS.email),
    arjun:  await upsertPerson(priyaA, 'Arjun Mehta',   arjunS.email),
  };
  const aP = {
    aditya: await upsertPerson(arjunA, 'Aditya',        mainS.email),
    rahul:  await upsertPerson(arjunA, 'Rahul Sharma',  rahulS.email),
    priya:  await upsertPerson(arjunA, 'Priya Patel',   priyaS.email),
  };
  console.log('  ✅ All people linked');

  // ── 7. Individual expenses ─────────────────────────────────────────────────

  console.log('\n💸 Creating expenses…');

  // MAIN — 3 months of varied expenses
  const mainExpenses = [
    // This month
    { title: 'Swiggy Dinner',             amount: 720,  cat: 'Food',          pt: 'UPI',         date: daysAgo(1),  accountId: hdfcSavings?.id },
    { title: 'Zomato Gold Lunch',         amount: 380,  cat: 'Food',          pt: 'UPI',         date: daysAgo(2),  accountId: hdfcSavings?.id },
    { title: 'BESCOM Electricity Jun',    amount: 2180, cat: 'Bills',         pt: 'UPI',         date: daysAgo(3),  note: 'June bill' },
    { title: 'ACT Fibernet Jun',          amount: 999,  cat: 'Bills',         pt: 'UPI',         date: daysAgo(4) },
    { title: 'HP Petrol Pump',            amount: 3500, cat: 'Fuel',          pt: 'Cash',        date: daysAgo(7),  accountId: cashAccount?.id },
    { title: 'Apollo Pharmacy',           amount: 640,  cat: 'Medical',       pt: 'UPI',         date: daysAgo(10) },
    { title: 'BigBasket Monthly Order',   amount: 2200, cat: 'Grocery',       pt: 'UPI',         date: daysAgo(8),  splitWith: [mP.rahul?.id] },
    { title: 'Movie Night – Kalki 2898',  amount: 2400, cat: 'Entertainment', pt: 'Credit Card', date: daysAgo(12), splitWith: [mP.rahul?.id, mP.priya?.id], note: '3 tickets + IMAX', accountId: hdfcCC?.id },
    { title: 'Ola Cab to Airport',        amount: 850,  cat: 'Transport',     pt: 'UPI',         date: daysAgo(15), splitWith: [mP.arjun?.id] },
    { title: 'Phoenix Mall Shopping',     amount: 8450, cat: 'Shopping',      pt: 'Credit Card', date: daysAgo(18), note: 'Clothes + shoes', tags: ['shopping','festive'], accountId: hdfcCC?.id },
    // Last month
    { title: 'Dinner at The Table',       amount: 3600, cat: 'Food',          pt: 'Credit Card', date: daysAgo(22), splitWith: [mP.rahul?.id, mP.priya?.id, mP.arjun?.id], note: 'Post-launch dinner', tags: ['dinner','team'], accountId: hdfcCC?.id },
    { title: 'Birthday Party Setup',      amount: 6500, cat: 'Entertainment', pt: 'Credit Card', date: daysAgo(22), splitWith: [mP.priya?.id, mP.arjun?.id], note: 'Cake + decorations', tags: ['party'], accountId: hdfcCC?.id },
    { title: 'Udemy React Native Course', amount: 499,  cat: 'Education',     pt: 'Credit Card', date: daysAgo(25), accountId: hdfcCC?.id },
    { title: 'Cult.fit 3-Month Plan',     amount: 3000, cat: 'Fitness',       pt: 'UPI',         date: daysAgo(30) },
    { title: 'BMTC Bus Pass',             amount: 600,  cat: 'Transport',     pt: 'Cash',        date: daysAgo(33), accountId: cashAccount?.id },
    { title: 'BESCOM Electricity May',    amount: 1950, cat: 'Bills',         pt: 'UPI',         date: daysAgo(35), note: 'May bill' },
    { title: 'Noise Smartwatch',          amount: 4999, cat: 'Shopping',      pt: 'Debit Card',  date: daysAgo(40), tags: ['gadgets'] },
    { title: 'Netflix Annual Plan',       amount: 1499, cat: 'Entertainment', pt: 'Credit Card', date: daysAgo(45), accountId: hdfcCC?.id },
    // 2 months ago
    { title: 'IndiGo BLR–BOM Flight',    amount: 4200, cat: 'Travel',        pt: 'Credit Card', date: daysAgo(60), note: 'Work trip Mumbai', tags: ['travel','work'], accountId: hdfcCC?.id },
    { title: 'Hotel Taj Lands End',       amount: 8500, cat: 'Travel',        pt: 'Credit Card', date: daysAgo(58), note: '1 night Mumbai', tags: ['travel','work'], accountId: hdfcCC?.id },
    { title: 'Doctors Consultation',      amount: 1200, cat: 'Medical',       pt: 'Cash',        date: daysAgo(55), accountId: cashAccount?.id },
    { title: 'Spotify Premium 3mo',       amount: 357,  cat: 'Entertainment', pt: 'Credit Card', date: daysAgo(62), accountId: hdfcCC?.id },
    { title: "Grocery – Namdhari's",      amount: 3100, cat: 'Grocery',       pt: 'UPI',         date: daysAgo(50) },
    { title: 'Auto + Ola commute',        amount: 1400, cat: 'Transport',     pt: 'Cash',        date: daysAgo(48), note: 'Week commute', accountId: cashAccount?.id },
    { title: 'BESCOM Electricity Apr',    amount: 1780, cat: 'Bills',         pt: 'UPI',         date: daysAgo(65), note: 'April bill' },
    { title: 'Behance Pro Annual',        amount: 1499, cat: 'Education',     pt: 'Credit Card', date: daysAgo(70), accountId: hdfcCC?.id },
    { title: 'Gym Membership Renewal',    amount: 2000, cat: 'Fitness',       pt: 'Cash',        date: daysAgo(72), accountId: cashAccount?.id },
    { title: 'Local Market Veggies',      amount: 680,  cat: 'Grocery',       pt: 'Cash',        date: daysAgo(80), accountId: cashAccount?.id },
    { title: 'Rapido Weekly Rides',       amount: 520,  cat: 'Transport',     pt: 'UPI',         date: daysAgo(75) },
    { title: 'Haircut – Enrich Salon',    amount: 450,  cat: 'Medical',       pt: 'Cash',        date: daysAgo(78), accountId: cashAccount?.id },
  ];

  let mainExpCount = 0;
  for (const e of mainExpenses) {
    await exp(mainA, mainI, e);
    mainExpCount++;
    await sleep(80);
  }
  console.log(`  ✅ Main: ${mainExpCount} expenses`);

  // RAHUL
  const rahulExpenses = [
    { title: 'Nandi Hills Petrol',      amount: 1200, cat: 'Fuel',          pt: 'Cash',        date: daysAgo(14), splitWith: [rP.aditya?.id], note: 'Road trip' },
    { title: 'CCD Lunch with Aditya',   amount: 640,  cat: 'Food',          pt: 'UPI',         date: daysAgo(9),  splitWith: [rP.aditya?.id] },
    { title: 'Apartment Electricity',   amount: 3400, cat: 'Bills',         pt: 'UPI',         date: daysAgo(5),  splitWith: [rP.aditya?.id] },
    { title: 'Blinkit Groceries',       amount: 1850, cat: 'Grocery',       pt: 'UPI',         date: daysAgo(3) },
    { title: 'Rapido Rides – Week',     amount: 420,  cat: 'Transport',     pt: 'UPI',         date: daysAgo(6) },
    { title: 'Myntra Kurtas',           amount: 2800, cat: 'Shopping',      pt: 'Credit Card', date: daysAgo(20) },
    { title: 'Zomato Weekend Order',    amount: 890,  cat: 'Food',          pt: 'UPI',         date: daysAgo(2) },
    { title: 'Jio Recharge',            amount: 999,  cat: 'Bills',         pt: 'UPI',         date: daysAgo(28) },
    { title: 'Dominos with Arjun',      amount: 1200, cat: 'Food',          pt: 'UPI',         date: daysAgo(4),  splitWith: [rP.arjun?.id] },
    { title: 'Gym Monthly',             amount: 800,  cat: 'Fitness',       pt: 'Cash',        date: daysAgo(30) },
  ];
  let rCount = 0;
  for (const e of rahulExpenses) { await exp(rahulA, rahulI, e); rCount++; await sleep(70); }
  console.log(`  ✅ Rahul: ${rCount} expenses`);

  // PRIYA
  const priyaExpenses = [
    { title: 'Kairali Spa Day',          amount: 4000, cat: 'Fitness',       pt: 'Credit Card', date: daysAgo(20), splitWith: [pP.aditya?.id], tags: ['wellness'] },
    { title: 'Coast Restaurant Dinner',  amount: 2800, cat: 'Food',          pt: 'UPI',         date: daysAgo(11), splitWith: [pP.aditya?.id] },
    { title: 'H&M Koramangala',          amount: 5200, cat: 'Shopping',      pt: 'Credit Card', date: daysAgo(16) },
    { title: 'Nykaa Beauty Order',       amount: 1450, cat: 'Shopping',      pt: 'UPI',         date: daysAgo(8) },
    { title: 'Yoga Studio Membership',   amount: 2500, cat: 'Fitness',       pt: 'UPI',         date: daysAgo(30) },
    { title: 'Auto Share with Rahul',    amount: 480,  cat: 'Transport',     pt: 'Cash',        date: daysAgo(4),  splitWith: [pP.rahul?.id] },
    { title: 'Amazon Prime Annual',      amount: 1499, cat: 'Entertainment', pt: 'Credit Card', date: daysAgo(40) },
    { title: 'Swiggy Lunch',             amount: 340,  cat: 'Food',          pt: 'UPI',         date: daysAgo(1) },
    { title: 'Westside Dress',           amount: 3200, cat: 'Shopping',      pt: 'Debit Card',  date: daysAgo(55) },
  ];
  let pCount = 0;
  for (const e of priyaExpenses) { await exp(priyaA, priyaI, e); pCount++; await sleep(70); }
  console.log(`  ✅ Priya: ${pCount} expenses`);

  // ARJUN
  const arjunExpenses = [
    { title: 'SG Cricket Kit',            amount: 5600, cat: 'Shopping',      pt: 'Debit Card',  date: daysAgo(17), splitWith: [aP.aditya?.id], note: 'Bat + pads', tags: ['sports'] },
    { title: 'Office Supplies – Split',   amount: 1200, cat: 'Bills',         pt: 'Cash',        date: daysAgo(13), splitWith: [aP.aditya?.id] },
    { title: 'Dominos Post-match',        amount: 1800, cat: 'Food',          pt: 'UPI',         date: daysAgo(4),  splitWith: [aP.rahul?.id] },
    { title: 'Ola Monthly Subscription',  amount: 899,  cat: 'Transport',     pt: 'UPI',         date: daysAgo(2) },
    { title: 'boAt Earbuds 131',          amount: 2999, cat: 'Shopping',      pt: 'Credit Card', date: daysAgo(35), tags: ['gadgets'] },
    { title: 'Full-body Checkup',         amount: 850,  cat: 'Medical',       pt: 'Cash',        date: daysAgo(23) },
    { title: 'BPCL Petrol',               amount: 2800, cat: 'Fuel',          pt: 'Cash',        date: daysAgo(6) },
    { title: 'IPL Match Tickets',         amount: 3600, cat: 'Entertainment', pt: 'Credit Card', date: daysAgo(48), splitWith: [aP.rahul?.id, aP.priya?.id], tags: ['cricket','ipl'] },
  ];
  let aCount = 0;
  for (const e of arjunExpenses) { await exp(arjunA, arjunI, e); aCount++; await sleep(70); }
  console.log(`  ✅ Arjun: ${aCount} expenses`);

  // ── 8. Income (main user) ─────────────────────────────────────────────────

  console.log('\n💰 Creating income records…');

  const incomeRecords = [
    // Salary — last 3 months
    { title: 'Salary – June 2026',    amount: 120000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd',  date: daysAgo(1),  accountId: hdfcSavings?.id, note: 'Monthly salary + performance bonus' },
    { title: 'Salary – May 2026',     amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd',  date: daysAgo(31), accountId: hdfcSavings?.id },
    { title: 'Salary – April 2026',   amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd',  date: daysAgo(61), accountId: hdfcSavings?.id },
    // Freelance
    { title: 'Freelance – UI Design', amount: 35000,  category: 'FREELANCE', source: 'TechStartup Inc',   date: daysAgo(10), accountId: icicCurrent?.id, tags: ['freelance','design'] },
    { title: 'Freelance – Web Dev',   amount: 28000,  category: 'FREELANCE', source: 'Verve Digital',      date: daysAgo(42), accountId: icicCurrent?.id, tags: ['freelance'] },
    { title: 'Freelance – Branding',  amount: 18000,  category: 'FREELANCE', source: 'CloudBridge Co',    date: daysAgo(68), accountId: icicCurrent?.id },
    // Other
    { title: 'GST Refund',            amount: 4200,   category: 'REFUND',    source: 'Income Tax Dept',   date: daysAgo(20), note: 'AY 2024-25 refund' },
    { title: 'Zerodha Dividend',      amount: 1840,   category: 'INVESTMENT',source: 'Zerodha',           date: daysAgo(35), accountId: hdfcSavings?.id },
    { title: 'Cashback – Amazon Pay', amount: 340,    category: 'OTHER',     source: 'Amazon Pay',        date: daysAgo(5),  accountId: paytmWallet?.id },
    { title: 'Rent from PG Room',     amount: 8000,   category: 'RENTAL',    source: 'Sublet – Room 2',   date: daysAgo(28), accountId: hdfcSavings?.id, note: 'Sublet for 1 month' },
  ];

  let incomeCount = 0;
  for (const rec of incomeRecords) {
    const { accountId, ...rest } = rec;
    await income(mainA, mainI, { ...rest, accountId: accountId || null });
    incomeCount++;
    await sleep(60);
  }
  console.log(`  ✅ Main: ${incomeCount} income records`);

  // ── 9. Subscriptions (main user) ─────────────────────────────────────────

  console.log('\n🔔 Creating subscriptions…');

  const subs = [
    { name: 'Netflix',         amount: 649,  billingCycle: 'MONTHLY',    nextDueDate: dateStr(2),  category: 'Entertainment', logo: '🎬', isAutoPay: true,  note: 'Standard HD plan' },
    { name: 'Spotify Premium', amount: 119,  billingCycle: 'MONTHLY',    nextDueDate: dateStr(8),  category: 'Entertainment', logo: '🎵', isAutoPay: true },
    { name: 'YouTube Premium', amount: 189,  billingCycle: 'MONTHLY',    nextDueDate: dateStr(15), category: 'Entertainment', logo: '▶️', isAutoPay: true },
    { name: 'Zomato Gold',     amount: 299,  billingCycle: 'MONTHLY',    nextDueDate: dateStr(20), category: 'Food',          logo: '🍕', isAutoPay: false },
    { name: 'Notion Pro',      amount: 1600, billingCycle: 'YEARLY',     nextDueDate: dateStr(-30),category: 'Education',     logo: '📓', note: 'Team plan' },
    { name: 'Adobe CC',        amount: 1675, billingCycle: 'MONTHLY',    nextDueDate: dateStr(5),  category: 'Education',     logo: '🎨', isAutoPay: true,  note: 'Photography plan' },
    { name: 'Jio Postpaid',    amount: 799,  billingCycle: 'MONTHLY',    nextDueDate: dateStr(12), category: 'Bills',         logo: '📡', isAutoPay: true },
    { name: 'GitHub Pro',      amount: 800,  billingCycle: 'MONTHLY',    nextDueDate: dateStr(25), category: 'Education',     logo: '🐙', note: 'Copilot included' },
  ];

  const existingSubs = await mainA.get('/api/subscriptions');
  const existingSubNames = new Set(existingSubs.map(s => s.name));
  let subCount = 0;
  for (const sub of subs) {
    if (existingSubNames.has(sub.name)) continue;
    await tryPost(mainA, '/api/subscriptions', sub, `sub ${sub.name}`);
    subCount++;
    await sleep(60);
  }
  console.log(`  ✅ Main: ${subCount} subscriptions (${existingSubs.length} already existed)`);

  // ── 10. Financial Goals (main user) ──────────────────────────────────────

  console.log('\n🎯 Creating financial goals…');

  const goals = [
    { name: 'Emergency Fund',    emoji: '🛡️', targetAmount: 300000, savedAmount: 95000,  color: 'emerald', deadline: null,             note: '6 months of expenses' },
    { name: 'Goa Trip 2026',     emoji: '🏖️', targetAmount: 50000,  savedAmount: 12000,  color: 'blue',    deadline: dateStr(-180),    note: 'October trip with friends' },
    { name: 'MacBook Pro M4',    emoji: '💻', targetAmount: 150000, savedAmount: 45000,  color: 'purple',  deadline: dateStr(-270),    note: 'For work + freelance' },
    { name: 'Car Down Payment',  emoji: '🚗', targetAmount: 200000, savedAmount: 30000,  color: 'orange',  deadline: dateStr(-365),    note: 'Honda City or similar' },
    { name: 'Wedding Fund',      emoji: '💍', targetAmount: 500000, savedAmount: 80000,  color: 'rose',    deadline: null,             note: 'Long-term savings' },
  ];

  const existingGoals = await mainA.get('/api/financial-goals');
  const existingGoalNames = new Set(existingGoals.map(g => g.name));
  let goalCount = 0;
  for (const goal of goals) {
    if (existingGoalNames.has(goal.name)) continue;
    await tryPost(mainA, '/api/financial-goals', goal, `goal ${goal.name}`);
    goalCount++;
    await sleep(60);
  }
  console.log(`  ✅ Main: ${goalCount} financial goals`);

  // ── 11. Groups ────────────────────────────────────────────────────────────

  console.log('\n👫 Creating groups…');

  async function getOrCreateGroup(api, data) {
    const list = await api.get('/api/groups');
    const found = list.find(g => g.name === data.name);
    if (found) return found;
    return tryPost(api, '/api/groups', data, `group ${data.name}`);
  }

  const goaGroup = await getOrCreateGroup(mainA, {
    name: 'Goa Trip 2025', icon: '🏖️', type: 'TRIP',
    members: [
      { userId: rahulS.user.id, name: 'Rahul Sharma', email: rahulS.email },
      { userId: priyaS.user.id, name: 'Priya Patel',  email: priyaS.email },
      { userId: arjunS.user.id, name: 'Arjun Mehta',  email: arjunS.email },
    ],
  });

  const flatGroup = await getOrCreateGroup(mainA, {
    name: 'Flat 4B', icon: '🏠', type: 'HOME',
    members: [
      { userId: rahulS.user.id, name: 'Rahul Sharma', email: rahulS.email },
      { userId: priyaS.user.id, name: 'Priya Patel',  email: priyaS.email },
    ],
  });

  const officeGroup = await getOrCreateGroup(mainA, {
    name: 'Office Squad', icon: '💼', type: 'WORK',
    members: [
      { userId: rahulS.user.id, name: 'Rahul Sharma', email: rahulS.email },
      { userId: arjunS.user.id, name: 'Arjun Mehta',  email: arjunS.email },
    ],
  });

  console.log(`  ✅ Groups: Goa Trip, Flat 4B, Office Squad`);

  // ── 12. Group expenses ────────────────────────────────────────────────────

  console.log('\n💳 Adding group expenses…');

  if (goaGroup?.id) {
    const g = await mainA.get(`/api/groups/${goaGroup.id}`);
    const gMain  = mid(g, mainS.user.id);
    const gRahul = mid(g, rahulS.user.id);
    const gPriya = mid(g, priyaS.user.id);
    const gArjun = mid(g, arjunS.user.id);
    const goaExps = [
      { title: 'Hotel Calangute (3 nights)', amount: 18000, paidBy: gMain,  date: daysAgo(90) },
      { title: 'Air India BLR–GOI Flights',  amount: 22400, paidBy: gRahul, date: daysAgo(92), note: '4 return tickets' },
      { title: 'Rental Bikes (2 days)',       amount: 3200,  paidBy: gArjun, date: daysAgo(88) },
      { title: 'Baga Beach Seafood Dinner',  amount: 5600,  paidBy: gMain,  date: daysAgo(89) },
      { title: 'Dudhsagar Falls Tour',        amount: 4800,  paidBy: gPriya, date: daysAgo(87) },
      { title: 'Club Cubana Night',           amount: 6000,  paidBy: gRahul, date: daysAgo(88), note: '4 entry + drinks' },
      { title: 'Anjuna Flea Market',          amount: 3400,  paidBy: gMain,  date: daysAgo(87) },
      { title: 'Airport Taxi',                amount: 1200,  paidBy: gArjun, date: daysAgo(92) },
    ];
    let n = 0;
    for (const e of goaExps) { if (e.paidBy) { await groupExp(mainA, goaGroup.id, e); n++; await sleep(100); } }
    try { await mainA.post(`/api/groups/${goaGroup.id}/settlements`, { fromMemberId: gArjun, toMemberId: gRahul, amount: 2500, note: 'Partial flights' }); } catch { /* skip */ }
    console.log(`  ✅ Goa Trip: ${n} expenses + 1 settlement`);
  }

  if (flatGroup?.id) {
    const g = await mainA.get(`/api/groups/${flatGroup.id}`);
    const fMain  = mid(g, mainS.user.id);
    const fRahul = mid(g, rahulS.user.id);
    const fPriya = mid(g, priyaS.user.id);
    const flatExps = [
      { title: 'May Rent',            amount: 45000, paidBy: fMain,  date: daysAgo(45), note: '3-BHK Koramangala' },
      { title: 'Grocery – May',       amount: 8500,  paidBy: fRahul, date: daysAgo(35) },
      { title: 'ACT Internet',        amount: 1299,  paidBy: fMain,  date: daysAgo(32) },
      { title: 'Gas Cylinders (×2)',  amount: 1800,  paidBy: fPriya, date: daysAgo(28) },
      { title: 'Maid Salary – May',   amount: 3000,  paidBy: fMain,  date: daysAgo(40) },
      { title: 'June Rent',           amount: 45000, paidBy: fMain,  date: daysAgo(10), note: '3-BHK Koramangala' },
      { title: 'Grocery – June',      amount: 7200,  paidBy: fPriya, date: daysAgo(5) },
    ];
    let n = 0;
    for (const e of flatExps) { if (e.paidBy) { await groupExp(mainA, flatGroup.id, e); n++; await sleep(100); } }
    console.log(`  ✅ Flat 4B: ${n} expenses`);
  }

  if (officeGroup?.id) {
    const g = await mainA.get(`/api/groups/${officeGroup.id}`);
    const oMain  = mid(g, mainS.user.id);
    const oRahul = mid(g, rahulS.user.id);
    const oArjun = mid(g, arjunS.user.id);
    const officeExps = [
      { title: 'Team Lunch – MTR',      amount: 2400,  paidBy: oMain,  date: daysAgo(6) },
      { title: 'Markers & Whiteboard',  amount: 450,   paidBy: oArjun, date: daysAgo(18) },
      { title: 'Client Dinner – Toit',  amount: 8500,  paidBy: oMain,  date: daysAgo(25), note: 'Client entertainment' },
      { title: 'Office Chai & Biscuits',amount: 680,   paidBy: oRahul, date: daysAgo(3) },
      { title: 'Team Swiggy Order',     amount: 1850,  paidBy: oMain,  date: daysAgo(11) },
      { title: 'Printer Cartridge',     amount: 1200,  paidBy: oArjun, date: daysAgo(30) },
    ];
    let n = 0;
    for (const e of officeExps) { if (e.paidBy) { await groupExp(mainA, officeGroup.id, e); n++; await sleep(100); } }
    console.log(`  ✅ Office Squad: ${n} expenses`);
  }

  // ── 13. Budgets ───────────────────────────────────────────────────────────

  console.log('\n📊 Setting budgets…');

  const mainBudgets = [
    ['Food', 15000], ['Grocery', 10000], ['Transport', 5000], ['Shopping', 12000],
    ['Entertainment', 8000], ['Bills', 6000], ['Travel', 20000], ['Medical', 4000], ['Fitness', 3000],
  ];
  let bCount = 0;
  for (const [cat, amt] of mainBudgets) {
    if (!mainCats[cat]) continue;
    try { await mainA.put(`/api/budgets/${mainCats[cat]}`, { amount: amt }); bCount++; } catch { /* already set */ }
  }
  console.log(`  ✅ Main: ${bCount} budgets`);

  for (const [cat, amt] of [['Food', 8000], ['Grocery', 6000], ['Transport', 3000], ['Bills', 4000]]) {
    if (!rahulCats[cat]) continue;
    try { await rahulA.put(`/api/budgets/${rahulCats[cat]}`, { amount: amt }); } catch { /* skip */ }
  }
  for (const [cat, amt] of [['Shopping', 10000], ['Food', 6000], ['Fitness', 5000]]) {
    if (!priyaCats[cat]) continue;
    try { await priyaA.put(`/api/budgets/${priyaCats[cat]}`, { amount: amt }); } catch { /* skip */ }
  }
  console.log('  ✅ Rahul + Priya budgets set');

  // ── 14. Savings goals ─────────────────────────────────────────────────────

  console.log('\n🐷 Savings goals…');
  try { await mainA.put('/api/savings-goal',  { monthlyIncome: 120000, monthlySavings: 30000 }); console.log('  ✅ Main: ₹1.2L income → ₹30k savings'); } catch { /* skip */ }
  try { await rahulA.put('/api/savings-goal', { monthlyIncome: 80000,  monthlySavings: 15000 }); console.log('  ✅ Rahul: ₹80k → ₹15k savings'); } catch { /* skip */ }
  try { await arjunA.put('/api/savings-goal', { monthlyIncome: 65000,  monthlySavings: 10000 }); console.log('  ✅ Arjun: ₹65k → ₹10k savings'); } catch { /* skip */ }

  // ── 15. Loans ─────────────────────────────────────────────────────────────

  console.log('\n🏦 Creating loans…');

  async function createLoan(api, data, paidMonths) {
    try {
      const loan = await api.post('/api/loans', data);
      for (let m = 1; m <= paidMonths; m++) {
        try { await api.post(`/api/loans/${loan.id}/payments/${m}`, {}); } catch { /* skip */ }
        await sleep(30);
      }
      console.log(`  ✅ ${data.name}: ${paidMonths} EMIs paid`);
      return loan;
    } catch (e) {
      console.error(`  ❌ Loan ${data.name}:`, e.data?.error || e.message);
    }
  }

  await createLoan(mainA, { name: 'Home Loan – SBI',      principal: 5000000, interestRate: 8.5,  tenureMonths: 240, startDate: '2024-01-15' }, 17);
  await createLoan(mainA, { name: 'Car Loan – HDFC',       principal: 800000,  interestRate: 9.0,  tenureMonths: 60,  startDate: '2025-03-01' }, 3);
  await createLoan(mainA, { name: 'Personal Loan – Bajaj', principal: 200000,  interestRate: 12.0, tenureMonths: 24,  startDate: '2026-01-01' }, 5);

  // ── 17. Recurring expenses (main user) ───────────────────────────────────

  console.log('\n🔁 Creating recurring expenses…');

  const nextMonth = (d = 1) => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(d);
    return date.toISOString().slice(0, 10);
  };

  const recurringList = [
    { title: 'Netflix',          amount: 649,  categoryId: mainCats['Entertainment'], paymentTypeId: mainPts['Credit Card'], frequency: 'MONTHLY', nextDueDate: nextMonth(5) },
    { title: 'Spotify Premium',  amount: 119,  categoryId: mainCats['Entertainment'], paymentTypeId: mainPts['Credit Card'], frequency: 'MONTHLY', nextDueDate: nextMonth(8) },
    { title: 'Jio Recharge',     amount: 999,  categoryId: mainCats['Bills'],         paymentTypeId: mainPts['UPI'],         frequency: 'MONTHLY', nextDueDate: nextMonth(12) },
    { title: 'Gym Membership',   amount: 1200, categoryId: mainCats['Fitness'],       paymentTypeId: mainPts['Cash'],        frequency: 'MONTHLY', nextDueDate: nextMonth(1) },
  ];

  const existingRecurring = await mainA.get('/api/recurring');
  const existingRecTitles = new Set(existingRecurring.map(r => r.title));
  let recCount = 0;
  for (const rec of recurringList) {
    if (existingRecTitles.has(rec.title)) continue;
    await tryPost(mainA, '/api/recurring', rec, `recurring ${rec.title}`);
    recCount++;
    await sleep(50);
  }
  console.log(`  ✅ Main: ${recCount} recurring expenses`);

  // ── 18. Assets ───────────────────────────────────────────────────────────

  console.log('\n📈 Creating assets…');

  const assets = [
    { name: 'Zerodha Portfolio', emoji: '📊', type: 'INVESTMENT', value: 285000, note: 'Equity + mutual funds' },
    { name: 'PPF Account',       emoji: '🏛️', type: 'INVESTMENT', value: 120000, note: 'Annual contribution ₹50k' },
    { name: 'Honda Activa',      emoji: '🛵', type: 'VEHICLE',    value: 65000,  note: '2022 model, depreciated' },
    { name: 'Gold (10g)',        emoji: '🥇', type: 'OTHER',      value: 72000,  note: 'Stored at home' },
  ];

  const existingAssets = await mainA.get('/api/assets');
  const existingAssetNames = new Set(existingAssets.map(a => a.name));
  let assetCount = 0;
  for (const asset of assets) {
    if (existingAssetNames.has(asset.name)) continue;
    await tryPost(mainA, '/api/assets', asset, `asset ${asset.name}`);
    assetCount++;
    await sleep(50);
  }
  console.log(`  ✅ Main: ${assetCount} assets`);

  // ── Done ──────────────────────────────────────────────────────────────────

  console.log(`
╔══════════════════════════════════════════════════════════╗
║        🎉  HisabKitab Demo Seed v2 Complete!             ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  MAIN ACCOUNT (Google sign-in)                           ║
║  ✉  hisabkitab.notify@gmail.com                          ║
║  📦 30 expenses, 10 income, 8 subscriptions              ║
║  🎯 5 financial goals, 9 budgets, 4 recurring            ║
║  🏦 5 accounts, 3 loans, 7 templates, 4 assets           ║
║  👥 Groups: Goa Trip, Flat 4B, Office Squad              ║
║                                                          ║
║  DEMO ACCOUNT 1                                          ║
║  ✉  rahul@hisabkitab.demo   🔑  Demo@1234               ║
║                                                          ║
║  DEMO ACCOUNT 2                                          ║
║  ✉  priya@hisabkitab.demo   🔑  Demo@1234               ║
║                                                          ║
║  DEMO ACCOUNT 3                                          ║
║  ✉  arjun@hisabkitab.demo   🔑  Demo@1234               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Seed failed:', e.message);
  if (e.data) console.error('API error:', JSON.stringify(e.data, null, 2));
  process.exit(1);
});
