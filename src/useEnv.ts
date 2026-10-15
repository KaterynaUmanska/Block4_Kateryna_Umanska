interface Env {
  PORT: number;
  HOST: string;
  MONGO_ADDRESS: string;
}

const ERROR_MESSAGE = '❌ Missing or invalid environment variable:';

export const useEnv = (): Env => {
  const { PORT, HOST, MONGO_ADDRESS } = process.env;

  if (!PORT || isNaN(parseInt(PORT, 10))) {
    throw new Error(`${ERROR_MESSAGE} PORT`);
  }

  if (!HOST) {
    throw new Error(`${ERROR_MESSAGE} HOST`);
  }

  if (!MONGO_ADDRESS) {
    throw new Error(`${ERROR_MESSAGE} MONGO_ADDRESS`);
  }

  return {
    PORT: parseInt(PORT, 10),
    HOST,
    MONGO_ADDRESS,
  };
};