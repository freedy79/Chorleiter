const winston = require('winston');

// Destrukturieren der benötigten Formatierungs-Funktionen von winston
const { combine, timestamp, printf, colorize, align, splat } = winston.format;

/**
 * Definiert ein benutzerdefiniertes Format für die Log-Ausgaben in der Konsole.
 * - `colorize()`: Färbt die Ausgabe je nach Log-Level (info: grün, warn: gelb, error: rot).
 * - `timestamp()`: Fügt einen Zeitstempel hinzu.
 * - `align()`: Richtet die Log-Nachrichten untereinander aus.
 * - `printf()`: Ermöglicht die vollständige Kontrolle über das Ausgabeformat.
 * - `splat()`: Ermöglicht das Loggen von Objekten (z.B. logger.info("User object:", user)).
 */
const consoleLogFormat = combine(
  colorize(),
  timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS' // Detailliertes Format für die Konsole
  }),
  align(),
  splat(),
  printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

/**
 * Definiert ein benutzerdefiniertes Format für die Log-Ausgaben in Dateien.
 * Dieses Format ist einfacher gehalten, da es keine Farben benötigt.
 */
const fileLogFormat = combine(
    timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    splat(),
    printf((info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

// Erstellen der zentralen Logger-Instanz
const logger = winston.createLogger({
  // Legt das niedrigste Log-Level fest, das verarbeitet wird.
  // In der Entwicklung ('development') loggen wir alles ab 'info' aufwärts.
  // In der Produktion ('production') loggen wir nur 'warn' und 'error', um die Logs nicht zu überfluten.
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',

  // Definieren der "Transports" (d.h. der Ausgabeziele für die Logs)
  transports: [
    // 1. Transport: Die Entwicklerkonsole
    // Dieser Transport wird nur aktiviert, wenn wir NICHT in Produktion sind.
    // In Produktion wollen wir die Konsole oft sauber halten.
    new winston.transports.Console({
      format: consoleLogFormat
    }),

    // 2. Transport: Eine Datei für alle Fehler
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error', // Nur 'error'-Level-Logs kommen in diese Datei
        format: fileLogFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),

    // 3. Transport: Eine Datei für alle Logs (kombiniert)
    new winston.transports.File({
        filename: 'logs/combined.log',
        format: fileLogFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    })
  ],

  // Fängt unbehandelte Ausnahmen (uncaught exceptions) ab und loggt sie,
  // bevor der Prozess beendet wird.
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],

  // Fängt unbehandelte Promise-Ablehnungen (unhandled rejections) ab.
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],

  // Beendet den Prozess nicht nach einer unbehandelten Ausnahme
  exitOnError: false
});

// Fügen Sie einen Stream hinzu, der von anderen Loggern wie 'morgan' verwendet werden kann
logger.stream = {
  write: (message) => {
    logger.info(message.substring(0, message.lastIndexOf('\n')));
  },
};

module.exports = logger;
