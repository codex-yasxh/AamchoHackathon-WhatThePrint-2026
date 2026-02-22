const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const jobRoutes = require('./routes/jobs');

const app = express();
const port = process.env.PORT || 3000;

// Core middleware
app.use(cors());
app.use(express.json());

// Basic write limiter to reduce abuse on mutating endpoints
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many write requests. Please try again later.' }
});

// Stricter limiter for upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many upload requests. Please try again later.' }
});

app.use('/api/jobs/upload', uploadLimiter);
app.use('/api/jobs/:id/approve', writeLimiter);
app.use('/api/jobs/:id/status', writeLimiter);

// Root route for quick browser checks
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Print backend API is running',
    endpoints: [
      'GET /health',
      'POST /api/jobs/upload',
      'GET /api/jobs',
      'GET /api/jobs/stats',
      'GET /api/jobs/:id',
      'GET /api/jobs/:id/queue',
      'PUT /api/jobs/:id/approve',
      'PUT /api/jobs/:id/status'
    ]
  });
});

// Health check for uptime monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// Job routes
app.use('/api/jobs', jobRoutes);

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`[BOOT] Server running on port ${port}`);
});
