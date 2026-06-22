const express = require('express');
const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume');
const { protect } = require('../middleware/auth');
const { uploadResume } = require('../middleware/upload');

const router = express.Router();

// GET /api/resume/download - Download latest resume (public)
router.get('/download', async (req, res) => {
  try {
    const resume = await Resume.findOne({ active: true }).sort({ createdAt: -1 });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'No resume available'
      });
    }

    const isVercel = process.env.VERCEL === '1';
    const filePath = isVercel
      ? path.join('/tmp', resume.filepath)
      : path.join(__dirname, '..', resume.filepath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found'
      });
    }

    // Increment download count
    resume.downloadCount += 1;
    await resume.save();

    res.download(filePath, resume.filename);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/resume/stats - Get resume stats (admin only)
router.get('/stats', protect, async (req, res) => {
  try {
    const resume = await Resume.findOne({ active: true }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      downloadCount: resume ? resume.downloadCount : 0,
      hasResume: !!resume,
      filename: resume ? resume.filename : null,
      uploadedAt: resume ? resume.createdAt : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/resume/upload - Upload resume (admin only)
router.post('/upload', protect, (req, res) => {
  uploadResume(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PDF file'
        });
      }

      // Deactivate all previous resumes
      await Resume.updateMany({}, { active: false });

      const resume = await Resume.create({
        filename: req.file.originalname,
        filepath: `/uploads/resume/${req.file.filename}`,
        active: true
      });

      res.status(201).json({
        success: true,
        message: 'Resume uploaded successfully',
        resume
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  });
});

module.exports = router;
