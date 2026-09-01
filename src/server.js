const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

const startServer = async () => {
  // Connect to MongoDB Database
  await connectDB();

  // Start Express Server
  const PORT = env.port;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`==================================================`);
    console.log(`🚀 Nestora API running on port ${PORT}`);
    console.log(`🌐 Environment: ${env.nodeEnv}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    if (typeof env.logGoogleStatus === 'function') {
      env.logGoogleStatus();
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ [Server Error] Port ${PORT} is already in use by another process.`);
      console.error(`👉 Please terminate the process on port ${PORT} before starting server.\n`);
      process.exit(1);
    } else {
      console.error(`\n❌ [Server Error] ${err.message}\n`);
      process.exit(1);
    }
  });

  const gracefulShutdown = (signal) => {
    console.log(`\n[Server Notice] ${signal} signal received. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server Notice] HTTP server closed.');
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('[Server Notice] MongoDB connection closed.');
      }
      process.exit(0);
    });

    // Force shutdown after 10s if connections refuse to close
    setTimeout(() => {
      console.error('[Server Error] Could not close connections in time, forcing exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections gracefully
  process.on('unhandledRejection', (err) => {
    console.error(`[Server Error] Unhandled Rejection: ${err.message}`);
  });
};

startServer();
