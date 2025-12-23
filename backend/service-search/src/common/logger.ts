import pino from 'pino';

export const logger = pino({
  level: 'info',
  timestamp: () => {
    const now = new Date();
    return `,"timestamp":"${now.toISOString()}","time":"${now.toISOString()}","timestamp_unix_ms":${now.getTime()}`;
  },
  formatters: {
    level: (label) => ({ level: label })
  },
  base: null, 
});