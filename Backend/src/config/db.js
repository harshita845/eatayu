import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

// Register connection status listeners once
mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost. Driver will automatically retry connecting...');
});
mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully.');
});

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            maxPoolSize: 20,
            minPoolSize: 2,
            heartbeatFrequencyMS: 10000,
        });
        logger.info(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Close MongoDB connection (e.g. graceful shutdown).
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
};
