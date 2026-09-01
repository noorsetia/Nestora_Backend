const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Nestora DB] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Nestora DB Warning] Could not connect to MongoDB at ${env.mongoUri}: ${error.message}`);
    console.log('[Nestora DB Notice] Server will continue running, database features will require an active MongoDB server.');
    return null;
  }
};

module.exports = connectDB;
