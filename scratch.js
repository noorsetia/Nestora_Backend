const mongoose = require('mongoose');
const uri = "mongodb+srv://noorsetia24_db_user:63U8nLuIBLtPhofV@cluster0.g1dyfyd.mongodb.net/?appName=Cluster0";
mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const products = await db.collection('products').find({}, { projection: { name: 1, slug: 1, image: 1 } }).toArray();
  console.log(JSON.stringify(products, null, 2));
  process.exit();
}).catch(console.error);
