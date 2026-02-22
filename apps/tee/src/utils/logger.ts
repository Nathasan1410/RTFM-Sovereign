import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV || 'development',
    enclave_enabled: process.env.ENCLAVE_ENABLED === 'true',
  },
});

export const createChildLogger = (module: string, meta?: Record<string, unknown>) => {
  return logger.child({ module, ...meta });
};

export const healthLogger = createChildLogger('health');
export const agentLogger = createChildLogger('agent');
export const cerebrasLogger = createChildLogger('cerebras');
export const cryptoLogger = createChildLogger('crypto');
