const mongoose = require('mongoose');
const connectDB = require('./config/database');
const MenuItem = require('./models/MenuItem');
const demoMenu = require('./seed.js');

console.log('🚀 Starting database seeding...');

/**
 * Seed demo menu items
 * Run: node seeder.js
 * Warning: Clears all existing MenuItems!
 */
const seedDB = async () => {
  try {
    // Connect to DB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('🗑️  Cleared existing menu items');

    // Insert demo data with full validation
    const seededItems = await Promise.all(
      demoMenu.map(async (item, index) => {
        console.log(`Seeding ${index + 1}/${demoMenu.length}: ${item.name}`);
        return await MenuItem.create(item);
      })
    );
    console.log(`✅ Seeded ${demoMenu.length} menu items successfully!`);
    console.log('Sample:', seededItems[0].name);

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDB();

