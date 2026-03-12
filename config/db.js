import mongoose from "mongoose";

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error("Error: MONGODB_URI is not defined in environment variables.");
    return; // or process.exit(1) in production
  }

  try {
    const conn = await mongoose.connect(mongoURI); 
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // process.exit(1); // optionally exit in production
  }
};

export default connectDB;