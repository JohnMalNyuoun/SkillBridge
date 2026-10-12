const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/Users');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    // Delete existing admin if any
    await User.deleteOne({ email: 'admin@fursahub.com' });

    // Create fresh admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
      fullName: 'FursaHub Admin',
      email: 'admin@fursahub.com',
      password: hashedPassword,
      communityType: 'host_community',
      role: 'admin',
      isActive: true,
      isVerified: true
    });

    console.log('Admin created successfully:', admin.email);
    process.exit(0);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

createAdmin();