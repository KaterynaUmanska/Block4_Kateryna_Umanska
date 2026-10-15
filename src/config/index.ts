interface Appender {
  type: string;
  pattern?: string;
  alwaysIncludePattern?: boolean;
  filename?: string;
  maxLogSize?: number;
  compress?: boolean;
}

interface Category {
  appenders: string[];
  level: string;
}

interface Log4jsConfig {
  appenders: Record<string, Appender>;
  categories: Record<string, Category>;
}

interface Config {
  log4js: Log4jsConfig;
}

const config: Config = {
  log4js: {
    appenders: {
      console: {
        type: 'console',
      },
      ms: {
        type: 'dateFile',
        pattern: '-yyyy-MM-dd.log',
        alwaysIncludePattern: true,
        filename: 'log/ms',
        maxLogSize: 1000000,
        compress: true,
      },
    },
    categories: {
      default: {
        appenders: ['ms', 'console'],
        level: 'debug',
      },
    },
  },
};

export default config;