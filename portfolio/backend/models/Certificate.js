const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Certificate title is required'],
    trim: true,
    maxlength: 200
  },
  issuer: {
    type: String,
    trim: true,
    maxlength: 100
  },
  date: {
    type: Date,
    default: Date.now
  },
  image: {
    type: String,
    required: [true, 'Certificate image is required']
  },
  credentialUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Certificate', certificateSchema);
