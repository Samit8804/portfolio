const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

try { require('dotenv').config(); } catch(e) {}

// Load models
const Project = require('../backend/models/Project');
const Certificate = require('../backend/models/Certificate');
const Contact = require('../backend/models/Contact');
const Admin = require('../backend/models/Admin');
const Resume = require('../backend/models/Resume');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isServerless = process.env.VERCEL === '1' || process.env.RENDER;

// Multer configuration for project images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = isServerless
      ? path.join('/tmp', 'uploads', 'projects')
      : path.join(__dirname, '..', 'backend', 'uploads', 'projects');

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadProjectImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, webp, gif) are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
}).array('images', 5);

// Lazy DB connection
let dbConnected = false;
let dbError = null;

async function ensureDB() {
  if (dbConnected) return;
  if (dbError) throw dbError;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    dbConnected = true;
  } catch (err) {
    dbError = err;
    console.error('MongoDB Error:', err.message);
    throw err;
  }
}

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

// ===== ADMIN =====

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
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

app.get('/api/admin/me', protect, async (req, res) => {
  res.json({ success: true, admin: { id: req.admin._id, name: req.admin.name, email: req.admin.email } });
});

// ===== PROJECTS =====

app.get('/api/projects', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    let query = {};
    if (category && category !== 'All') query.category = category;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { techStack: { $regex: search, $options: 'i' } }
    ];
    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ order: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, count: projects.length, total, totalPages: Math.ceil(total / limit), currentPage: parseInt(page), projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/projects', protect, uploadProjectImages, async (req, res) => {
  try {
    const { title, description, techStack, category, githubUrl, liveUrl, featured, order } = req.body;
    const images = req.files ? req.files.map(f => `/uploads/projects/${f.filename}`) : [];

    const project = await Project.create({
      title, description,
      techStack: techStack ? techStack.split(',').map(t => t.trim()) : [],
      category: category || 'Web', githubUrl, liveUrl, images,
      featured: featured === 'true' || featured === true,
      order: order || 0
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/projects/:id', protect, uploadProjectImages, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { title, description, techStack, category, githubUrl, liveUrl, featured, order, keepImages } = req.body;

    if (title) project.title = title;
    if (description) project.description = description;
    if (techStack) project.techStack = techStack.split(',').map(t => t.trim());
    if (category) project.category = category;
    if (githubUrl !== undefined) project.githubUrl = githubUrl;
    if (liveUrl !== undefined) project.liveUrl = liveUrl;
    if (featured !== undefined) project.featured = featured === 'true' || featured === true;
    if (order !== undefined) project.order = order;

    const newImages = req.files ? req.files.map(f => `/uploads/projects/${f.filename}`) : [];
    if (keepImages) {
      project.images = [...JSON.parse(keepImages), ...newImages];
    } else if (newImages.length > 0) {
      project.images = [...project.images, ...newImages];
    }

    await project.save();
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/projects/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.images.forEach(img => {
      const filePath = isServerless
        ? path.join('/tmp', img)
        : path.join(__dirname, '..', 'backend', img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== CERTIFICATES =====

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
    const { title, issuer, date, credentialUrl } = req.body;
    const certificate = await Certificate.create({ title, issuer, date: date || Date.now(), credentialUrl });
    res.status(201).json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/certificates/:id', protect, async (req, res) => {
  try {
    await Certificate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== CONTACT =====

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Name, email, and message required' });
    const contact = await Contact.create({ name, email, subject: subject || 'No Subject', message });
    res.status(201).json({ success: true, message: 'Message sent successfully!', contact });
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
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== RESUME =====

app.get('/api/resume/download', async (req, res) => {
  try {
    const resume = await Resume.findOne({ active: true }).sort({ createdAt: -1 });
    if (!resume) return res.status(404).json({ success: false, message: 'No resume available' });
    resume.downloadCount += 1;
    await resume.save();

    const filePath = isServerless
      ? path.join('/tmp', resume.filepath)
      : path.join(__dirname, '..', 'backend', resume.filepath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Resume file not found' });
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

// Serve uploaded files
const uploadsPath = isServerless ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'backend', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Serve frontend
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

// Start server only if not on Vercel/Render serverless
if (!isServerless) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
