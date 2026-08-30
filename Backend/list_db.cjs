require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
async function list() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log(collections.map(c => c.name));
  const foods = await db.collection('fooditems').find({}).limit(5).toArray();
  foods.forEach(f => console.log(f.name, f.image));
  process.exit(0);
}
list();
