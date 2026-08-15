const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const adminCollection = mongoose.connection.collection('food_admins');
    const existingAdmin = await adminCollection.findOne({ email: 'admin@eatayu.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists! (Email: admin@eatayu.com)');
      // Re-hash and force update password
      const newHash = await bcrypt.hash('admin123', 10);
      await adminCollection.updateOne(
        { email: 'admin@eatayu.com' },
        { $set: { password: newHash } }
      );
      console.log('Updated existing admin password to: admin123');
    } else {
      const hash = await bcrypt.hash('admin123', 10);
      await adminCollection.insertOne({
        email: 'admin@eatayu.com',
        password: hash,
        name: 'Super Admin',
        phone: '9999999999',
        profileImage: '',
        fcmTokens: [],
        fcmTokenMobile: [],
        role: 'ADMIN',
        adminType: 'super_admin',
        isActive: true,
        isDeleted: false,
        servicesAccess: ['food', 'quickCommerce', 'taxi'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Successfully created a new admin account!');
      console.log('Email: admin@eatayu.com | Password: admin123');
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
