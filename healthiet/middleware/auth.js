const jwt = require('jsonwebtoken');
const User = require('../models/User');

function jwtSecret() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return process.env.JWT_SECRET || 'development-only-change-me';
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    const payload = jwt.verify(token, jwtSecret());
    const user = await User.findById(payload.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is unavailable' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, signToken };
