import mongoose from 'mongoose';
import { FoodItem } from './src/modules/food/admin/models/food.model.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    // Poha image
    const poha = await FoodItem.updateMany(
      { name: /Poha/i },
      { $set: { image: "https://images.unsplash.com/photo-1605333396593-0130db5f5592?w=400&h=300&fit=crop" } }
    );
    console.log("Poha image updated:", poha);

    // Jalebi image
    const jalebi = await FoodItem.updateMany(
      { name: /Jalebi/i },
      { $set: { image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop" } }
    );
    console.log("Jalebi image updated:", jalebi);

    // Bhutte image
    const bhutte = await FoodItem.updateMany(
      { name: /Bhutte/i },
      { $set: { image: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&h=300&fit=crop" } }
    );
    console.log("Bhutte image updated:", bhutte);

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
