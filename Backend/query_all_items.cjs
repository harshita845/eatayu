const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster";
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('test');
    
    const items = await db.collection('food_items').aggregate([
      { $group: { _id: "$restaurantId", count: { $sum: 1 } } }
    ]).toArray();
    console.log(items);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
