const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://eatrushfoodservice_db_user:EatAyuDbuser123@eatayu-cluster.lvpvpob.mongodb.net/?retryWrites=true&w=majority&appName=eatayu-cluster";
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('eatayu-db'); // let's guess db name, wait, what is the default db?
    // Let's just list databases first
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log(dbs.databases.map(d => d.name));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
