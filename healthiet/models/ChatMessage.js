const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  readAt: Date,
}, { timestamps: true });

schema.index({ sender: 1, receiver: 1, createdAt: 1 });
module.exports = mongoose.model('ChatMessage', schema);
