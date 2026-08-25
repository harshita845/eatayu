import mongoose from 'mongoose';
import { FoodItem } from './src/modules/food/admin/models/food.model.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    const items = await FoodItem.find({ restaurantId: '6a8490d0a04d116a4feea0c4' }).select('name categoryName').lean();
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
