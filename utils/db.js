const mongoose = require('mongoose');
const { setServers } = require("node:dns/promises");
require('dotenv').config();

setServers(["8.8.8.8", "8.8.4.4"]);


const connectDB = async () => {
  console.log(process.env.MONGODB_URI);
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
