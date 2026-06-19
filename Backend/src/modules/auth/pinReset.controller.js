const { sendEmail } = require('../../lib/mailer');
const prisma = require('../../lib/prisma');

// userId → { otp, exp, attempts }
const otpStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore) {
    if (now > v.exp) otpStore.delete(k);
  }
}, 15 * 60 * 1000);

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const shown = local.slice(0, 2);
  return `${shown}${'*'.repeat(Math.max(0, local.length - 2))}@${domain}`;
}

const requestOTP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = generateOTP();
    otpStore.set(userId, { otp, exp: Date.now() + 10 * 60 * 1000, attempts: 0 });

    await sendEmail({
      to: user.email,
      subject: 'HisabKitab — App Lock Reset Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;border-radius:16px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:40px">💰</span>
            <h2 style="color:#a5b4fc;margin:8px 0 0;font-size:20px">HisabKitab</h2>
          </div>
          <p style="color:#cbd5e1;margin:0 0 20px;text-align:center">
            Hi${user.name ? ` ${user.name}` : ''}, here's your app lock reset code:
          </p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px">
            <span style="font-size:44px;font-weight:800;letter-spacing:14px;color:#f1f5f9;font-variant-numeric:tabular-nums">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0">
            Expires in <strong style="color:#94a3b8">10 minutes</strong> &middot;
            This only resets your in-app lock — your account password is unchanged.
          </p>
        </div>
      `,
    });

    res.json({ maskedEmail: maskEmail(user.email) });
  } catch (err) {
    console.error('pinReset.requestOTP:', err);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'Code is required' });

    const userId = req.user.userId;
    const entry = otpStore.get(userId);

    if (!entry) return res.status(400).json({ error: 'No code requested — please request a new one' });
    if (Date.now() > entry.exp) {
      otpStore.delete(userId);
      return res.status(400).json({ error: 'Code expired — please request a new one' });
    }

    entry.attempts += 1;
    if (entry.attempts > 3) {
      otpStore.delete(userId);
      return res.status(429).json({ error: 'Too many wrong attempts — please request a new code' });
    }

    if (otp !== entry.otp) {
      otpStore.set(userId, entry);
      const left = 4 - entry.attempts;
      return res.status(400).json({ error: `Wrong code — ${left} attempt${left !== 1 ? 's' : ''} remaining` });
    }

    otpStore.delete(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('pinReset.verifyOTP:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

module.exports = { requestOTP, verifyOTP };
