require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function getOrder() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const order = await db.collection('food_orders').findOne({ _id: new mongoose.Types.ObjectId('6a8ff9dc0e1bb43677ef817c') });
  console.log(JSON.stringify(order, null, 2));
  process.exit(0);
}
getOrder();
