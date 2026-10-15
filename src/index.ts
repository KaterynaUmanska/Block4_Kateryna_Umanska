import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';
import log4js from 'log4js';
import http from 'http';

import app from './app.js';
import config from './config/index.js';
import { connectToDatabase } from './database.connection.js';
import { useEnv } from './useEnv.js';

async function bootstrap(): Promise<void> {
  dotenvConfig();

  const { HOST, PORT, MONGO_ADDRESS } = useEnv();

  log4js.configure(config.log4js);

  await connectToDatabase(MONGO_ADDRESS);

  const server = http.createServer(app);

  server.listen(PORT, HOST, () => {
    log4js
      .getLogger()
      .info(`Application listening on http://${HOST}:${PORT}`);
  });
}

bootstrap().catch((error: unknown) => {
  log4js.getLogger().fatal('Application startup failed', error);
  process.exit(1);
});
