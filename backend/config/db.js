const dns = require("dns");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Prioritize IPv4 DNS resolution to avoid Atlas connection timeouts on IPv6-incompatible networks
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

let mongoMemoryServer = null;

const connectDB = async () => {
  // Allow local networks to provide a reachable resolver for MongoDB Atlas.
  // Public DNS remains the default when no override is configured.
  try {
    const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4")
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean);
    dns.setServers(dnsServers);
  } catch (err) {
    console.warn("Warning: Could not set custom DNS servers:", err.message);
  }

  // Support both MONGO_URI (DEV-KHUSHI) and MONGODB_URI (QA) env variable names
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/communityconnect";

  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.warn(
      "Warning: Neither MONGO_URI nor MONGODB_URI is defined. Falling back to local/in-memory MongoDB."
    );
  }

  try {
    // Attempt connecting to configured MongoDB (e.g., local MongoDB service or Atlas)
    mongoose.set("strictQuery", false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(
      `✅ MongoDB Connected to: ${mongoose.connection.host || mongoUri}`
    );
  } catch (err) {
    console.warn(
      `⚠️ External MongoDB connection failed (${err.message}). Starting in-memory MongoDB Server...`
    );
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`✅ In-Memory MongoDB Server running at: ${memoryUri}`);
    } catch (memErr) {
      console.error("❌ Failed to launch MongoMemoryServer:", memErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
