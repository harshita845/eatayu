import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

import { FoodOrder } from './src/modules/food/orders/models/order.model.js';

try {
  const order = await FoodOrder.findById('6a85c0a87ecbe3428ddbc5ad').lean();
  console.log("ORDER DATA:");
  console.log(JSON.stringify(order, null, 2));
} catch (err) {
  console.error(err);
} finally {
  await mongoose.disconnect();
}
