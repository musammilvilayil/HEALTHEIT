const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  weightRecorded: Number,
  measurements: mongoose.Schema.Types.Mixed,
  workoutLog: String,
  notes: String,
  completion: { type: Number, min: 0, max: 100, default: 0 },
}, { timestamps: true });

schema.index({ userId: 1, date: -1 });
module.exports = mongoose.model('Progress', schema);
