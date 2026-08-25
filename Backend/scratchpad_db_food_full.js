import mongoose from 'mongoose';
import { FoodItem } from './src/modules/food/admin/models/food.model.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    const item = await FoodItem.findById('6a8d677cb5142e32a0a68f8a').lean();
    console.log(JSON.stringify(item, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
