// Vercel Serverless Function for AnchorCast contact form
// Required Vercel Environment Variables:
// RESEND_API_KEY=your_resend_api_key
// CONTACT_TO_EMAIL=info@kaitamtech.com
// CONTACT_FROM_EMAIL=AnchorCast <noreply@anchorcastapp.com>

// [SEC-API1] Simple in-memory rate limiter — max 5 submissions per IP per 10 minutes
const _rateLimitMap = new Map();
const RATE_LIMIT_MAX    = 5;
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes

function isRateLimited(ip) {
  const now = Date.now();
  const entry = _rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    // Window expired — reset
    _rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count += 1;
  _rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

// [SEC-API2] Allowed subject values — prevent free-form subject injection
const ALLOWED_SUBJECTS = [
  'General Question',
  'Bug Report',
  'Feature Request',
  'Partnership',
  'Media / Press',
  'Other',
  'Website Contact', // fallback default
];

module.exports = async function handler(req, res) {
  // [SEC-API3] CORS — only allow requests from the anchorcastapp.com origin
  const origin = req.headers['origin'] || '';
  const allowedOrigins = [
    'https://anchorcastapp.com',
    'https://www.anchorcastapp.com',
    'https://docs.anchorcastapp.com',
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // [SEC-API1] Rate limiting by IP
  const clientIp = (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Please wait a few minutes.' });
  }

  try {
    const apiKey   = process.env.RESEND_API_KEY;
    const toEmail  = process.env.CONTACT_TO_EMAIL  || 'info@kaitamtech.com';
    const fromEmail= process.env.CONTACT_FROM_EMAIL|| 'AnchorCast <onboarding@resend.dev>';

    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'Server configuration error.' });
    }

    const body    = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name    = String(body.name    || '').trim();
    const email   = String(body.email   || '').trim();
    const subject = String(body.subject || 'Website Contact').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Name, email, and message are required.' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    // [SEC-API2] Subject must be from the allowed list
    const safeSubject = ALLOWED_SUBJECTS.includes(subject) ? subject : 'Website Contact';

    // [SEC-API4] Length limits
    if (name.length > 120 || message.length > 5000) {
      return res.status(400).json({ ok: false, error: 'Message is too long.' });
    }

    const safeName    = escapeHtml(name);
    const safeEmail   = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px;color:#0f172a">New AnchorCast Website Message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p><strong>Message:</strong></p>
        <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px">${safeMessage}</div>
      </div>
    `;

    const text = `New AnchorCast Website Message\n\nName: ${name}\nEmail: ${email}\nSubject: ${safeSubject}\n\nMessage:\n${message}`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `[AnchorCast] ${safeSubject}`,
        html,
        text,
      }),
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Email provider failed to send the message.',
      });
    }

    return res.status(200).json({ ok: true, id: result.id || null });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Unexpected server error.' });
  }
};
