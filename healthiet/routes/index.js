const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');

const User = require('../models/User');
const MentorApplication = require('../models/MentorApplication');
const Progress = require('../models/Progress');
const ChatMessage = require('../models/ChatMessage');
const UsageLog = require('../models/UsageLog');
const { requireAuth, requireRole, signToken } = require('../middleware/auth');
const { sendPasswordReset } = require('../services/emailService');

const router = express.Router();
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
const profileDir = path.join(uploadRoot, 'profile');
fs.mkdirSync(profileDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profileDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    cb(allowed.has(file.mimetype) ? null : new Error('Only JPG, PNG and WebP images are allowed'), allowed.has(file.mimetype));
  },
});

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function safeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.resetTokenHash;
  delete obj.resetTokenExpires;
  return obj;
}

async function logEvent(eventType, req, userId = null, metadata = {}) {
  try {
    await UsageLog.create({
      eventType,
      userId: userId || req.user?._id || null,
      pageUrl: req.body?.pageUrl || req.originalUrl,
      metadata,
      ip: req._client_ip || req.ip,
      userAgent: req._user_agent || req.headers['user-agent'] || '',
      referrer: req._referrer || req.headers.referer || '',
    });
  } catch (error) {
    console.warn('Usage log failed:', error.message);
  }
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [];
}

function profileUpdates(body, role) {
  const allowed = [
    'firstName', 'lastName', 'phone', 'age', 'gender', 'height', 'weight',
    'activityLevel', 'healthConditions', 'fitnessExperience', 'timezone', 'language',
    'bio', 'certifications', 'experience', 'education', 'location', 'availability',
    'rates', 'linkedin', 'website', 'portfolio'
  ];
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  }
  if (Object.prototype.hasOwnProperty.call(body, 'goals')) updates.goals = normalizeList(body.goals);
  if (Object.prototype.hasOwnProperty.call(body, 'dietaryPreferences')) updates.dietaryPreferences = normalizeList(body.dietaryPreferences);
  if (Object.prototype.hasOwnProperty.call(body, 'notifications')) updates.notifications = body.notifications || {};
  if (role === 'Mentor') {
    if (Object.prototype.hasOwnProperty.call(body, 'specialty')) updates.specialty = normalizeList(body.specialty);
    if (Object.prototype.hasOwnProperty.call(body, 'languages')) updates.languages = normalizeList(body.languages);
  }
  return updates;
}

router.post('/auth/register', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
  if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  if (await User.exists({ email })) return res.status(409).json({ success: false, message: 'Email is already registered' });

  const user = new User({ email, password, role: 'Mentee', status: 'active' });
  await user.save();
  await logEvent('REGISTER', req, user._id);
  res.status(201).json({ success: true, token: signToken(user), user: safeUser(user) });
}));

router.post('/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'This account is not active' });
  }
  user.lastActive = new Date();
  await user.save();
  await logEvent('LOGIN', req, user._id);
  res.json({ success: true, token: signToken(user), user: safeUser(user) });
}));

router.get('/auth/profile', requireAuth, (req, res) => {
  res.json({ success: true, user: safeUser(req.user) });
});

router.put('/auth/profile', requireAuth, asyncRoute(async (req, res) => {
  const updates = profileUpdates(req.body, req.user.role);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  await logEvent('PROFILE_UPDATE', req, user._id);
  res.json({ success: true, message: 'Profile updated', user: safeUser(user) });
}));

