const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`MongoDB Warning: ${error.message}`);
    console.warn('Server will run without database. API routes may not work.');
    return false;
  }
};

module.exports = connectDB;
