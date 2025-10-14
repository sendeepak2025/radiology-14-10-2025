require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dicomdb');
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ username: 'admin' });
    if (existingUser) {
      console.log('✅ Test user already exists: admin');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      await mongoose.disconnect();
      return;
    }

    // Create test user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const user = new User({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin', 'user'],
      permissions: ['*'],
      isActive: true,
      isVerified: true,
      mfaEnabled: false
    });

    await user.save();
    console.log('✅ Test user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@example.com');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
