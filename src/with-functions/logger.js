const winston = require("winston");

// Reference for updates
// https://github.com/winstonjs/winston#formats
const format = winston.format.printf(({ level, message }) => {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level}]: ${message}`;
});

const logger = winston.createLogger({
  level: "info",
  format,
  defaultMeta: { service: "mine-repo" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

module.exports = logger;
