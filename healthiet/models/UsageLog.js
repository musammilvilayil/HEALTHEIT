const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  eventType: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  pageUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  referrer: String,
}, { timestamps: true });

schema.index({ createdAt: -1 });
module.exports = mongoose.model('UsageLog', schema);
