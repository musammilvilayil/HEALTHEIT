require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const errorHandler = require('./utils/errorHandler');
const path = require('path');

const app = express();

connectDB();

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));

app.use('/api/usage-logs', (req, res, next) => {
  req._client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  req._user_agent = req.headers['user-agent'] || '';
  req._referrer = req.headers.referer || req.headers.referrer || '';
  next();
});

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/imgs', express.static(path.join(__dirname, 'imgs')));
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'healthiet' });
});

app.use('/api', require('./routes/index'));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Healthiet server running on ${HOST}:${PORT}`);
});

module.exports = app;
