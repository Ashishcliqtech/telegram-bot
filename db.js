/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           🗄️  GOLU OFFERS — MONGODB CONNECTION           ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const mongoose = require("mongoose");

let isConnected = false;

async function connect() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment variables");

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully");

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      isConnected = true;
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = { connect };
