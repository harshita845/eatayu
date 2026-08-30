require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function fixImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB.");

    const db = mongoose.connection.db;
    
    // Fix foods collection
    const foods = db.collection('food_items');
    const allFoods = await foods.find({}).toArray();
    let foodsUpdated = 0;
    for (const food of allFoods) {
      if (food.image && food.image.includes('localhost:5174')) {
        const newUrl = food.image.replace(/http:\/\/localhost:5174/g, '');
        await foods.updateOne({ _id: food._id }, { $set: { image: newUrl } });
        foodsUpdated++;
      }
    }
    console.log(`Fixed ${foodsUpdated} food_items.`);

    // Fix addons collection
    const addons = db.collection('food_addons');
    const allAddons = await addons.find({}).toArray();
    let addonsUpdated = 0;
    for (const addon of allAddons) {
      if (addon.image && addon.image.includes('localhost:5174')) {
        const newUrl = addon.image.replace(/http:\/\/localhost:5174/g, '');
        await addons.updateOne({ _id: addon._id }, { $set: { image: newUrl } });
        addonsUpdated++;
      }
    }
    console.log(`Fixed ${addonsUpdated} food_addons.`);

    // Fix restaurants collection
    const restaurants = db.collection('food_restaurants');
    const allRestaurants = await restaurants.find({}).toArray();
    let restaurantsUpdated = 0;
    for (const restaurant of allRestaurants) {
      let updated = false;
      let updateDoc = {};
      if (restaurant.image && restaurant.image.includes('localhost:5174')) {
        updateDoc.image = restaurant.image.replace(/http:\/\/localhost:5174/g, '');
        updated = true;
      }
      if (restaurant.profileImage && restaurant.profileImage.includes('localhost:5174')) {
        updateDoc.profileImage = restaurant.profileImage.replace(/http:\/\/localhost:5174/g, '');
        updated = true;
      }
      if (restaurant.categoryDishImage && restaurant.categoryDishImage.includes('localhost:5174')) {
        updateDoc.categoryDishImage = restaurant.categoryDishImage.replace(/http:\/\/localhost:5174/g, '');
        updated = true;
      }
      if (updated) {
        await restaurants.updateOne({ _id: restaurant._id }, { $set: updateDoc });
        restaurantsUpdated++;
      }
    }
    console.log(`Fixed ${restaurantsUpdated} food_restaurants.`);

    console.log("Done!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fixImages();
