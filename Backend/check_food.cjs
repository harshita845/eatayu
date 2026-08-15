const mongoose = require('mongoose');

async function checkFood() {
  await mongoose.connect('mongodb+srv://EatAyu:EatAyu%40123@EatAyucluster.gcdsjg0.mongodb.net/EatAyudb?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;
  const foods = await db.collection('foods').find({ name: /Biryani|Tart|Salmon/i }).toArray();
  console.log(JSON.stringify(foods, null, 2));

  process.exit(0);
}

checkFood().catch(console.error);
