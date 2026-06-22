const express = require('express');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const { uploadProjectImages } = require('../middleware/upload');

const router = express.Router();

// GET /api/projects - Get all projects (public)
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;

    let query = {};
    if (category && category !== 'All') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { techStack: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ order: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/projects/:id - Get single project (public)
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/projects - Create project (admin only)
router.post('/', protect, (req, res) => {
  uploadProjectImages(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const { title, description, techStack, category, githubUrl, liveUrl, featured, order } = req.body;

      const images = req.files ? req.files.map(f => f.path || `/uploads/projects/${f.filename}`) : [];

      const project = await Project.create({
        title,
        description,
        techStack: techStack ? techStack.split(',').map(t => t.trim()) : [],
        category: category || 'Web',
        githubUrl,
        liveUrl,
        images,
        featured: featured === 'true',
        order: order || 0
      });

      res.status(201).json({
        success: true,
        project
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

// PUT /api/projects/:id - Update project (admin only)
router.put('/:id', protect, (req, res) => {
  uploadProjectImages(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const { title, description, techStack, category, githubUrl, liveUrl, featured, order, keepImages } = req.body;

      if (title) project.title = title;
      if (description) project.description = description;
      if (techStack) project.techStack = techStack.split(',').map(t => t.trim());
      if (category) project.category = category;
      if (githubUrl !== undefined) project.githubUrl = githubUrl;
      if (liveUrl !== undefined) project.liveUrl = liveUrl;
      if (featured !== undefined) project.featured = featured === 'true';
      if (order !== undefined) project.order = order;

      // Handle images
      const newImages = req.files ? req.files.map(f => f.path || `/uploads/projects/${f.filename}`) : [];
      if (keepImages) {
        const existingImages = JSON.parse(keepImages || '[]');
        project.images = [...existingImages, ...newImages];
      } else if (newImages.length > 0) {
        project.images = [...project.images, ...newImages];
      }

      await project.save();

      res.status(200).json({
        success: true,
        project
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

// DELETE /api/projects/:id - Delete project (admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
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
