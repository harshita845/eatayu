import mongoose from 'mongoose';
import { FoodRestaurant } from './src/modules/food/restaurant/models/restaurant.model.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    const items = await FoodRestaurant.find().select('restaurantName name coverImages profileImage onboarding.step2').lean();
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
