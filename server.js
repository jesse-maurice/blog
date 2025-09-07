import { config } from 'dotenv';

import app from './app.js';
import connectDB from './config/database.js';

// Load environment variables
config();

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Save the server instance so we can close it on errors
const server = app.listen(PORT, () => {
  console.log(`
🚀 Blog Platform Server is running!
📍 Environment: ${NODE_ENV}
🌐 Port: ${PORT}
📊 Database: Connected to MongoDB
🔗 API Base URL: http://localhost:${PORT}/api
⚡ Health Check: http://localhost:${PORT}/health
  `);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  console.log("Shutting down the server due to uncaught exception");
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Graceful shutdown on signals
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully`);
  if (server) {
    server.close(() => {
      console.log("Process terminated");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default server;
