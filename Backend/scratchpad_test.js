import mongoose from 'mongoose';
import { FoodOrder } from './src/modules/food/orders/models/order.model.js';
import { FoodDeliveryPartner } from './src/modules/food/delivery/models/deliveryPartner.model.js';
import { getCurrentTripDelivery } from './src/modules/food/orders/services/order-delivery.service.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eatayu');
  console.log('Connected to DB');
  
  const partner = await FoodDeliveryPartner.findOne();
  console.log('Partner:', partner?._id);
  
  if (partner) {
    try {
      const trip = await getCurrentTripDelivery(partner._id);
      console.log('Trip:', trip);
    } catch (err) {
      console.error('Error in getCurrentTripDelivery:', err);
    }
  }
  
  process.exit(0);
}
run();
