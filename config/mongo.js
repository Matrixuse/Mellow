const mongoose = require('mongoose');

const connectMongo = async () => {
    try {
        // If no MONGO_URI is configured, do not attempt to connect.
        if (!process.env.MONGO_URI) {
            console.warn('MONGO_URI not set; skipping MongoDB connection. Configure MONGO_URI to enable MongoDB.');
            return null;
        }

        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Do not exit process here; allow caller to handle failures.
        throw error;
    }
};

module.exports = connectMongo;