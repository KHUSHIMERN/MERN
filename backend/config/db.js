require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Configure DNS for MongoDB Atlas SRV record lookup & IPv4 preference
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {
  // Ignore if unable to override DNS servers in specific environments
}

let mongoMemoryServer = null;
let isConnectedToMongoDB = false;

const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isConnectedToMongoDB = true;
    return mongoose.connection;
  }

  // Support both MONGO_URI (DEV-KHUSHI) and MONGODB_URI (QA) env variable names
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/eventpulse";

  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.warn(
      "Warning: Neither MONGO_URI nor MONGODB_URI is defined. Falling back to local/in-memory MongoDB."
    );
  }

  try {
    // Ensure DNS servers are set before initiating SRV lookup for mongodb+srv URIs
    if (mongoUri.includes("+srv")) {
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
      } catch (dnsErr) {
        // Fallback silently if setServers is restricted
      }
    }

    // Attempt connecting to configured MongoDB (e.g., local MongoDB service or Atlas)
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnectedToMongoDB = true;
    console.log(
      `✅ MongoDB Connected to: ${conn.connection.host || mongoUri}`
    );
    return conn;
  } catch (err) {
    console.warn(
      `⚠️ External MongoDB connection failed (${err.message}). Starting in-memory MongoDB Server...`
    );
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      isConnectedToMongoDB = true;
      console.log(`✅ In-Memory MongoDB Server running at: ${memoryUri}`);
      return conn;
    } catch (memErr) {
      isConnectedToMongoDB = false;
      console.warn("⚠️ Failed to launch MongoMemoryServer:", memErr.message);
    }
  }
};

Object.defineProperty(connectDB, "isConnectedToMongoDB", {
  get: () => isConnectedToMongoDB,
  set: (val) => {
    isConnectedToMongoDB = Boolean(val);
  },
  configurable: true,
  enumerable: true,
});

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.isConnectedToMongoDB = isConnectedToMongoDB;

