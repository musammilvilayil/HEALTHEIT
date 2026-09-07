const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['Admin', 'Mentor', 'Mentee'], default: 'Mentee', index: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  firstName: { type: String, trim: true, default: '' },
  lastName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  age: Number,
  gender: String,
  height: Number,
  weight: Number,
  activityLevel: String,
  healthConditions: String,
  fitnessExperience: String,
  timezone: String,
  language: { type: String, default: 'English' },
  goals: { type: [String], default: [] },
  dietaryPreferences: { type: [String], default: [] },
  notifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  specialty: { type: [String], default: [] },
  bio: { type: String, maxlength: 1000, default: '' },
  certifications: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  education: { type: String, default: '' },
  location: { type: String, default: '' },
  languages: { type: [String], default: [] },
  availability: { type: String, default: '' },
  rates: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  website: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  profilePhotoUrl: { type: String, default: '' },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  mentorHistory: [{
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    unassignedAt: Date,
    reason: String,
  }],
  mentorApplicationStatus: {
    type: String,
    enum: ['Not Applied', 'Pending', 'Approved', 'Rejected'],
    default: 'Not Applied'
  },
  resetTokenHash: { type: String, select: false, default: null },
  resetTokenExpires: { type: Date, select: false, default: null },
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetTokenHash;
  delete obj.resetTokenExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
