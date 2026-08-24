const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster";
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('test');
    
    // get restaurant ids
    const rest1 = await db.collection('food_restaurants').findOne({ restaurantName: /indore zaika/i });
    const rest2 = await db.collection('food_restaurants').findOne({ restaurantName: /56 dukan/i });
    
    console.log("Restaurant 1:", rest1?._id);
    console.log("Restaurant 2:", rest2?._id);
    
    if(rest1) {
      const items1 = await db.collection('food_items').countDocuments({ restaurantId: rest1._id });
      console.log("Items for Indore Zaika:", items1);
    }
    if(rest2) {
      const items2 = await db.collection('food_items').countDocuments({ restaurantId: rest2._id });
      console.log("Items for 56 Dukan:", items2);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
