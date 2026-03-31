const express = require('express');
const Certificate = require('../models/Certificate');
const { protect } = require('../middleware/auth');
const { uploadCertificateImage } = require('../middleware/upload');

const router = express.Router();

// GET /api/certificates - Get all certificates (public)
router.get('/', async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/certificates - Create certificate (admin only)
router.post('/', protect, (req, res) => {
  uploadCertificateImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const { title, issuer, date, credentialUrl } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Certificate image is required'
        });
      }

      const certificate = await Certificate.create({
        title,
        issuer,
        date: date || Date.now(),
        image: `/uploads/certificates/${req.file.filename}`,
        credentialUrl
      });

      res.status(201).json({
        success: true,
        certificate
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

// DELETE /api/certificates/:id - Delete certificate (admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Delete associated image
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', certificate.image);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Certificate.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
