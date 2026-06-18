// seed-demo.js — Demo data seeder for HisabKitab
// Run from Backend/: node seed-demo.js

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

// ── tiny HTTP helpers (native fetch, Node 20) ────────────────────────────────

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
  return {
    async get(path) {
      const r = await fetch(`${BASE}${path}`, { headers: h });
      const d = await r.json();
      if (!r.ok) throw Object.assign(new Error(`GET ${path} → ${r.status}`), { data: d });
      return d;
    },
    async post(path, body = {}) {
      const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw Object.assign(new Error(`POST ${path} → ${r.status}`), { data: d });
      return d;
    },
    async put(path, body = {}) {
      const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers: h, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw Object.assign(new Error(`PUT ${path} → ${r.status}`), { data: d });
      return d;
    },
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// ── Firebase auth helpers ────────────────────────────────────────────────────

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

// ── person helper ─────────────────────────────────────────────────────────────

async function upsertPerson(api, name, email) {
  const all = await api.get('/api/people');
  const found = all.find(p => p.name === name);
  if (found) return found;
  return api.post('/api/people', { name, email });
}

// ── expense helper ────────────────────────────────────────────────────────────

async function exp(api, info, data) {
  try {
    return await api.post('/api/expenses', {
      amount:         data.amount,
      currency:       'INR',
      title:          data.title,
      note:           data.note || null,
      expenseDate:    data.date,
      categoryId:     info.cats[data.cat] || null,
      paymentTypeId:  info.pts[data.pt]  || Object.values(info.pts)[0],
      peopleIds:      (data.splitWith || []).filter(Boolean),
      paidForPersonId: data.paidFor || null,
      tags:           data.tags || [],
    });
  } catch (e) {
    console.error(`  ❌ expense "${data.title}": ${e.data?.error || e.message}`);
    return null;
  }
}

// ── group expense helper ──────────────────────────────────────────────────────

async function groupExp(api, groupId, data) {
  try {
    return await api.post(`/api/groups/${groupId}/expenses`, {
      title:          data.title,
      amount:         data.amount,
      note:           data.note || null,
      expenseDate:    data.date,
      paidByMemberId: data.paidBy,
      splitType:      'EQUAL',
    });
  } catch (e) {
    console.error(`  ❌ group expense "${data.title}": ${e.data?.error || e.message}`);
    return null;
  }
}

function mid(group, userId) {
  return group.members?.find(m => m.userId === userId)?.id;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  HisabKitab Demo Seeder starting…\n');

  // ── 1. Firebase users ────────────────────────────────────────────────────

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
  console.log(`  ✅ Main (${MAIN_EMAIL})`);

  const demoSessions = [];
  for (const acc of DEMO_ACCOUNTS) {
    const idToken = await firebaseEmailSignIn(acc.email, acc.password);
    const session = await backendLogin(idToken);
    demoSessions.push({ ...acc, ...session });
    console.log(`  ✅ ${acc.name} (${acc.email})`);
    await sleep(200);
  }

  const allSessions = [
    { name: 'Aditya', email: MAIN_EMAIL, ...mainSession },
    ...demoSessions,
  ];
  const [mainS, rahulS, priyaS, arjunS] = allSessions;

  const [mainA, rahulA, priyaA, arjunA] = allSessions.map(s => makeApi(s.jwt));

  // ── 3. Categories & payment types ───────────────────────────────────────

  console.log('\n📂 Loading categories & payment types…');
  const infos = [];
  for (let i = 0; i < allSessions.length; i++) {
    const a = [mainA, rahulA, priyaA, arjunA][i];
    const [catList, ptList] = await Promise.all([a.get('/api/categories'), a.get('/api/payment-types')]);
    const cats = Object.fromEntries(catList.map(c => [c.name, c.id]));
    const pts  = Object.fromEntries(ptList.map(p => [p.name, p.id]));
    infos.push({ ...allSessions[i], cats, pts });
    await sleep(100);
  }
  const [mainI, rahulI, priyaI, arjunI] = infos;
  console.log('  ✅ Done');

  // ── 4. People connections ────────────────────────────────────────────────

  console.log('\n👥 Creating people connections…');

  const mP = {
    rahul: await upsertPerson(mainA, 'Rahul Sharma', rahulS.email),
    priya: await upsertPerson(mainA, 'Priya Patel',  priyaS.email),
    arjun: await upsertPerson(mainA, 'Arjun Mehta',  arjunS.email),
  };
  console.log(`  ✅ Main's people: Rahul(${!!mP.rahul?.linkedUserId}) Priya(${!!mP.priya?.linkedUserId}) Arjun(${!!mP.arjun?.linkedUserId})`);

  const rP = {
    aditya: await upsertPerson(rahulA, 'Aditya',       mainS.email),
    priya:  await upsertPerson(rahulA, 'Priya Patel',  priyaS.email),
    arjun:  await upsertPerson(rahulA, 'Arjun Mehta',  arjunS.email),
  };
  console.log(`  ✅ Rahul's people: Aditya(${!!rP.aditya?.linkedUserId}) Priya(${!!rP.priya?.linkedUserId}) Arjun(${!!rP.arjun?.linkedUserId})`);

  const pP = {
    aditya: await upsertPerson(priyaA, 'Aditya',        mainS.email),
    rahul:  await upsertPerson(priyaA, 'Rahul Sharma',  rahulS.email),
    arjun:  await upsertPerson(priyaA, 'Arjun Mehta',   arjunS.email),
  };
  console.log(`  ✅ Priya's people: Aditya(${!!pP.aditya?.linkedUserId}) Rahul(${!!pP.rahul?.linkedUserId}) Arjun(${!!pP.arjun?.linkedUserId})`);

  const aP = {
    aditya: await upsertPerson(arjunA, 'Aditya',        mainS.email),
    rahul:  await upsertPerson(arjunA, 'Rahul Sharma',  rahulS.email),
    priya:  await upsertPerson(arjunA, 'Priya Patel',   priyaS.email),
  };
  console.log(`  ✅ Arjun's people: Aditya(${!!aP.aditya?.linkedUserId}) Rahul(${!!aP.rahul?.linkedUserId}) Priya(${!!aP.priya?.linkedUserId})`);

  // ── 5. Individual expenses ───────────────────────────────────────────────

  console.log('\n💸 Creating individual expenses…');

  // ── MAIN ──
  await exp(mainA, mainI, { title: 'Dinner at The Table',     amount: 3600,  cat: 'Food',          pt: 'UPI',          date: daysAgo(5),  splitWith: [mP.rahul?.id, mP.priya?.id, mP.arjun?.id], note: 'Post-launch team dinner', tags: ['dinner','team'] });
  await exp(mainA, mainI, { title: 'Movie Night – Kalki 2898', amount: 2400, cat: 'Entertainment',  pt: 'Credit Card',  date: daysAgo(12), splitWith: [mP.rahul?.id, mP.priya?.id], note: '3 tickets + IMAX' });
  await exp(mainA, mainI, { title: 'BigBasket Monthly Order',  amount: 2200, cat: 'Grocery',        pt: 'UPI',          date: daysAgo(8),  splitWith: [mP.rahul?.id] });
  await exp(mainA, mainI, { title: 'Ola Cab to Airport',       amount: 850,  cat: 'Transport',      pt: 'UPI',          date: daysAgo(15), splitWith: [mP.arjun?.id] });
  await exp(mainA, mainI, { title: 'Birthday Party Setup',     amount: 6500, cat: 'Entertainment',  pt: 'Credit Card',  date: daysAgo(22), splitWith: [mP.priya?.id, mP.arjun?.id], note: 'Cake + decorations + gifts', tags: ['party'] });
  await exp(mainA, mainI, { title: 'BESCOM Electricity – Jun', amount: 2180, cat: 'Bills',          pt: 'UPI',          date: daysAgo(3),  note: 'June electricity bill' });
  await exp(mainA, mainI, { title: 'Phoenix Mall Shopping',    amount: 8450, cat: 'Shopping',       pt: 'Credit Card',  date: daysAgo(18), note: 'Clothes + shoes', tags: ['shopping','festive'] });
  await exp(mainA, mainI, { title: 'Cult.fit 3-Month Plan',    amount: 3000, cat: 'Medical',        pt: 'UPI',          date: daysAgo(30) });
  await exp(mainA, mainI, { title: 'Netflix Annual Plan',      amount: 1499, cat: 'Entertainment',  pt: 'Credit Card',  date: daysAgo(45) });
  await exp(mainA, mainI, { title: 'Swiggy Dinner',            amount: 720,  cat: 'Food',           pt: 'UPI',          date: daysAgo(2) });
  await exp(mainA, mainI, { title: 'IndiGo BLR–BOM Flight',   amount: 4200, cat: 'Travel',         pt: 'Credit Card',  date: daysAgo(60), note: 'Work trip to Mumbai', tags: ['travel','work'] });
  await exp(mainA, mainI, { title: 'HP Petrol Pump',           amount: 3500, cat: 'Fuel',           pt: 'Cash',         date: daysAgo(7) });
  await exp(mainA, mainI, { title: 'Apollo Pharmacy',          amount: 640,  cat: 'Medical',        pt: 'UPI',          date: daysAgo(10) });
  await exp(mainA, mainI, { title: 'Udemy React Native Course',amount: 499,  cat: 'Education',      pt: 'Credit Card',  date: daysAgo(25) });
  await exp(mainA, mainI, { title: 'Noise Smartwatch',         amount: 4999, cat: 'Shopping',       pt: 'Debit Card',   date: daysAgo(40), tags: ['gadgets'] });
  await exp(mainA, mainI, { title: 'ACT Fibernet – Jun',       amount: 999,  cat: 'Bills',          pt: 'UPI',          date: daysAgo(4) });
  await exp(mainA, mainI, { title: 'Zomato Gold Lunch',        amount: 380,  cat: 'Food',           pt: 'UPI',          date: daysAgo(1) });
  await exp(mainA, mainI, { title: 'BMTC Bus Pass',            amount: 600,  cat: 'Transport',      pt: 'Cash',         date: daysAgo(33) });
  console.log('  ✅ Main: 18 expenses');

  // ── RAHUL ──
  await exp(rahulA, rahulI, { title: 'Nandi Hills Petrol',      amount: 1200, cat: 'Fuel',          pt: 'Cash',         date: daysAgo(14), splitWith: [rP.aditya?.id], note: 'Road trip fuel split' });
  await exp(rahulA, rahulI, { title: 'CCD Lunch with Aditya',   amount: 640,  cat: 'Food',          pt: 'UPI',          date: daysAgo(9),  splitWith: [rP.aditya?.id] });
  await exp(rahulA, rahulI, { title: 'Apartment Electricity',   amount: 3400, cat: 'Bills',         pt: 'UPI',          date: daysAgo(5),  splitWith: [rP.aditya?.id], note: 'May + June combined' });
  await exp(rahulA, rahulI, { title: 'Blinkit Groceries',       amount: 1850, cat: 'Grocery',       pt: 'UPI',          date: daysAgo(3) });
  await exp(rahulA, rahulI, { title: 'Rapido Rides – Week',     amount: 420,  cat: 'Transport',     pt: 'UPI',          date: daysAgo(6) });
  await exp(rahulA, rahulI, { title: 'Myntra Kurtas',           amount: 2800, cat: 'Shopping',      pt: 'Credit Card',  date: daysAgo(20), tags: ['clothes'] });
  await exp(rahulA, rahulI, { title: 'Zomato Weekend Order',    amount: 890,  cat: 'Food',          pt: 'UPI',          date: daysAgo(2) });
  await exp(rahulA, rahulI, { title: 'Jio Recharge',            amount: 999,  cat: 'Bills',         pt: 'UPI',          date: daysAgo(28) });
  await exp(rahulA, rahulI, { title: 'Dominos with Arjun',      amount: 1200, cat: 'Food',          pt: 'UPI',          date: daysAgo(4),  splitWith: [rP.arjun?.id] });
  console.log('  ✅ Rahul: 9 expenses');

  // ── PRIYA ──
  await exp(priyaA, priyaI, { title: 'Kairali Spa Day',          amount: 4000, cat: 'Medical',       pt: 'Credit Card',  date: daysAgo(20), splitWith: [pP.aditya?.id], note: 'Indiranagar spa', tags: ['wellness'] });
  await exp(priyaA, priyaI, { title: 'Coast Restaurant Dinner',  amount: 2800, cat: 'Food',          pt: 'UPI',          date: daysAgo(11), splitWith: [pP.aditya?.id] });
  await exp(priyaA, priyaI, { title: 'H&M Koramangala',          amount: 5200, cat: 'Shopping',      pt: 'Credit Card',  date: daysAgo(16), tags: ['clothes'] });
  await exp(priyaA, priyaI, { title: 'Nykaa Beauty Order',       amount: 1450, cat: 'Shopping',      pt: 'UPI',          date: daysAgo(8) });
  await exp(priyaA, priyaI, { title: 'Yoga Studio Membership',   amount: 2500, cat: 'Medical',       pt: 'UPI',          date: daysAgo(30) });
  await exp(priyaA, priyaI, { title: 'Auto Share with Rahul',    amount: 480,  cat: 'Transport',     pt: 'Cash',         date: daysAgo(4),  splitWith: [pP.rahul?.id] });
  await exp(priyaA, priyaI, { title: 'Amazon Prime Annual',      amount: 1499, cat: 'Entertainment', pt: 'Credit Card',  date: daysAgo(40) });
  await exp(priyaA, priyaI, { title: 'Swiggy Lunch',             amount: 340,  cat: 'Food',          pt: 'UPI',          date: daysAgo(1) });
  await exp(priyaA, priyaI, { title: 'Westside Dress',           amount: 3200, cat: 'Shopping',      pt: 'Debit Card',   date: daysAgo(55), tags: ['festive'] });
  console.log('  ✅ Priya: 9 expenses');

  // ── ARJUN ──
  await exp(arjunA, arjunI, { title: 'SG Cricket Kit',            amount: 5600, cat: 'Shopping',      pt: 'Debit Card',   date: daysAgo(17), splitWith: [aP.aditya?.id], note: 'Bat + pads + helmet', tags: ['sports','cricket'] });
  await exp(arjunA, arjunI, { title: 'Office Supplies – Split',   amount: 1200, cat: 'Bills',         pt: 'Cash',         date: daysAgo(13), splitWith: [aP.aditya?.id] });
  await exp(arjunA, arjunI, { title: 'Dominos Post-match',        amount: 1800, cat: 'Food',          pt: 'UPI',          date: daysAgo(4),  splitWith: [aP.rahul?.id],  note: 'Won the match!' });
  await exp(arjunA, arjunI, { title: 'Ola Monthly Subscription',  amount: 899,  cat: 'Transport',     pt: 'UPI',          date: daysAgo(2) });
  await exp(arjunA, arjunI, { title: 'boAt Earbuds 131',          amount: 2999, cat: 'Shopping',      pt: 'Credit Card',  date: daysAgo(35), tags: ['gadgets'] });
  await exp(arjunA, arjunI, { title: 'Full-body Checkup',         amount: 850,  cat: 'Medical',       pt: 'Cash',         date: daysAgo(23) });
  await exp(arjunA, arjunI, { title: 'BPCL Petrol',               amount: 2800, cat: 'Fuel',          pt: 'Cash',         date: daysAgo(6) });
  await exp(arjunA, arjunI, { title: 'IPL Match Tickets',         amount: 3600, cat: 'Entertainment', pt: 'Credit Card',  date: daysAgo(48), splitWith: [aP.rahul?.id, aP.priya?.id], tags: ['cricket','ipl'] });
  console.log('  ✅ Arjun: 8 expenses');

  // ── 6. Groups ────────────────────────────────────────────────────────────

  console.log('\n👫 Creating groups…');

  async function getOrCreateGroup(api, data) {
    const list = await api.get('/api/groups');
    const found = list.find(g => g.name === data.name);
    if (found) { console.log(`  ♻️  ${data.name}`); return found; }
    const g = await api.post('/api/groups', data);
    console.log(`  ✅ ${data.name}`);
    return g;
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

  const weekendGroup = await getOrCreateGroup(rahulA, {
    name: 'Weekend Warriors', icon: '🎮', type: 'OTHER',
    members: [
      { userId: mainS.user.id,  name: 'Aditya',       email: mainS.email },
      { userId: priyaS.user.id, name: 'Priya Patel',  email: priyaS.email },
      { userId: arjunS.user.id, name: 'Arjun Mehta',  email: arjunS.email },
    ],
  });

  // ── 7. Group expenses ────────────────────────────────────────────────────

  console.log('\n💳 Adding group expenses…');

  // Goa Trip
  if (goaGroup?.id) {
    const g = await mainA.get(`/api/groups/${goaGroup.id}`);
    const gMain  = mid(g, mainS.user.id);
    const gRahul = mid(g, rahulS.user.id);
    const gPriya = mid(g, priyaS.user.id);
    const gArjun = mid(g, arjunS.user.id);
    const goaExps = [
      { title: 'Hotel Calangute (3 nights)', amount: 18000, paidBy: gMain,  date: daysAgo(90), note: 'Double rooms x2'    },
      { title: 'Air India BLR–GOI Flights',  amount: 22400, paidBy: gRahul, date: daysAgo(92), note: '4 return tickets'   },
      { title: 'Rental Bikes (2 days)',       amount: 3200,  paidBy: gArjun, date: daysAgo(88)                             },
      { title: 'Baga Beach Seafood Dinner',  amount: 5600,  paidBy: gMain,  date: daysAgo(89), note: 'Fresh catch!'       },
      { title: 'Dudhsagar Falls Tour',        amount: 4800,  paidBy: gPriya, date: daysAgo(87)                             },
      { title: 'Club Cubana Night',           amount: 6000,  paidBy: gRahul, date: daysAgo(88), note: '4 entry + drinks'  },
      { title: 'Anjuna Flea Market',          amount: 3400,  paidBy: gMain,  date: daysAgo(87)                             },
      { title: 'Airport Taxi',                amount: 1200,  paidBy: gArjun, date: daysAgo(92)                             },
    ];
    let n = 0;
    for (const e of goaExps) {
      if (e.paidBy) { await groupExp(mainA, goaGroup.id, e); n++; await sleep(120); }
    }
    // Partial settlement
    try {
      await mainA.post(`/api/groups/${goaGroup.id}/settlements`, {
        fromMemberId: gArjun, toMemberId: gRahul, amount: 2500, note: 'Partial flights settlement',
      });
    } catch { /* ignore */ }
    console.log(`  ✅ Goa Trip: ${n} expenses + 1 settlement`);
  }

  // Flat 4B
  if (flatGroup?.id) {
    const g = await mainA.get(`/api/groups/${flatGroup.id}`);
    const fMain  = mid(g, mainS.user.id);
    const fRahul = mid(g, rahulS.user.id);
    const fPriya = mid(g, priyaS.user.id);
    const flatExps = [
      { title: 'May Rent',            amount: 45000, paidBy: fMain,  date: daysAgo(45), note: '3-BHK Koramangala' },
      { title: 'Grocery – May',       amount: 8500,  paidBy: fRahul, date: daysAgo(35)                            },
      { title: 'ACT Internet',        amount: 1299,  paidBy: fMain,  date: daysAgo(32)                            },
      { title: 'Gas Cylinders (×2)',  amount: 1800,  paidBy: fPriya, date: daysAgo(28)                            },
      { title: 'Maid Salary – May',   amount: 3000,  paidBy: fMain,  date: daysAgo(40)                            },
      { title: 'June Rent',           amount: 45000, paidBy: fMain,  date: daysAgo(10), note: '3-BHK Koramangala' },
      { title: 'Grocery – June',      amount: 7200,  paidBy: fPriya, date: daysAgo(5)                             },
    ];
    let n = 0;
    for (const e of flatExps) {
      if (e.paidBy) { await groupExp(mainA, flatGroup.id, e); n++; await sleep(120); }
    }
    console.log(`  ✅ Flat 4B: ${n} expenses`);
  }

  // Office Squad
  if (officeGroup?.id) {
    const g = await mainA.get(`/api/groups/${officeGroup.id}`);
    const oMain  = mid(g, mainS.user.id);
    const oRahul = mid(g, rahulS.user.id);
    const oArjun = mid(g, arjunS.user.id);
    const officeExps = [
      { title: 'Team Lunch – MTR',     amount: 2400,  paidBy: oMain,  date: daysAgo(6)  },
      { title: 'Markers & Whiteboard', amount: 450,   paidBy: oArjun, date: daysAgo(18) },
      { title: 'Client Dinner – Toit', amount: 8500,  paidBy: oMain,  date: daysAgo(25), note: 'Client entertainment' },
      { title: 'Office Chai & Biscuits',amount: 680,  paidBy: oRahul, date: daysAgo(3)  },
      { title: 'Team Swiggy Order',    amount: 1850,  paidBy: oMain,  date: daysAgo(11) },
      { title: 'Printer Cartridge',    amount: 1200,  paidBy: oArjun, date: daysAgo(30) },
    ];
    let n = 0;
    for (const e of officeExps) {
      if (e.paidBy) { await groupExp(mainA, officeGroup.id, e); n++; await sleep(120); }
    }
    console.log(`  ✅ Office Squad: ${n} expenses`);
  }

  // Weekend Warriors
  if (weekendGroup?.id) {
    const g = await rahulA.get(`/api/groups/${weekendGroup.id}`);
    const wMain  = mid(g, mainS.user.id);
    const wRahul = mid(g, rahulS.user.id);
    const wPriya = mid(g, priyaS.user.id);
    const wArjun = mid(g, arjunS.user.id);
    const weekendExps = [
      { title: 'Bowling Alley – Smaaash',  amount: 3200,  paidBy: wRahul, date: daysAgo(20) },
      { title: 'Escape Room – Lockdown',   amount: 4800,  paidBy: wMain,  date: daysAgo(30), note: '60-min adventure' },
      { title: 'Go-Kart – Funjump',        amount: 2800,  paidBy: wArjun, date: daysAgo(40) },
      { title: 'KFC Post-game',            amount: 1480,  paidBy: wPriya, date: daysAgo(20) },
      { title: 'Laser Tag – Zone',         amount: 2400,  paidBy: wRahul, date: daysAgo(50) },
    ];
    let n = 0;
    for (const e of weekendExps) {
      if (e.paidBy) { await groupExp(rahulA, weekendGroup.id, e); n++; await sleep(120); }
    }
    console.log(`  ✅ Weekend Warriors: ${n} expenses`);
  }

  // ── 8. Budgets ───────────────────────────────────────────────────────────

  console.log('\n💰 Setting budgets…');

  const mainBudgets = [
    ['Food', 15000], ['Transport', 5000], ['Shopping', 12000],
    ['Entertainment', 8000], ['Bills', 6000], ['Grocery', 10000], ['Travel', 20000],
  ];
  for (const [cat, amt] of mainBudgets) {
    if (!mainI.cats[cat]) continue;
    try { await mainA.put(`/api/budgets/${mainI.cats[cat]}`, { amount: amt }); } catch { /* already set */ }
  }
  console.log('  ✅ Main: 7 budgets');

  const rahulBudgets = [['Food', 8000], ['Transport', 3000], ['Grocery', 6000], ['Bills', 4000]];
  for (const [cat, amt] of rahulBudgets) {
    if (!rahulI.cats[cat]) continue;
    try { await rahulA.put(`/api/budgets/${rahulI.cats[cat]}`, { amount: amt }); } catch { /* skip */ }
  }
  console.log('  ✅ Rahul: 4 budgets');

  const priyaBudgets = [['Shopping', 10000], ['Food', 6000], ['Medical', 5000]];
  for (const [cat, amt] of priyaBudgets) {
    if (!priyaI.cats[cat]) continue;
    try { await priyaA.put(`/api/budgets/${priyaI.cats[cat]}`, { amount: amt }); } catch { /* skip */ }
  }
  console.log('  ✅ Priya: 3 budgets');

  // ── 9. Savings goals ─────────────────────────────────────────────────────

  console.log('\n🎯 Savings goals…');
  try { await mainA.put('/api/savings-goal',  { monthlyIncome: 120000, monthlySavings: 30000 }); console.log('  ✅ Main: ₹1.2L → save ₹30k'); } catch { /* skip */ }
  try { await rahulA.put('/api/savings-goal', { monthlyIncome: 80000,  monthlySavings: 15000 }); console.log('  ✅ Rahul: ₹80k → save ₹15k'); } catch { /* skip */ }
  try { await arjunA.put('/api/savings-goal', { monthlyIncome: 65000,  monthlySavings: 10000 }); console.log('  ✅ Arjun: ₹65k → save ₹10k'); } catch { /* skip */ }

  // ── 10. Loans ────────────────────────────────────────────────────────────

  console.log('\n🏦 Creating loans…');

  async function createLoan(api, data, paidMonths) {
    try {
      const loan = await api.post('/api/loans', data);
      for (let m = 1; m <= paidMonths; m++) {
        try { await api.post(`/api/loans/${loan.id}/payments/${m}`, {}); } catch { /* skip */ }
        await sleep(40);
      }
      console.log(`  ✅ ${data.name}: ${paidMonths} EMIs paid`);
      return loan;
    } catch (e) {
      console.error(`  ❌ Loan ${data.name}:`, e.data?.error || e.message);
    }
  }

  await createLoan(mainA,  { name: 'Home Loan – SBI',       principal: 5000000, interestRate: 8.5,  tenureMonths: 240, startDate: '2024-01-15' }, 17);
  await createLoan(mainA,  { name: 'Car Loan – HDFC',        principal: 800000,  interestRate: 9.0,  tenureMonths: 60,  startDate: '2025-03-01' }, 3);
  await createLoan(mainA,  { name: 'Personal Loan – Bajaj',  principal: 200000,  interestRate: 12.0, tenureMonths: 24,  startDate: '2026-01-01' }, 5);
  await createLoan(arjunA, { name: 'Bike Loan – Axis Bank',  principal: 120000,  interestRate: 10.5, tenureMonths: 36,  startDate: '2025-09-01' }, 9);

  // ── Done ──────────────────────────────────────────────────────────────────

  console.log(`
╔══════════════════════════════════════════════════════╗
║            🎉  HisabKitab Demo Seed Done!            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  MAIN ACCOUNT (Google sign-in)                       ║
║  ✉  hisabkitab.notify@gmail.com                      ║
║                                                      ║
║  DEMO ACCOUNT 1                                      ║
║  ✉  rahul@hisabkitab.demo   🔑  Demo@1234            ║
║                                                      ║
║  DEMO ACCOUNT 2                                      ║
║  ✉  priya@hisabkitab.demo   🔑  Demo@1234            ║
║                                                      ║
║  DEMO ACCOUNT 3                                      ║
║  ✉  arjun@hisabkitab.demo   🔑  Demo@1234            ║
║                                                      ║
║  GROUPS CREATED                                      ║
║  🏖  Goa Trip 2025     (all 4)  8 expenses           ║
║  🏠  Flat 4B           (3)     7 expenses           ║
║  💼  Office Squad      (3)     6 expenses           ║
║  🎮  Weekend Warriors  (all 4)  5 expenses           ║
║                                                      ║
║  All accounts are people-linked to each other.       ║
║  Balances, splits, and budgets are live.             ║
╚══════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Seed failed:', e.message);
  if (e.data) console.error('API error:', e.data);
  process.exit(1);
});
