import mongoose from 'mongoose';
import { FoodCategory } from './src/modules/food/admin/models/category.model.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    const categories = await FoodCategory.find().select('name').lean();
    console.log(JSON.stringify(categories, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
