const express = require('express');
const path = require('path');
const cors = require('cors');

// Load env vars - works both locally (dotenv) and on Vercel (dashboard vars)
try { require('dotenv').config(); } catch(e) {}

const app = express();

// CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lazy DB connection
let dbConnected = false;
let dbError = null;

async function ensureDB() {
  if (dbConnected) return;
  if (dbError) throw dbError;

  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    dbConnected = true;
  } catch (err) {
    dbError = err;
    console.error('MongoDB Error:', err.message);
    throw err;
  }
}

// Connect DB before API routes
app.use('/api', async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Rate limiter
const rateLimit = require('express-rate-limit');
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many attempts. Try again later.' }
});

// Load models
const Project = require('../backend/models/Project');
const Certificate = require('../backend/models/Certificate');
const Contact = require('../backend/models/Contact');
const Admin = require('../backend/models/Admin');
const Resume = require('../backend/models/Resume');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ===== ROUTES =====

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Auth middleware
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id);
    if (!req.admin) return res.status(401).json({ success: false, message: 'Admin not found' });
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Projects CRUD
app.get('/api/projects', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    let query = {};
    if (category && category !== 'All') query.category = category;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    const total = await Project.countDocuments(query);
    const projects = await Project.find(query).sort({ order: -1, createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, count: projects.length, total, totalPages: Math.ceil(total / limit), projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/projects', protect, async (req, res) => {
  try {
    const { title, description, techStack, category, githubUrl, liveUrl, featured, order } = req.body;
    const project = await Project.create({
      title, description,
      techStack: techStack ? (typeof techStack === 'string' ? techStack.split(',').map(t => t.trim()) : techStack) : [],
      category: category || 'Web', githubUrl, liveUrl,
      featured: featured === 'true' || featured === true, order: order || 0
    });
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/projects/:id', protect, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Certificates CRUD
app.get('/api/certificates', async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });
    res.json({ success: true, count: certificates.length, certificates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/certificates', protect, async (req, res) => {
  try {
    const { title, issuer, date, credentialUrl, image } = req.body;
    const cert = await Certificate.create({ title, issuer, date: date || Date.now(), image: image || '', credentialUrl });
    res.status(201).json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/certificates/:id', protect, async (req, res) => {
  try {
    await Certificate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Contact
app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Name, email, and message required' });
    const contact = await Contact.create({ name, email, subject: subject || 'No Subject', message });
    res.status(201).json({ success: true, message: 'Message sent!', contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/contact', protect, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/contact/:id/read', protect, async (req, res) => {
  try {
    const msg = await Contact.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/contact/:id', protect, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Resume
app.get('/api/resume/download', async (req, res) => {
  try {
    const resume = await Resume.findOne({ active: true }).sort({ createdAt: -1 });
    if (!resume) return res.status(404).json({ success: false, message: 'No resume' });
    resume.downloadCount += 1;
    await resume.save();
    const filePath = path.join(__dirname, '..', resume.filepath);
    res.download(filePath, resume.filename);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/resume/stats', protect, async (req, res) => {
  try {
    const resume = await Resume.findOne({ active: true }).sort({ createdAt: -1 });
    res.json({ success: true, downloadCount: resume?.downloadCount || 0, hasResume: !!resume, filename: resume?.filename, uploadedAt: resume?.createdAt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/resume/upload', protect, async (req, res) => {
  try {
    const { filename, filepath } = req.body;
    await Resume.updateMany({}, { active: false });
    const resume = await Resume.create({ filename: filename || 'resume.pdf', filepath: filepath || '/uploads/resume/resume.pdf', active: true });
    res.status(201).json({ success: true, message: 'Resume uploaded', resume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server running', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: 'Server error', error: err.message });
});

module.exports = app;
