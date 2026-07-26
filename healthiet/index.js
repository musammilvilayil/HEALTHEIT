const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the root and /css, /imgs, /js, etc.
app.use(express.static(path.join(__dirname)));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/imgs', express.static(path.join(__dirname, 'imgs')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// ...existing code...