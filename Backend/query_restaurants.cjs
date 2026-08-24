const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster";
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('test');
    const restaurants = await db.collection('food_restaurants').find({ 
      restaurantName: { $regex: /indore zaika|56 dukan/i } 
    }).toArray();
    
    console.log(restaurants.map(r => ({
      _id: r._id,
      name: r.restaurantName,
      zoneId: r.zoneId,
      isActive: r.isActive,
      isDeleted: r.isDeleted,
      approvalStatus: r.approvalStatus
    })));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
