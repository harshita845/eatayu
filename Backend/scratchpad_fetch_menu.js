import mongoose from 'mongoose';
import { getPublicApprovedRestaurantMenu } from './src/modules/food/restaurant/services/restaurantMenu.service.js';

mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster')
  .then(async () => {
    const menu = await getPublicApprovedRestaurantMenu('6a8490d0a04d116a4feea0c4');
    console.log(JSON.stringify(menu, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
