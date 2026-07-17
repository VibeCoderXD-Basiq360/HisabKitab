// seed-yeardata.js — 1-year backfill for hisabkitab.notify@gmail.com
// Adds Jul 2025 → Mar 2026 (months 4-12 ago; first 3 months covered by seed-demo.js)
// Run: node seed-yeardata.js

require('dotenv').config();
const admin = require('./src/config/firebase');

const WEB_API_KEY = 'AIzaSyAC8_1tmELIgt8BMhSQEj9cpPWXmZR_sks';
const BASE       = 'http://localhost:5000';
const MAIN_EMAIL = 'hisabkitab.notify@gmail.com';

// ── helpers ───────────────────────────────────────────────────────────────────

async function fpost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw Object.assign(new Error(`POST ${url} → ${r.status}`), { data: d });
  return d;
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
  return { get: p => req('GET', p), post: (p, b) => req('POST', p, b), put: (p, b) => req('PUT', p, b) };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Returns ISO string for a specific year-month-day
function dt(year, month, day, hour = 12) {
  return new Date(year, month - 1, day, hour, 0, 0).toISOString();
}

async function tryPost(api, path, body, label) {
  try { return await api.post(path, body); }
  catch (e) { console.error(`  ⚠ ${label}: ${e.data?.error || e.message}`); return null; }
}

async function addExpense(api, cats, pts, accs, data) {
  return tryPost(api, '/api/expenses', {
    amount:        data.amount,
    currency:      'INR',
    title:         data.title,
    note:          data.note || null,
    expenseDate:   data.date,
    categoryId:    cats[data.cat] || null,
    paymentTypeId: pts[data.pt] || Object.values(pts)[0],
    accountId:     data.acc ? accs[data.acc] : null,
    tags:          data.tags || [],
  }, `expense "${data.title}"`);
}

