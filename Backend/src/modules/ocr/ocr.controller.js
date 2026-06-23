const { GoogleGenerativeAI } = require('@google/generative-ai');

const PROMPT = `You are a receipt parser. Extract expense information from this receipt image.
Return ONLY a valid JSON object — no markdown, no explanation, just JSON.

{
  "title": "merchant or store name (short, max 40 chars)",
  "amount": <total amount as a number, no currency symbol, null if not found>,
  "date": "YYYY-MM-DD if visible, otherwise null",
  "categoryHint": "one of: food, transport, shopping, entertainment, utilities, health, travel, other",
  "items": ["brief item descriptions if visible, max 5 items"],
  "note": "any useful extra info (store address, invoice number, etc.), max 80 chars, or null"
}

If you cannot determine a field with confidence, use null. Always return valid JSON.`;

const scanReceipt = async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'OCR not configured. Add GEMINI_API_KEY to your .env file.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const { buffer, mimetype } = req.file;
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(mimetype)) {
    return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent([
    PROMPT,
    {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimetype === 'image/jpg' ? 'image/jpeg' : mimetype,
      },
    },
  ]);

  const raw = result.response.text().trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    try { parsed = match ? JSON.parse(match[0]) : {}; }
    catch { parsed = {}; }
  }

  res.json({
    title:        parsed.title        || null,
    amount:       parsed.amount       ? Number(parsed.amount) : null,
    date:         parsed.date         || null,
    categoryHint: parsed.categoryHint || null,
    items:        Array.isArray(parsed.items) ? parsed.items : [],
    note:         parsed.note         || null,
  });
};

module.exports = { scanReceipt };
