const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster";
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('test');
    
    const rest = await db.collection('food_restaurants').findOne({ _id: new ObjectId('6a84a0e9eb9d99faca494dee') });
    console.log(rest?.restaurantName);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