router.post('/auth/profile/photo', requireAuth, upload.single('profilePhoto'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Profile photo is required' });
  const previous = req.user.profilePhotoUrl;
  const profilePhotoUrl = `/uploads/profile/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user._id, { profilePhotoUrl }, { new: true });
  if (previous?.startsWith('/uploads/profile/')) {
    const oldPath = path.join(profileDir, path.basename(previous));
    fs.promises.unlink(oldPath).catch(() => {});
  }
  res.json({ success: true, profilePhotoUrl, user: safeUser(user) });
}));

router.post('/auth/request-password-reset', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const generic = 'If that email is registered, a reset link will be sent to your inbox.';
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const user = await User.findOne({ email }).select('+resetTokenHash +resetTokenExpires');
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const result = await sendPasswordReset(email, token);
    if (!result.sent) {
      user.resetTokenHash = null;
      user.resetTokenExpires = null;
      await user.save();
      console.warn('Password reset SMTP not configured');
    }
  }
  res.json({ success: true, message: generic });
}));

router.post('/auth/reset-password', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!email || !token || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Valid reset link and password of at least 8 characters are required' });
  }
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email,
    resetTokenHash: hash,
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires');
  if (!user) return res.status(400).json({ success: false, message: 'Reset link is invalid or expired' });
  user.password = password;
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  await user.save();
  res.json({ success: true, message: 'Password reset successfully' });
}));

router.get('/users', requireAuth, asyncRoute(async (req, res) => {
  const role = req.query.role ? String(req.query.role) : null;
  if (req.user.role !== 'Admin' && role !== 'Mentor') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  const query = {};
  if (role) query.role = role;
  if (req.user.role !== 'Admin') query.status = 'active';
  const users = await User.find(query).sort({ createdAt: -1 });
  res.json({ success: true, users: users.map(safeUser) });
}));

router.post('/users', requireAuth, requireRole('Admin'), asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = ['Admin', 'Mentor', 'Mentee'].includes(req.body.role) ? req.body.role : 'Mentee';
  if (!email || password.length < 8) return res.status(400).json({ success: false, message: 'Valid email and password are required' });
  if (await User.exists({ email })) return res.status(409).json({ success: false, message: 'Email is already registered' });
  const user = new User({
    email, password, role,
    firstName: req.body.firstName || '',
    lastName: req.body.lastName || '',
    status: ['active', 'inactive', 'suspended'].includes(String(req.body.status).toLowerCase())
      ? String(req.body.status).toLowerCase() : 'active',
    mentorApplicationStatus: role === 'Mentor' ? 'Approved' : 'Not Applied',
  });
  await user.save();
  res.status(201).json({ success: true, user: safeUser(user) });
}));

router.get('/users/my-mentor', requireAuth, requireRole('Mentee'), asyncRoute(async (req, res) => {
  const user = await User.findById(req.user._id).populate('mentor', 'firstName lastName email specialty bio profilePhotoUrl experience');
  res.json({ success: true, mentor: user.mentor || null });
}));

router.post('/users/my-mentor', requireAuth, requireRole('Mentee'), asyncRoute(async (req, res) => {
  const mentorId = req.body.mentorId;
  if (!mongoose.isValidObjectId(mentorId)) return res.status(400).json({ success: false, message: 'Invalid mentor' });
  const mentor = await User.findOne({ _id: mentorId, role: 'Mentor', status: 'active' });
  if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });
  const user = await User.findById(req.user._id);
  if (user.mentor && user.mentor.toString() !== mentorId) {
    const current = user.mentorHistory.find(h => h.mentor?.toString() === user.mentor.toString() && !h.unassignedAt);
    if (current) current.unassignedAt = new Date();
  }
  user.mentor = mentor._id;
  user.mentorHistory.push({ mentor: mentor._id, assignedAt: new Date() });
  await user.save();
  await logEvent('MENTOR_ASSIGNED', req, user._id, { mentorId });
  res.json({ success: true, mentor: safeUser(mentor) });
}));

router.delete('/users/my-mentor', requireAuth, requireRole('Mentee'), asyncRoute(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.mentor) {
    const current = [...user.mentorHistory].reverse().find(h => h.mentor?.toString() === user.mentor.toString() && !h.unassignedAt);
    if (current) {
      current.unassignedAt = new Date();
      current.reason = String(req.body?.reason || 'Changed by mentee');
    }
  }
  user.mentor = null;
  await user.save();
  res.json({ success: true, message: 'Mentor unassigned' });
}));

router.get('/users/my-mentor/history', requireAuth, requireRole('Mentee'), asyncRoute(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('mentorHistory.mentor', 'firstName lastName specialty profilePhotoUrl');
  res.json({ success: true, history: user.mentorHistory || [] });
}));

router.get('/users/my-mentees', requireAuth, requireRole('Mentor'), asyncRoute(async (req, res) => {
  const mentees = await User.find({ role: 'Mentee', mentor: req.user._id, status: 'active' })
    .select('firstName lastName email profilePhotoUrl age gender goals weight height lastActive');
  res.json({ success: true, mentees });
}));

router.get('/users/:id', requireAuth, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user id' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: 'User not found' });

  const isSelf = target._id.equals(req.user._id);
  const isAdmin = req.user.role === 'Admin';
  const assignedMentor = req.user.role === 'Mentor' && target.mentor?.equals(req.user._id);
  if (!isSelf && !isAdmin && !assignedMentor) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  res.json({ success: true, user: safeUser(target) });
}));

router.put('/users/:id', requireAuth, requireRole('Admin'), upload.single('profilePhoto'), asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user id' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: 'User not found' });

  const updates = profileUpdates(req.body, req.body.role || target.role);
  if (req.body.email) updates.email = String(req.body.email).trim().toLowerCase();
  if (['Admin', 'Mentor', 'Mentee'].includes(req.body.role)) updates.role = req.body.role;
  const status = String(req.body.status || '').toLowerCase();
  if (['active', 'inactive', 'suspended'].includes(status)) updates.status = status;
  if (req.file) updates.profilePhotoUrl = `/uploads/profile/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(target._id, { $set: updates }, { new: true, runValidators: true });
  res.json({ success: true, user: safeUser(user) });
}));

