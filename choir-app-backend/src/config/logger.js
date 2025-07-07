const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Destrukturieren der benötigten Formatierungs-Funktionen von winston
const { combine, timestamp, printf, colorize, align, splat } = winston.format;

/**
 * Erstellt eine neue Winston-Loggerinstanz mit allen gewünschten
 * Einstellungen. Diese Funktion wird nur einmal pro Prozess ausgeführt.
 */
function buildLogger() {
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const consoleLogFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    align(),
    splat(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  );

  const fileLogFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    splat(),
    printf((info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  );

  const loggerInstance = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transports: [
      new winston.transports.Console({ format: consoleLogFormat }),
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileLogFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileLogFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
    ],
    exitOnError: false,
  });

  loggerInstance.stream = {
    write: (message) => {
      loggerInstance.info(message.substring(0, message.lastIndexOf('\n')));
    },
  };

  return loggerInstance;
}

let logger;

/**
 * Gibt die Singleton-Instanz des Loggers zurück.
 * Da Node.js Module gecacht werden, genügt ein einfacher Lazy-Init.
 */
function getLogger() {
  if (!logger) {
    logger = buildLogger();
  }
  return logger;
}

module.exports = getLogger();
