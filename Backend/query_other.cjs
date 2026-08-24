const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster";
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('test');
    
    // Check food_restaurant_menus
    const m1 = await db.collection('food_restaurant_menus').countDocuments({ restaurantId: new ObjectId('6a8490d0a04d116a4feea0c4') });
    const m2 = await db.collection('food_restaurant_menus').countDocuments({ restaurantId: new ObjectId('6a84a0e9eb9d99faca494df8') });
    
    console.log("Menus for Indore Zaika:", m1);
    console.log("Menus for 56 Dukan:", m2);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
