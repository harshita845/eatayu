import mongoose from 'mongoose';
import { FoodItem } from './src/modules/food/admin/models/food.model.js';
import { FoodCategory } from './src/modules/food/admin/models/category.model.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    const categories = await FoodCategory.find().lean();
    const categoryMap = {};
    for (const cat of categories) {
      if (!categoryMap[cat.name]) categoryMap[cat.name] = cat._id;
    }

    const items = await FoodItem.find({ name: { $in: ['Indori Poha', 'Crispy Jalebi'] } });
    for (const item of items) {
      const correctId = categoryMap[item.categoryName];
      if (correctId && String(item.categoryId) !== String(correctId)) {
        item.categoryId = correctId;
        await item.save();
        console.log(`Updated ${item.name} to categoryId ${correctId}`);
      }
    }
    
    // Check if there are any others
    const allItems = await FoodItem.find();
    for (const item of allItems) {
        if (item.categoryName) {
            const correctId = categoryMap[item.categoryName];
            if (correctId && String(item.categoryId) !== String(correctId)) {
                item.categoryId = correctId;
                await item.save();
                console.log(`Updated ${item.name} to categoryId ${correctId} (categoryName: ${item.categoryName})`);
            }
        }
    }

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
