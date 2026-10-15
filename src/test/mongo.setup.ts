import { GenericContainer, StartedTestContainer } from 'testcontainers';
import mongoose from 'mongoose';
import { config as dotenvConfig } from 'dotenv';
import { useTestEnv } from './useTestEnv.js';

let container: StartedTestContainer | null = null;

export const startMongoContainer = async (): Promise<void> => {
  dotenvConfig({ path: `.env.test` });
  const { MONGO_PORT, MONGO_IMAGE, MONGO_DB } = useTestEnv();
  container = await new GenericContainer(MONGO_IMAGE)
    .withExposedPorts(MONGO_PORT)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(MONGO_PORT);
  const mongoUri = `mongodb://${host}:${port}/${MONGO_DB}`;

  await mongoose.connect(mongoUri);
};

export const stopMongoContainer = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (container) {
    await container.stop();
  }
};

export const clearDatabase = async (): Promise<void> => {
  if (!mongoose.connection.db) {
    throw new Error('Database connection is not established');
  }
  await mongoose.connection.db.dropDatabase();
};