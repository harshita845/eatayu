import { connectDB, disconnectDB } from './src/config/db.js';
import mongoose from 'mongoose';

async function check() {
  await connectDB();
  const db = mongoose.connection.db;
  const foods = await db.collection('foods').find({}).limit(5).toArray();
  foods.forEach(f => console.log("Food:", f.name, f.image, f.images));
  const addons = await db.collection('addons').find({}).limit(5).toArray();
  addons.forEach(a => console.log("Addon:", a.name, a.image, a.images));
  await disconnectDB();
}
check();
