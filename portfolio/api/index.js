const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

try { require('dotenv').config(); } catch(e) {}

const isVercel = process.env.VERCEL === '1';

// Load models
const Project = require('../backend/models/Project');
const Certificate = require('../backend/models/Certificate');
const Contact = require('../backend/models/Contact');
const Admin = require('../backend/models/Admin');
const Resume = require('../backend/models/Resume');

const { uploadProjectImages, uploadResume } = require('../backend/middleware/upload');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lazy DB connection
let dbConnected = false;
let dbError = null;

async function autoSeed() {
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    await Admin.create({
      name: process.env.ADMIN_NAME || 'Samit Fartyal',
      email: process.env.ADMIN_EMAIL || 'samitfartyal@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'Samit@2026'
    });
    console.log('Admin auto-seeded');
  }

  const projectCount = await Project.countDocuments();
  if (projectCount === 0) {
    await Project.insertMany([
      { title: 'E-Commerce Platform', description: 'A full-featured e-commerce platform with user authentication, product catalog, shopping cart, payment integration using Stripe, and an admin dashboard.', techStack: ['React', 'Node.js', 'MongoDB', 'Stripe', 'Redux'], category: 'Web', featured: true, order: 3 },
      { title: 'AI Image Generator', description: 'An AI-powered image generation tool using OpenAI DALL-E API. Users can describe what they want and the AI generates unique images.', techStack: ['Next.js', 'OpenAI API', 'Tailwind CSS', 'Prisma'], category: 'AI', featured: true, order: 2 },
      { title: 'Real-time Chat Application', description: 'A real-time messaging app built with Socket.io supporting private chats, group conversations, message reactions, file sharing, and online status indicators.', techStack: ['React', 'Socket.io', 'Express', 'MongoDB'], category: 'Web', order: 1 },
      { title: 'REST API for Task Manager', description: 'A robust RESTful API with JWT authentication, CRUD operations, input validation, error handling, rate limiting, and comprehensive API documentation.', techStack: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Swagger'], category: 'Backend', order: 0 }
    ]);
    console.log('Sample projects auto-seeded');
  }

  // Ensure resume file is available (copy to /tmp/ every time on Vercel)
  const resumePaths = [
    path.join(__dirname, 'Samit_Fartyal_Resume.pdf.pdf'),
    path.join(__dirname, '..', 'backend', 'uploads', 'resume', 'Samit_Fartyal_Resume.pdf.pdf'),
  ];
  let staticResumePath = null;
  for (const p of resumePaths) {
    if (fs.existsSync(p)) { staticResumePath = p; break; }
  }
  if (staticResumePath) {
    if (isVercel) {
      const tmpDir = path.join('/tmp', 'uploads', 'resume');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      fs.copyFileSync(staticResumePath, path.join(tmpDir, 'Samit_Fartyal_Resume.pdf.pdf'));
    }
    const resumeCount = await Resume.countDocuments();
    if (resumeCount === 0) {
      await Resume.create({
        filename: 'Samit_Fartyal_Resume.pdf',
        filepath: '/uploads/resume/Samit_Fartyal_Resume.pdf.pdf',
        active: true
      });
      console.log('Resume auto-seeded');
    }
  }
}

async function ensureDB() {
  if (dbConnected) return;
  if (dbError) throw dbError;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    dbConnected = true;
    await autoSeed();
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
    const images = req.files ? req.files.map(f => f.path || `/uploads/projects/${f.filename}`) : [];

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

    const newImages = req.files ? req.files.map(f => f.path || `/uploads/projects/${f.filename}`) : [];
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
      const filePath = isVercel
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
    // Try multiple paths where the resume file might be
    const paths = [
      path.join(__dirname, 'Samit_Fartyal_Resume.pdf.pdf'),
      path.join(__dirname, '..', 'backend', 'uploads', 'resume', 'Samit_Fartyal_Resume.pdf.pdf'),
    ];
    if (isVercel) {
      paths.push(path.join('/tmp', 'uploads', 'resume', 'Samit_Fartyal_Resume.pdf.pdf'));
    }

    let filePath = null;
    for (const p of paths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (filePath) {
      const resume = await Resume.findOne({ active: true }).sort({ createdAt: -1 });
      if (resume) {
        resume.downloadCount += 1;
        await resume.save();
      }
      return res.download(filePath, 'Samit_Fartyal_Resume.pdf');
    }

    return res.status(404).json({ success: false, message: 'No resume available' });
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

app.delete('/api/resume', protect, async (req, res) => {
  try {
    await Resume.deleteMany({});
    res.json({ success: true, message: 'Resume deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/resume/upload', protect, (req, res) => {
  uploadResume(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
      }

      await Resume.updateMany({}, { active: false });

      const resume = await Resume.create({
        filename: req.file.originalname,
        filepath: `/uploads/resume/${req.file.filename}`,
        active: true
      });

      res.status(201).json({ success: true, message: 'Resume uploaded successfully', resume });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
});

// Serve uploaded files
const uploadsPath = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'backend', 'uploads');
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

// Start server only when running locally
if (!isVercel) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
