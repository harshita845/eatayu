import mongoose from 'mongoose';
import { FoodItem } from './src/modules/food/admin/models/food.model.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    // Indori Poha -> Breakfast
    const poha = await FoodItem.updateMany(
      { name: /Poha/i },
      { $set: { categoryName: "Breakfast" } }
    );
    console.log("Poha updated:", poha);

    // Jalebi -> Sweets
    const jalebi = await FoodItem.updateMany(
      { name: /Jalebi/i },
      { $set: { categoryName: "Sweets" } }
    );
    console.log("Jalebi updated:", jalebi);

    // Bhutte Ka Kees -> Snacks
    const bhutte = await FoodItem.updateMany(
      { name: /Bhutte/i },
      { $set: { categoryName: "Snacks" } }
    );
    console.log("Bhutte updated:", bhutte);

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
