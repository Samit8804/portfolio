const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('../backend/config/db');

// Route imports
const adminRoutes = require('../backend/routes/admin');
const projectRoutes = require('../backend/routes/projects');
const certificateRoutes = require('../backend/routes/certificates');
const contactRoutes = require('../backend/routes/contact');
const resumeRoutes = require('../backend/routes/resume');

const app = express();

// Connect to MongoDB (lazy connect for serverless)
let dbConnected = false;
const ensureDB = async () => {
  if (!dbConnected) {
    dbConnected = await connectDB();
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB connection before API routes
app.use(async (req, res, next) => {
  await ensureDB();
  next();
});

// Rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many contact attempts. Please try again later.'
  }
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/resume', resumeRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'backend', 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Export for Vercel serverless
module.exports = app;