async function addIncome(api, data) {
  return tryPost(api, '/api/income', {
    amount:     data.amount,
    title:      data.title,
    category:   data.category || 'OTHER',
    source:     data.source || null,
    incomeDate: data.date,
    note:       data.note || null,
    accountId:  data.accountId || null,
  }, `income "${data.title}"`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📅  Year Backfill starting (Jul 2025 → Mar 2026)…\n');

  // Login
  const fbUser = await admin.auth().getUserByEmail(MAIN_EMAIL);
  const ct = await admin.auth().createCustomToken(fbUser.uid);
  const { idToken } = await fpost(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`,
    { token: ct, returnSecureToken: true }
  );
  const { token: jwt } = await fpost(`${BASE}/api/auth/login`, { token: idToken });
  const api = makeApi(jwt);
  console.log('✅ Logged in as', MAIN_EMAIL);

  // Fetch existing IDs
  const [catList, ptList, accList] = await Promise.all([
    api.get('/api/categories'),
    api.get('/api/payment-types'),
    api.get('/api/accounts'),
  ]);

  const cats = Object.fromEntries(catList.map(c => [c.name, c.id]));
  const pts  = Object.fromEntries(ptList.map(p  => [p.name, p.id]));
  const accByName = Object.fromEntries(accList.map(a => [a.name, a.id]));
  const accs = {
    savings: accByName['HDFC Savings'],
    current: accByName['ICICI Current'],
    cc:      accByName['HDFC Credit Card'],
    wallet:  accByName['Paytm Wallet'],
    cash:    accByName['Cash'],
  };

  console.log(`  Categories: ${catList.length}, Payment types: ${ptList.length}, Accounts: ${accList.length}`);

  // ── Month-by-month data ───────────────────────────────────────────────────
  // Format: { title, amount, cat, pt, acc?, date, note?, tags? }
  // Seasonal context:
  //   Jul 2025 - Monsoon, Guru Purnima
  //   Aug 2025 - Independence Day, Raksha Bandhan, Janmashtami
  //   Sep 2025 - Ganesh Chaturthi, end of monsoon
  //   Oct 2025 - Navratri, Dussehra, start festive season
  //   Nov 2025 - Diwali, heavy shopping/gifting
  //   Dec 2025 - Year-end, Christmas, New Year prep
  //   Jan 2026 - Republic Day, winter, New Year resolutions
  //   Feb 2026 - Valentine's, cold weather trailing
  //   Mar 2026 - Holi, end of FY

  const months = [

    // ── MARCH 2026 ────────────────────────────────────────────────────────────
    { income: [
        { title: 'Salary – March 2026',   amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2026,3,1),  accountId: accs.savings },
        { title: 'Freelance – App UI',    amount: 22000,  category: 'FREELANCE', source: 'PixelForge Studio', date: dt(2026,3,18), accountId: accs.current },
      ],
      expenses: [
        { title: 'Holi Colours & Supplies', amount: 1200,  cat: 'Entertainment', pt: 'Cash',        acc: 'cash',    date: dt(2026,3,24), tags: ['holi','festival'] },
        { title: 'Holi Party Snacks',        amount: 2400,  cat: 'Food',          pt: 'UPI',                         date: dt(2026,3,24), note: 'Party at Arjun\'s' },
        { title: 'BESCOM Electricity',       amount: 1680,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2026,3,5) },
        { title: 'ACT Fibernet',             amount: 999,   cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2026,3,6) },
        { title: 'BigBasket Order',          amount: 3100,  cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2026,3,10) },
        { title: 'Swiggy – Week Lunches',    amount: 1840,  cat: 'Food',          pt: 'UPI',                         date: dt(2026,3,14) },
        { title: 'Ola Cab – Daily Commute',  amount: 1200,  cat: 'Transport',     pt: 'UPI',                         date: dt(2026,3,16) },
        { title: 'Tax Consultant Fee',       amount: 3500,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2026,3,20), note: 'FY2025-26 filing' },
        { title: 'Cult.fit Monthly',         amount: 2000,  cat: 'Fitness',       pt: 'UPI',                         date: dt(2026,3,1) },
        { title: 'BPCL Petrol',              amount: 3200,  cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2026,3,12) },
        { title: 'Annual Health Checkup',    amount: 2800,  cat: 'Medical',       pt: 'Credit Card', acc: 'cc',      date: dt(2026,3,8), note: 'Apollo Diagnostics full body' },
        { title: 'Myntra Spring Collection', amount: 4200,  cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2026,3,22) },
        { title: 'Netflix',                  amount: 649,   cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2026,3,5) },
        { title: 'Spotify',                  amount: 119,   cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2026,3,8) },
        { title: 'Local Veggie Market',      amount: 560,   cat: 'Grocery',       pt: 'Cash',        acc: 'cash',    date: dt(2026,3,27) },
        { title: 'Adobe Creative Cloud',     amount: 1675,  cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2026,3,5) },
        { title: 'Zomato Dinner',            amount: 680,   cat: 'Food',          pt: 'UPI',                         date: dt(2026,3,29) },
      ],
    },

    // ── FEBRUARY 2026 ─────────────────────────────────────────────────────────
    { income: [
        { title: 'Salary – February 2026', amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2026,2,1),  accountId: accs.savings },
      ],
      expenses: [
        { title: 'Valentine\'s Dinner – Fatty Bao', amount: 4800, cat: 'Food',     pt: 'Credit Card', acc: 'cc',      date: dt(2026,2,14), note: 'Dinner for two', tags: ['date'] },
        { title: 'Flower Bouquet',                  amount: 800,  cat: 'Shopping',  pt: 'Cash',        acc: 'cash',    date: dt(2026,2,14) },
        { title: 'BESCOM Electricity',              amount: 1490, cat: 'Bills',     pt: 'UPI',         acc: 'savings', date: dt(2026,2,5) },
        { title: 'ACT Fibernet',                    amount: 999,  cat: 'Bills',     pt: 'UPI',         acc: 'savings', date: dt(2026,2,6) },
        { title: 'BigBasket Monthly',               amount: 2650, cat: 'Grocery',   pt: 'UPI',         acc: 'savings', date: dt(2026,2,8) },
        { title: 'Ola – Office Commute',            amount: 1100, cat: 'Transport', pt: 'UPI',                         date: dt(2026,2,18) },
        { title: 'Swiggy Orders',                   amount: 2200, cat: 'Food',      pt: 'UPI',                         date: dt(2026,2,20) },
        { title: 'Cult.fit Monthly',                amount: 2000, cat: 'Fitness',   pt: 'UPI',                         date: dt(2026,2,1) },
        { title: 'BPCL Petrol',                     amount: 3000, cat: 'Fuel',      pt: 'Cash',        acc: 'cash',    date: dt(2026,2,15) },
        { title: 'JBL Earbuds Replacement',         amount: 3499, cat: 'Shopping',  pt: 'Credit Card', acc: 'cc',      date: dt(2026,2,10), tags: ['gadgets'] },
        { title: 'Netflix',                         amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc', date: dt(2026,2,5) },
        { title: 'Spotify',                         amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc', date: dt(2026,2,8) },
        { title: 'Doctor – Seasonal Flu',           amount: 500,  cat: 'Medical',   pt: 'Cash',        acc: 'cash',    date: dt(2026,2,3) },
        { title: 'Medicine – Antibiotics',          amount: 340,  cat: 'Medical',   pt: 'UPI',                         date: dt(2026,2,3) },
        { title: 'Rapido Weekly',                   amount: 480,  cat: 'Transport', pt: 'UPI',                         date: dt(2026,2,25) },
        { title: 'Adobe Creative Cloud',            amount: 1675, cat: 'Education', pt: 'Credit Card', acc: 'cc',      date: dt(2026,2,5) },
      ],
    },

    // ── JANUARY 2026 ─────────────────────────────────────────────────────────
    { income: [
        { title: 'Salary – January 2026',  amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2026,1,1),  accountId: accs.savings },
        { title: 'Freelance – Dashboard',  amount: 30000,  category: 'FREELANCE', source: 'Nexora Tech',      date: dt(2026,1,22), accountId: accs.current },
      ],
      expenses: [
        { title: 'New Year Eve Party',          amount: 3800, cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2026,1,1),  note: 'Cubbon Park countdown event', tags: ['newyear'] },
        { title: 'BESCOM Electricity',          amount: 1550, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2026,1,5) },
        { title: 'ACT Fibernet',               amount: 999,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2026,1,6) },
        { title: 'Gym New Year Plan (6 mo)',    amount: 7000, cat: 'Fitness',       pt: 'UPI',         acc: 'savings', date: dt(2026,1,4), note: 'Gold\'s Gym 6-month pack', tags: ['resolutions'] },
        { title: 'BigBasket Monthly',          amount: 2900, cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2026,1,10) },
        { title: 'Yoga Mat & Dumbbells',       amount: 2200, cat: 'Fitness',       pt: 'Credit Card', acc: 'cc',      date: dt(2026,1,6) },
        { title: 'Republic Day Weekend Trip',  amount: 8500, cat: 'Travel',        pt: 'Credit Card', acc: 'cc',      date: dt(2026,1,24), note: 'Mysore trip 2 nights', tags: ['travel'] },
        { title: 'BPCL Petrol',               amount: 3200, cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2026,1,15) },
        { title: 'Swiggy Weekly Orders',       amount: 2600, cat: 'Food',          pt: 'UPI',                         date: dt(2026,1,20) },
        { title: 'Ola – Office Commute',       amount: 1300, cat: 'Transport',     pt: 'UPI',                         date: dt(2026,1,18) },
        { title: 'Netflix',                   amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2026,1,5) },
        { title: 'Spotify',                   amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2026,1,8) },
        { title: 'Adobe Creative Cloud',      amount: 1675, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2026,1,5) },
        { title: 'Udemy System Design Course', amount: 799, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2026,1,12) },
        { title: 'HP Petrol Pump',            amount: 800,  cat: 'Fuel',          pt: 'UPI',                         date: dt(2026,1,28) },
      ],
    },

    // ── DECEMBER 2025 ────────────────────────────────────────────────────────
    { income: [
        { title: 'Salary – December 2025', amount: 130000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2025,12,1), accountId: accs.savings, note: 'Year-end bonus included' },
        { title: 'Zerodha Dividend',       amount: 2200,   category: 'INVESTMENT',source: 'Zerodha',          date: dt(2025,12,20), accountId: accs.savings },
      ],
      expenses: [
        { title: 'Christmas Party Secret Santa', amount: 1500, cat: 'Shopping',      pt: 'UPI',         acc: 'wallet',  date: dt(2025,12,24), tags: ['christmas','gifts'] },
        { title: 'Christmas Eve Dinner',         amount: 5200, cat: 'Food',          pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,24), note: 'Social Table restaurant', tags: ['christmas'] },
        { title: 'New Year Party Prep',          amount: 3200, cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,30), tags: ['newyear'] },
        { title: 'Goa Flights Booked',           amount: 12600,cat: 'Travel',        pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,10), note: 'BLR-GOA return x2', tags: ['travel','goa'] },
        { title: 'Goa Hotel – 4 nights',         amount: 22000,cat: 'Travel',        pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,27), tags: ['travel','goa'] },
        { title: 'Family Gifts – Diwali Late',   amount: 4500, cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,5),  tags: ['gifts','family'] },
        { title: 'BESCOM Electricity',           amount: 1820, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,12,5) },
        { title: 'ACT Fibernet',                amount: 999,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,12,6) },
        { title: 'BigBasket Monthly',           amount: 3400, cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2025,12,8) },
        { title: 'Swiggy – Festive Orders',      amount: 3100, cat: 'Food',          pt: 'UPI',                         date: dt(2025,12,20) },
        { title: 'BPCL Petrol',                 amount: 3500, cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2025,12,15) },
        { title: 'Gym Monthly',                 amount: 1200, cat: 'Fitness',       pt: 'Cash',        acc: 'cash',    date: dt(2025,12,1) },
        { title: 'Ola – Holiday Travel',        amount: 2100, cat: 'Transport',     pt: 'UPI',                         date: dt(2025,12,22) },
        { title: 'Netflix',                     amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,5) },
        { title: 'Spotify',                     amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,8) },
        { title: 'Adobe Creative Cloud',        amount: 1675, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,5) },
        { title: 'Shoes – New Balance',         amount: 6500, cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,12,18), tags: ['shoes'] },
      ],
    },

    // ── NOVEMBER 2025 (Diwali month) ──────────────────────────────────────────
    { income: [
        { title: 'Salary – November 2025', amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2025,11,1),  accountId: accs.savings },
        { title: 'Freelance – E-commerce UI',amount: 40000, category: 'FREELANCE',source: 'Kiraana Digital',  date: dt(2025,11,14), accountId: accs.current },
      ],
      expenses: [
        { title: 'Diwali Crackers & Decor',      amount: 2800, cat: 'Entertainment', pt: 'Cash',        acc: 'cash',    date: dt(2025,11,1),  tags: ['diwali','festival'] },
        { title: 'Diwali Sweets & Mithai Box',   amount: 1800, cat: 'Food',          pt: 'Cash',        acc: 'cash',    date: dt(2025,11,1),  tags: ['diwali'] },
        { title: 'Diwali Gifting – Family',      amount: 6500, cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,11,1),  note: 'Dry fruits + electronics', tags: ['diwali','gifts'] },
        { title: 'Diwali Gifting – Friends',     amount: 3200, cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,11,1),  tags: ['diwali','gifts'] },
        { title: 'New Clothes – Diwali',         amount: 8900, cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,30), note: 'Kurta + shoes for Diwali', tags: ['diwali','festive'] },
        { title: 'Home Decoration – Diyas',      amount: 950,  cat: 'Shopping',      pt: 'Cash',        acc: 'cash',    date: dt(2025,10,30), tags: ['diwali'] },
        { title: 'BESCOM Electricity',           amount: 2100, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,11,5) },
        { title: 'ACT Fibernet',                amount: 999,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,11,6) },
        { title: 'BigBasket Monthly',           amount: 3800, cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2025,11,8) },
        { title: 'Swiggy – Festive Week',       amount: 2600, cat: 'Food',          pt: 'UPI',                         date: dt(2025,11,15) },
        { title: 'BPCL Petrol',                 amount: 3500, cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2025,11,12) },
        { title: 'Cult.fit Monthly',            amount: 2000, cat: 'Fitness',       pt: 'UPI',                         date: dt(2025,11,1) },
        { title: 'Ola – Festive Commutes',      amount: 1800, cat: 'Transport',     pt: 'UPI',                         date: dt(2025,11,3) },
        { title: 'Movie – Singham Returns',     amount: 1800, cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,11,22) },
        { title: 'Netflix',                     amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,11,5) },
        { title: 'Spotify',                     amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,11,8) },
        { title: 'Adobe Creative Cloud',        amount: 1675, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2025,11,5) },
        { title: 'SBI Home Loan EMI',           amount: 42000,cat: 'Rent',          pt: 'UPI',         acc: 'savings', date: dt(2025,11,15), note: 'Auto-debit', tags: ['emi','homeloan'] },
      ],
    },

    // ── OCTOBER 2025 (Navratri / Dussehra) ───────────────────────────────────
    { income: [
        { title: 'Salary – October 2025',  amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2025,10,1),  accountId: accs.savings },
        { title: 'GST Input Credit',       amount: 5200,   category: 'REFUND',    source: 'GST Portal',       date: dt(2025,10,18) },
      ],
      expenses: [
        { title: 'Navratri Dandiya Night',       amount: 1200, cat: 'Entertainment', pt: 'Cash',        acc: 'cash',    date: dt(2025,10,7),  tags: ['navratri','festival'] },
        { title: 'Navratri Clothes',             amount: 3800, cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,5),  tags: ['navratri','festive'] },
        { title: 'Dussehra Celebration',         amount: 600,  cat: 'Entertainment', pt: 'Cash',        acc: 'cash',    date: dt(2025,10,12), tags: ['dussehra'] },
        { title: 'Flipkart Big Billion Day',     amount: 12500,cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,8),  note: 'Laptop stand + peripherals', tags: ['sale','bbday'] },
        { title: 'Amazon Great Indian Sale',     amount: 5600, cat: 'Shopping',      pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,9),  note: 'Echo + smart bulbs', tags: ['sale'] },
        { title: 'BESCOM Electricity',           amount: 1980, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,10,5) },
        { title: 'ACT Fibernet',                amount: 999,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,10,6) },
        { title: 'BigBasket Monthly',           amount: 3200, cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2025,10,10) },
        { title: 'Swiggy Orders',               amount: 2400, cat: 'Food',          pt: 'UPI',                         date: dt(2025,10,20) },
        { title: 'Cult.fit Monthly',            amount: 2000, cat: 'Fitness',       pt: 'UPI',                         date: dt(2025,10,1) },
        { title: 'Ola Monthly Sub',             amount: 899,  cat: 'Transport',     pt: 'UPI',                         date: dt(2025,10,1) },
        { title: 'BPCL Petrol',                 amount: 3200, cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2025,10,14) },
        { title: 'Coorg Weekend Trip',          amount: 9800, cat: 'Travel',        pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,18), note: '2 nights with family', tags: ['travel','coorg'] },
        { title: 'Netflix',                     amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,5) },
        { title: 'Spotify',                     amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,8) },
        { title: 'Adobe Creative Cloud',        amount: 1675, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2025,10,5) },
        { title: 'SBI Home Loan EMI',           amount: 42000,cat: 'Rent',          pt: 'UPI',         acc: 'savings', date: dt(2025,10,15), tags: ['emi','homeloan'] },
        { title: 'Apollo Pharmacy',             amount: 720,  cat: 'Medical',       pt: 'UPI',                         date: dt(2025,10,22) },
      ],
    },

    // ── SEPTEMBER 2025 (Ganesh Chaturthi) ────────────────────────────────────
    { income: [
        { title: 'Salary – September 2025',amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2025,9,1),  accountId: accs.savings },
        { title: 'Freelance – Mobile App', amount: 35000,  category: 'FREELANCE', source: 'ByteStream Labs',  date: dt(2025,9,20), accountId: accs.current },
      ],
      expenses: [
        { title: 'Ganesh Chaturthi Puja',        amount: 1200, cat: 'Entertainment', pt: 'Cash',        acc: 'cash',    date: dt(2025,9,7),  tags: ['ganesh','festival'] },
        { title: 'Ganesh Idol & Decor',          amount: 800,  cat: 'Shopping',      pt: 'Cash',        acc: 'cash',    date: dt(2025,9,5),  tags: ['ganesh','festival'] },
        { title: 'Prasad & Sweets',              amount: 500,  cat: 'Food',          pt: 'Cash',        acc: 'cash',    date: dt(2025,9,7),  tags: ['ganesh'] },
        { title: 'BESCOM Electricity',           amount: 2350, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,9,5),  note: 'High due to AC in monsoon' },
        { title: 'ACT Fibernet',                amount: 999,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,9,6) },
        { title: 'BigBasket Monthly',           amount: 2800, cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2025,9,10) },
        { title: 'Swiggy Orders',               amount: 2100, cat: 'Food',          pt: 'UPI',                         date: dt(2025,9,18) },
        { title: 'Umbrella + Raincoat',         amount: 1800, cat: 'Shopping',      pt: 'UPI',         acc: 'wallet',  date: dt(2025,9,2),  note: 'Monsoon essentials' },
        { title: 'BMTC & Rapido – Monsoon',     amount: 1400, cat: 'Transport',     pt: 'Cash',        acc: 'cash',    date: dt(2025,9,15) },
        { title: 'Cult.fit Monthly',            amount: 2000, cat: 'Fitness',       pt: 'UPI',                         date: dt(2025,9,1) },
        { title: 'BPCL Petrol',                 amount: 2800, cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2025,9,12) },
        { title: 'Movie – Stree 2',             amount: 900,  cat: 'Entertainment', pt: 'UPI',         acc: 'wallet',  date: dt(2025,9,14), tags: ['movie'] },
        { title: 'Netflix',                     amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,9,5) },
        { title: 'Spotify',                     amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,9,8) },
        { title: 'Adobe Creative Cloud',        amount: 1675, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2025,9,5) },
        { title: 'SBI Home Loan EMI',           amount: 42000,cat: 'Rent',          pt: 'UPI',         acc: 'savings', date: dt(2025,9,15), tags: ['emi','homeloan'] },
        { title: 'Dentist Checkup',             amount: 1200, cat: 'Medical',       pt: 'UPI',                         date: dt(2025,9,22) },
      ],
    },

    // ── AUGUST 2025 ──────────────────────────────────────────────────────────
    { income: [
        { title: 'Salary – August 2025',  amount: 110000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2025,8,1),  accountId: accs.savings },
      ],
      expenses: [
        { title: 'Independence Day Outing',     amount: 1400, cat: 'Entertainment', pt: 'Cash',        acc: 'cash',    date: dt(2025,8,15), tags: ['independence'] },
        { title: 'Raksha Bandhan Gifts',         amount: 2800, cat: 'Shopping',      pt: 'UPI',         acc: 'wallet',  date: dt(2025,8,9),  tags: ['rakshabandhan','gifts'] },
        { title: 'BESCOM Electricity',          amount: 2600, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,8,5),  note: 'Peak AC bill – August' },
        { title: 'ACT Fibernet',               amount: 999,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,8,6) },
        { title: 'BigBasket Monthly',          amount: 3000, cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2025,8,10) },
        { title: 'Swiggy – Janmashtami Special',amount:1800, cat: 'Food',          pt: 'UPI',                         date: dt(2025,8,16) },
        { title: 'Ola – Commute Week',         amount: 1200, cat: 'Transport',     pt: 'UPI',                         date: dt(2025,8,18) },
        { title: 'Cult.fit Monthly',           amount: 2000, cat: 'Fitness',       pt: 'UPI',                         date: dt(2025,8,1) },
        { title: 'BPCL Petrol',                amount: 3200, cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2025,8,13) },
        { title: 'Kerala Monsoon Trip',        amount: 18500,cat: 'Travel',        pt: 'Credit Card', acc: 'cc',      date: dt(2025,8,21), note: 'Wayanad 3 nights', tags: ['travel','kerala'] },
        { title: 'Rainwater Harvesting Fix',   amount: 3500, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,8,8),  note: 'Apartment common fund' },
        { title: 'Netflix',                    amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,8,5) },
        { title: 'Spotify',                    amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,8,8) },
        { title: 'Adobe Creative Cloud',       amount: 1675, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2025,8,5) },
        { title: 'SBI Home Loan EMI',          amount: 42000,cat: 'Rent',          pt: 'UPI',         acc: 'savings', date: dt(2025,8,15), tags: ['emi','homeloan'] },
        { title: 'Pharmacy – Vitamins',        amount: 480,  cat: 'Medical',       pt: 'UPI',                         date: dt(2025,8,25) },
        { title: 'Zerodha SIP',               amount: 5000, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,8,7),  note: 'Mutual fund SIP', tags: ['investment','sip'] },
      ],
    },

    // ── JULY 2025 ─────────────────────────────────────────────────────────────
    { income: [
        { title: 'Salary – July 2025',    amount: 105000, category: 'SALARY',    source: 'Basiq360 Pvt Ltd', date: dt(2025,7,1),  accountId: accs.savings },
        { title: 'Freelance – Brand Identity',amount:18000,category: 'FREELANCE',source: 'Crescent Studio',  date: dt(2025,7,25), accountId: accs.current },
        { title: 'Tax Refund AY24-25',    amount: 8200,   category: 'REFUND',    source: 'Income Tax Dept',  date: dt(2025,7,10), note: 'AY 2024-25 tax refund' },
      ],
      expenses: [
        { title: 'BESCOM Electricity',         amount: 2450, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,7,5),  note: 'High – peak summer ending' },
        { title: 'ACT Fibernet',              amount: 999,  cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,7,6) },
        { title: 'BigBasket Monthly',         amount: 2700, cat: 'Grocery',       pt: 'UPI',         acc: 'savings', date: dt(2025,7,8) },
        { title: 'Swiggy July Orders',        amount: 2300, cat: 'Food',          pt: 'UPI',                         date: dt(2025,7,20) },
        { title: 'Guru Purnima Puja',         amount: 800,  cat: 'Entertainment', pt: 'Cash',        acc: 'cash',    date: dt(2025,7,10), tags: ['festival'] },
        { title: 'Monsoon Trekking Gear',     amount: 4200, cat: 'Fitness',       pt: 'Credit Card', acc: 'cc',      date: dt(2025,7,12), note: 'Shoes + poncho', tags: ['trek'] },
        { title: 'Coorg Trek – Weekend',      amount: 5500, cat: 'Travel',        pt: 'Credit Card', acc: 'cc',      date: dt(2025,7,19), tags: ['travel','trek'] },
        { title: 'Ola Monthly Sub',           amount: 899,  cat: 'Transport',     pt: 'UPI',                         date: dt(2025,7,1) },
        { title: 'BPCL Petrol',               amount: 3000, cat: 'Fuel',          pt: 'Cash',        acc: 'cash',    date: dt(2025,7,15) },
        { title: 'Cult.fit Monthly',          amount: 2000, cat: 'Fitness',       pt: 'UPI',                         date: dt(2025,7,1) },
        { title: 'Netflix',                   amount: 649,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,7,5) },
        { title: 'Spotify',                   amount: 119,  cat: 'Entertainment', pt: 'Credit Card', acc: 'cc',      date: dt(2025,7,8) },
        { title: 'Adobe Creative Cloud',      amount: 1675, cat: 'Education',     pt: 'Credit Card', acc: 'cc',      date: dt(2025,7,5) },
        { title: 'SBI Home Loan EMI',         amount: 42000,cat: 'Rent',          pt: 'UPI',         acc: 'savings', date: dt(2025,7,15), tags: ['emi','homeloan'] },
        { title: 'Mid-year Physical Exam',    amount: 1800, cat: 'Medical',       pt: 'Credit Card', acc: 'cc',      date: dt(2025,7,22), note: 'Thyrocare panel' },
        { title: 'Zerodha SIP',              amount: 5000, cat: 'Bills',         pt: 'UPI',         acc: 'savings', date: dt(2025,7,7),  tags: ['investment','sip'] },
        { title: 'Haircut – Truefitt & Hill',amount: 950,  cat: 'Medical',       pt: 'Cash',        acc: 'cash',    date: dt(2025,7,27) },
      ],
    },
  ];

  // ── Post all data ─────────────────────────────────────────────────────────

  let totalExp = 0, totalInc = 0;

  for (const month of months) {
    const monthLabel = month.income[0]?.title?.replace('Salary – ', '') || '?';
    console.log(`\n📅 ${monthLabel}`);

    // Income
    for (const inc of month.income) {
      await addIncome(api, inc);
      totalInc++;
      await sleep(60);
    }
    console.log(`  💰 ${month.income.length} income records`);

    // Expenses
    let mexp = 0;
    for (const e of month.expenses) {
      await addExpense(api, cats, pts, accs, e);
      mexp++;
      totalExp++;
      await sleep(70);
    }
    console.log(`  💸 ${mexp} expenses`);
  }

  console.log(`
╔══════════════════════════════════════════════════════════╗
║     🎉  Year Backfill Complete!                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Account: hisabkitab.notify@gmail.com                    ║
║  Period:  July 2025 → March 2026 (9 months)              ║
║  ${String(totalExp).padEnd(4)} expenses added                                  ║
║  ${String(totalInc).padEnd(4)} income records added                            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Backfill failed:', e.message);
  if (e.data) console.error('API error:', JSON.stringify(e.data, null, 2));
  process.exit(1);
});
