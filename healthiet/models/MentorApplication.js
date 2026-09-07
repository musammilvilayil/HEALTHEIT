const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone: String,
  location: String,
  specialization: { type: [String], default: [] },
  experience: { type: Number, default: 0 },
  certifications: String,
  education: String,
  statement: String,
  links: { type: [String], default: [] },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MentorApplication', schema);
