const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster";
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log(dbs.databases.map(d => d.name));
    
    // Default db is usually 'test' in uri if not specified, but let's check a few
    const targetDb = client.db('test');
    const cols = await targetDb.listCollections().toArray();
    console.log("Collections in test db:", cols.map(c => c.name));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
