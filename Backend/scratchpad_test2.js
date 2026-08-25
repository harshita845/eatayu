import mongoose from 'mongoose';
import { FoodOrder } from './src/modules/food/orders/models/order.model.js';
import { getCurrentTripDelivery } from './src/modules/food/orders/services/order-delivery.service.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eatayu');
  console.log('Connected to DB');
  
  const order = await FoodOrder.findOne({ order_id: 'FOD-0842083344' });
  console.log('Order:', order?._id);
  
  if (order && order.dispatch?.deliveryPartnerId) {
    console.log('Partner:', order.dispatch.deliveryPartnerId);
    try {
      const trip = await getCurrentTripDelivery(order.dispatch.deliveryPartnerId);
      console.log('Trip fetched successfully. Trip length / ID:', trip?._id);
    } catch (err) {
      console.error('Error in getCurrentTripDelivery:', err);
    }
  }
  
  process.exit(0);
}
run();
