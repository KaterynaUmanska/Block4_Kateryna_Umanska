import mongoose from 'mongoose';
import log4js from 'log4js';

export const connectToDatabase = async (
  mongoUri: string,
): Promise<void> => {
  const logger = log4js.getLogger();

  try {
    await mongoose.connect(mongoUri);
    logger.info('Successfully connected to MongoDB');
  } catch (error) {
    logger.fatal('MongoDB connection failed', error);
    throw error;
  }
};
