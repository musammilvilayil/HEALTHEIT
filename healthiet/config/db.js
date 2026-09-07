const mongoose = require('mongoose');

async function connectDB() {
  if (process.env.NODE_ENV === 'production' && !process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required in production');
  }
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthiet';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
  return mongoose.connection;
}

module.exports = connectDB;
