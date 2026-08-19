import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

import { FoodOrder } from './src/modules/food/orders/models/order.model.js';

try {
  const orders = await FoodOrder.find({}).sort({ createdAt: -1 }).limit(5).lean();
  console.log("LAST 5 ORDERS:");
  orders.forEach(o => {
    console.log(`ID: ${o._id}, DisplayId: ${o.orderId || o.order_id}, Status: ${o.orderStatus}, CreatedAt: ${o.createdAt}`);
  });
} catch (err) {
  console.error(err);
} finally {
  await mongoose.disconnect();
}
