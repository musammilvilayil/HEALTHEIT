const User = require('../models/User');

module.exports = async function bootstrapAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Admin bootstrap skipped: ADMIN_EMAIL/ADMIN_PASSWORD not configured.');
    return;
  }
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  const existingAdmin = await User.findOne({ role: 'Admin' });
  if (existingAdmin) return;
  const admin = new User({
    email,
    password,
    role: 'Admin',
    status: 'active',
    firstName: process.env.ADMIN_FIRST_NAME || 'Healthiet',
    lastName: process.env.ADMIN_LAST_NAME || 'Admin',
  });
  await admin.save();
  console.log('Bootstrap admin created from environment configuration.');
};
