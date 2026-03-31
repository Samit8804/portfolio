const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('./models/Admin');
const Project = require('./models/Project');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Admin.deleteMany({});
    await Project.deleteMany({});

    // Create admin
    const admin = await Admin.create({
      name: process.env.ADMIN_NAME || 'Samit Fartyal',
      email: process.env.ADMIN_EMAIL || 'samitfartyal@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'Samit@2026'
    });
    console.log('Admin created:', admin.email);

    // Seed sample projects
    const sampleProjects = [
      {
        title: 'E-Commerce Platform',
        description: 'A full-featured e-commerce platform with user authentication, product catalog, shopping cart, payment integration using Stripe, and an admin dashboard for managing products and orders.',
        techStack: ['React', 'Node.js', 'MongoDB', 'Stripe', 'Redux'],
        category: 'Web',
        githubUrl: 'https://github.com/samitfartyal',
        liveUrl: '#',
        featured: true,
        order: 3
      },
      {
        title: 'AI Image Generator',
        description: 'An AI-powered image generation tool using OpenAI DALL-E API. Users can describe what they want and the AI generates unique images. Includes prompt history and favorites.',
        techStack: ['Next.js', 'OpenAI API', 'Tailwind CSS', 'Prisma'],
        category: 'AI',
        githubUrl: 'https://github.com/samitfartyal',
        liveUrl: '#',
        featured: true,
        order: 2
      },
      {
        title: 'Real-time Chat Application',
        description: 'A real-time messaging app built with Socket.io supporting private chats, group conversations, message reactions, file sharing, and online status indicators.',
        techStack: ['React', 'Socket.io', 'Express', 'MongoDB'],
        category: 'Web',
        githubUrl: 'https://github.com/samitfartyal',
        liveUrl: '#',
        featured: false,
        order: 1
      },
      {
        title: 'REST API for Task Manager',
        description: 'A robust RESTful API with JWT authentication, CRUD operations, input validation, error handling, rate limiting, and comprehensive API documentation.',
        techStack: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Swagger'],
        category: 'Backend',
        githubUrl: 'https://github.com/samitfartyal',
        liveUrl: '#',
        featured: false,
        order: 0
      }
    ];

    await Project.insertMany(sampleProjects);
    console.log('Sample projects seeded');

    console.log('\nSeed complete!');
    console.log('Admin login:');
    console.log(`  Email: ${process.env.ADMIN_EMAIL || 'samitfartyal@gmail.com'}`);
    console.log(`  Password: ${process.env.ADMIN_PASSWORD || 'Samit@2026'}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
