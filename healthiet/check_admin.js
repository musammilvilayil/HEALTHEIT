// Test script to check admin user in database
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkAdminUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthiet1');
        console.log('Connected to database');

        const admin = await User.findOne({ email: 'admin@healthiet.com' });
        if (admin) {
            console.log('Admin user found:');
            console.log('Email:', admin.email);
            console.log('Role:', admin.role);
            console.log('isAdmin:', admin.isAdmin);
            console.log('firstName:', admin.firstName);
            console.log('lastName:', admin.lastName);
        } else {
            console.log('Admin user not found');
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAdminUser();
