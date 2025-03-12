import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const db = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);
    console.log(`\n MongoDB Connected to DB host: ${db.connection.host}`);

    return db;
  } catch (err) {
    console.log("Error:", err);
    process.exit();
  }
};

export default connectDB;