router.delete('/users/:id', requireAuth, requireRole('Admin'), asyncRoute(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(409).json({ success: false, message: 'You cannot delete your own admin account' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  await Promise.all([
    Progress.deleteMany({ userId: user._id }),
    ChatMessage.deleteMany({ $or: [{ sender: user._id }, { receiver: user._id }] }),
    MentorApplication.deleteMany({ userId: user._id }),
    User.updateMany({ mentor: user._id }, { $set: { mentor: null } }),
  ]);
  res.json({ success: true, message: 'User deleted' });
}));

router.post('/mentor-applications', requireAuth, requireRole('Mentee'), asyncRoute(async (req, res) => {
  if (await MentorApplication.exists({ userId: req.user._id })) {
    return res.status(409).json({ success: false, message: 'You already submitted an application' });
  }
  const app = await MentorApplication.create({
    userId: req.user._id,
    phone: req.body.phone || req.user.phone,
    location: req.body.location || '',
    specialization: normalizeList(req.body.specialization || req.body.specialty),
    experience: Number(req.body.experience || 0),
    certifications: req.body.certifications || '',
    education: req.body.education || '',
    statement: req.body.statement || '',
    links: normalizeList(req.body.links),
  });
  await User.findByIdAndUpdate(req.user._id, { mentorApplicationStatus: 'Pending' });
  await logEvent('MENTOR_APPLICATION', req, req.user._id);
  res.status(201).json({ success: true, application: app });
}));

router.get('/mentor-applications', requireAuth, requireRole('Admin'), asyncRoute(async (_req, res) => {
  const apps = await MentorApplication.find().populate('userId', 'firstName lastName email phone location').sort({ createdAt: -1 });
  const data = apps.map(app => ({
    ...app.toObject(),
    mentorApplicationStatus: app.status,
    fullName: `${app.userId?.firstName || ''} ${app.userId?.lastName || ''}`.trim(),
    email: app.userId?.email || '',
    phone: app.phone || app.userId?.phone || '',
    location: app.location || app.userId?.location || '',
  }));
  res.json(data);
}));

router.patch('/mentor-applications/:id', requireAuth, requireRole('Admin'), asyncRoute(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
  }
  const app = await MentorApplication.findById(req.params.id);
  if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
  app.status = status;
  app.reviewedAt = new Date();
  app.reviewedBy = req.user._id;
  await app.save();
  const updates = { mentorApplicationStatus: status };
  if (status === 'Approved') {
    updates.role = 'Mentor';
    updates.specialty = app.specialization;
    updates.experience = app.experience;
    updates.certifications = app.certifications;
  }
  await User.findByIdAndUpdate(app.userId, { $set: updates });
  res.json({ success: true, application: app });
}));

