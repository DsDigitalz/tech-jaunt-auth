const mongoose = require('mongoose');
require('dotenv').config();


const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/myauthClass';

const connectDB = async () => {
    try {
        await mongoose.connect(DB_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

module.exports = connectDB;