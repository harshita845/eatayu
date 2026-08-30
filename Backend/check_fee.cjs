const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster');
  
  const db = mongoose.connection.db;
  const fees = await db.collection('food_fee_settings').find({isActive: {$ne: false}}).sort({createdAt: -1}).limit(1).toArray();
  console.log(JSON.stringify(fees[0], null, 2));
  
  await mongoose.disconnect();
}

check().catch(console.error);