router.post('/progress', requireAuth, requireRole('Mentee'), asyncRoute(async (req, res) => {
  const progress = await Progress.create({
    userId: req.user._id,
    date: req.body.date || new Date(),
    weightRecorded: req.body.weightRecorded ?? req.body.weight,
    measurements: req.body.measurements || {},
    workoutLog: req.body.workoutLog || '',
    notes: req.body.notes || '',
    completion: Number(req.body.completion || 0),
  });
  res.status(201).json({ success: true, data: progress });
}));

router.get('/progress/:menteeId', requireAuth, asyncRoute(async (req, res) => {
  const mentee = await User.findById(req.params.menteeId);
  if (!mentee) return res.status(404).json({ success: false, message: 'Mentee not found' });
  const allowed = req.user.role === 'Admin' ||
    req.user._id.equals(mentee._id) ||
    (req.user.role === 'Mentor' && mentee.mentor?.equals(req.user._id));
  if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });
  const logs = await Progress.find({ userId: mentee._id }).sort({ date: -1 }).limit(100);
  res.json({ success: true, data: logs });
}));

async function chatAllowed(user, otherId) {
  const other = await User.findById(otherId);
  if (!other) return false;
  if (user.role === 'Mentor' && other.role === 'Mentee') return other.mentor?.equals(user._id);
  if (user.role === 'Mentee' && other.role === 'Mentor') return user.mentor?.equals(other._id);
  return false;
}

router.get('/chat/history/:otherId', requireAuth, asyncRoute(async (req, res) => {
  if (!(await chatAllowed(req.user, req.params.otherId))) {
    return res.status(403).json({ success: false, message: 'Chat is available only between assigned mentor and mentee' });
  }
  const messages = await ChatMessage.find({
    $or: [
      { sender: req.user._id, receiver: req.params.otherId },
      { sender: req.params.otherId, receiver: req.user._id },
    ],
  }).sort({ createdAt: 1 }).limit(500);
  res.json({ success: true, messages });
}));

router.post('/chat/send', requireAuth, asyncRoute(async (req, res) => {
  const receiver = req.body.receiver;
  const message = String(req.body.message || '').trim();
  if (!receiver || !message) return res.status(400).json({ success: false, message: 'Receiver and message are required' });
  if (!(await chatAllowed(req.user, receiver))) {
    return res.status(403).json({ success: false, message: 'Chat is available only between assigned mentor and mentee' });
  }
  const saved = await ChatMessage.create({ sender: req.user._id, receiver, message });
  await logEvent('CHAT_MESSAGE', req, req.user._id, { receiver });
  res.status(201).json({ success: true, message: saved });
}));

router.post(['/logs', '/usage-logs'], asyncRoute(async (req, res) => {
  let userId = null;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'development-only-change-me');
      userId = payload.id;
    } catch {}
  }
  await logEvent(String(req.body.eventType || req.body.type || 'PAGE_VIEW').toUpperCase(), req, userId, req.body.metadata || req.body);
  res.status(201).json({ success: true });
}));

router.get('/logs/analytics/logs', requireAuth, requireRole('Admin'), asyncRoute(async (_req, res) => {
  const logs = await UsageLog.find().populate('userId', 'firstName lastName email role').sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, logs });
}));

router.get('/logs/analytics/user-distribution', requireAuth, requireRole('Admin'), asyncRoute(async (_req, res) => {
  const counts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
  const roles = ['Mentee', 'Mentor', 'Admin'];
  const map = Object.fromEntries(counts.map(x => [x._id, x.count]));
  res.json({ success: true, labels: roles, data: roles.map(role => map[role] || 0) });
}));

router.get('/logs/analytics/user-growth', requireAuth, requireRole('Admin'), asyncRoute(async (req, res) => {
  const period = ['week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month';
  const now = new Date();
  let start;
  let format;
  if (period === 'week') {
    start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    format = '%Y-%m-%d';
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    format = '%Y-%m';
  } else {
    start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    format = '%Y-%m-%d';
  }
  const data = await User.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: data.map(item => ({ label: item._id, count: item.count })) });
}));

module.exports = router;
