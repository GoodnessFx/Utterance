// Vercel Serverless Function for AnchorCast contact form
// Required Vercel Environment Variables:
// RESEND_API_KEY=your_resend_api_key
// CONTACT_TO_EMAIL=info@kaitamtech.com
// CONTACT_FROM_EMAIL=AnchorCast <noreply@anchorcastapp.com>

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL || 'info@kaitamtech.com';
    const fromEmail = process.env.CONTACT_FROM_EMAIL || 'AnchorCast <onboarding@resend.dev>';

    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'Missing RESEND_API_KEY' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const subject = String(body.subject || 'Website Contact').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Name, email, and message are required.' });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    // Basic anti-spam guard: keep submissions reasonable.
    if (name.length > 120 || subject.length > 160 || message.length > 5000) {
      return res.status(400).json({ ok: false, error: 'Message is too long.' });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px;color:#0f172a">New AnchorCast Website Message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p><strong>Message:</strong></p>
        <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px">${safeMessage}</div>
      </div>
    `;

    const text = `New AnchorCast Website Message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;

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
        subject: `[AnchorCast] ${subject}`,
        html,
        text,
      }),
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return res.status(500).json({
        ok: false,
        error: result?.message || 'Email provider failed to send the message.',
      });
    }

    return res.status(200).json({ ok: true, id: result.id || null });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Unexpected server error.' });
  }
};
