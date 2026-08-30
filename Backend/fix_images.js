import { connectDB, disconnectDB } from './src/config/db.js';
import mongoose from 'mongoose';

async function fixImages() {
  await connectDB();
  console.log("Connected to DB.");

  const db = mongoose.connection.db;

  try {
    const foods = db.collection('foods');
    const allFoods = await foods.find({}).toArray();
    let foodsUpdated = 0;
    for (const food of allFoods) {
      if (food.image && food.image.includes('localhost:5174')) {
        const newUrl = food.image.replace(/http:\/\/localhost:5174/g, '');
        await foods.updateOne({ _id: food._id }, { $set: { image: newUrl } });
        foodsUpdated++;
      }
    }
    console.log(`Fixed ${foodsUpdated} foods.`);

    const addons = db.collection('addons');
    const allAddons = await addons.find({}).toArray();
    let addonsUpdated = 0;
    for (const addon of allAddons) {
      if (addon.image && addon.image.includes('localhost:5174')) {
        const newUrl = addon.image.replace(/http:\/\/localhost:5174/g, '');
        await addons.updateOne({ _id: addon._id }, { $set: { image: newUrl } });
        addonsUpdated++;
      }
    }
    console.log(`Fixed ${addonsUpdated} addons.`);

    const restaurants = db.collection('restaurants');
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
    console.log(`Fixed ${restaurantsUpdated} restaurants.`);

  } catch (err) {
    console.error(err);
  } finally {
    await disconnectDB();
  }
}
fixImages();
