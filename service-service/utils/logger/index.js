const winston = require('winston');
const path = require('path');
const config = require('../../config/index');

const files = new winston.transports.File({ filename: path.join(__dirname, `../../log/${config.logger.file_name}.log`) });
const consoles = new winston.transports.Console();

const logger = winston.createLogger({
  level: 0,
  transports: [
    files,
    consoles,
  ],
});

module.exports = logger;
