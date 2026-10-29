const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");

dotenv.config();

const checkDatabase = async () => {
  try {
    await connectDB();

    console.log("\n================ DATABASE SUMMARY ================");
    console.log(`Database Name: ${mongoose.connection.name}`);
    console.log(`Host:          ${mongoose.connection.host}`);
    console.log("==================================================\n");

    const collections = await mongoose.connection.db.listCollections().toArray();

    if (collections.length === 0) {
      console.log("No collections found in this database.");
    } else {
      for (const col of collections) {
        const count = await mongoose.connection.db
          .collection(col.name)
          .countDocuments();
        
        // Fetch the most recently created or updated document if any
        const latestDoc = await mongoose.connection.db
          .collection(col.name)
          .find({})
          .sort({ _id: -1 })
          .limit(1)
          .toArray();

        console.log(`📦 Collection: ${col.name} (${count} documents)`);
        if (latestDoc.length > 0) {
          const docPreview = { ...latestDoc[0] };
          // Truncate passwords / sensitive data for display
          if (docPreview.password) docPreview.password = "[HIDDEN]";
          console.log(`   Latest entry:`, JSON.stringify(docPreview, null, 2).split("\n").map(l => "   " + l).join("\n"));
        }
        console.log("--------------------------------------------------");
      }
    }
  } catch (error) {
    console.error("Error inspecting database:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

checkDatabase();
