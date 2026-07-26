require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const errorHandler = require('./utils/errorHandler');
const path = require('path');

const app = express();

// Connect to database
connectDB();

// --- CRITICAL DEBUGGING STEP: FORCE express.json() to be the first middleware ---
app.use(express.json()); // <--- FIRST middleware
app.use(cors()); // CORS after body parser
app.use(express.urlencoded({ extended: false })); // TEMPORARILY DISABLED

// Debug middleware to log incoming request body and headers
app.use((req, res, next) => {
    if (req.body !== undefined) {
        console.log('Incoming request body (after parsing attempt):', req.body);
    }
    if (req.headers['content-type'] !== undefined) {
        console.log('Incoming request headers Content-Type:', req.headers['content-type']);
    }
    next();
});

// Middleware to auto-capture IP, user agent, and referrer for all /api/usage-logs POST requests
app.use('/api/usage-logs', (req, res, next) => {
    req._client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    req._user_agent = req.headers['user-agent'] || '';
    req._referrer = req.headers['referer'] || req.headers['referrer'] || '';
    next();
});

// Serve static files from the project root directory
app.use(express.static(path.join(__dirname)));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from specific directories
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/imgs', express.static(path.join(__dirname, 'imgs')));
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

// --- Analytics endpoints are now under /api/logs/analytics/* ---
// (Handled by routes/logRoutes.js, already registered in routes/index.js)

// Routes
app.use('/api', require('./routes/index'));

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log(`Index Page: http://${HOST}:${PORT}/index.html`);
});

module.exports = app;
