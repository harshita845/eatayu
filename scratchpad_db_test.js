import mongoose from 'mongoose';
import { FoodItem } from './Backend/src/modules/food/admin/models/food.model.js';

mongoose.connect('mongodb+srv://EatAyu:EatAyu%40123@cluster0.lvpvpob.mongodb.net/eatayu?retryWrites=true&w=majority')
  .then(async () => {
    const items = await FoodItem.find({ name: /Poha/i }).lean();
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
