const nodemailer = require('nodemailer');

function getTransport() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: String(process.env.EMAIL_SECURE || 'false') === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendPasswordReset(email, token) {
  const transport = getTransport();
  if (!transport) return { sent: false, reason: 'smtp_not_configured' };
  const base = (process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  const url = `${base}/reset_password.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your Healthiet password',
    text: `Reset your Healthiet password using this link: ${url}\nThis link expires in 60 minutes.`,
  });
  return { sent: true };
}

module.exports = { sendPasswordReset };
