require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const bootstrapAdmin = require('./services/bootstrapAdmin');
const cors = require('cors');
const errorHandler = require('./utils/errorHandler');
const path = require('path');
const fs = require('fs');

const app = express();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));

app.use((req, _res, next) => {
  req._client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  req._user_agent = req.headers['user-agent'] || '';
  req._referrer = req.headers.referer || req.headers.referrer || '';
  next();
});

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
fs.mkdirSync(uploadRoot, { recursive: true });

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(uploadRoot, { fallthrough: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

app.get('/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    service: 'healthiet',
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

app.use('/api', require('./routes/index'));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  await connectDB();
  await bootstrapAdmin();
  return app.listen(PORT, HOST, () => {
    console.log(`Healthiet server running on ${HOST}:${PORT}`);
  });
}

if (require.main === module) {
  start().catch(error => {
    console.error('Failed to start Healthiet:', error);
    process.exit(1);
  });
}

module.exports = { app, start };
