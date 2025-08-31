const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist (only in development)
let logDir;
if (process.env.NODE_ENV !== 'production') {
  const fs = require('fs');
  logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'lark-ai-backend' },
  transports: [],
});

// Add file transports only in development
if (process.env.NODE_ENV !== 'production' && logDir) {
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }));
}

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add console transport for production with different format
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

// Custom logging methods for specific use cases
logger.aiGeneration = (message, data = {}) => {
  logger.info(`[AI-GENERATION] ${message}`, {
    component: 'ai-generation',
    ...data
  });
};

logger.contentCreation = (message, data = {}) => {
  logger.info(`[CONTENT-CREATION] ${message}`, {
    component: 'content-creation',
    ...data
  });
};

logger.socialMedia = (message, data = {}) => {
  logger.info(`[SOCIAL-MEDIA] ${message}`, {
    component: 'social-media',
    ...data
  });
};

logger.characterEngine = (message, data = {}) => {
  logger.info(`[CHARACTER-ENGINE] ${message}`, {
    component: 'character-engine',
    ...data
  });
};

logger.analytics = (message, data = {}) => {
  logger.info(`[ANALYTICS] ${message}`, {
    component: 'analytics',
    ...data
  });
};

logger.security = (message, data = {}) => {
  logger.warn(`[SECURITY] ${message}`, {
    component: 'security',
    ...data
  });
};

logger.performance = (message, data = {}) => {
  logger.debug(`[PERFORMANCE] ${message}`, {
    component: 'performance',
    ...data
  });
};

// Error handler for uncaught exceptions (only in development)
if (process.env.NODE_ENV !== 'production' && logDir) {
  logger.exceptions.handle(
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  );

  // Error handler for unhandled promise rejections
  logger.rejections.handle(
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log') 
    })
  );
}

module.exports = logger;