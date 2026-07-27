import mongoose from 'mongoose';

export let isConnectedToMongoDB = false;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventpulse', {
      serverSelectionTimeoutMS: 3000,
    });
    isConnectedToMongoDB = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    isConnectedToMongoDB = false;
    console.warn(`[MongoDB] Database connection omitted (${error.message}). Operating with in-memory store mode.`);
  }
};

export default connectDB;
