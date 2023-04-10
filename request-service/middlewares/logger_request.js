const logger = require('../utils/logger/index');

module.exports = (req, res, next) => {
  const now = new Date().toString();
  const log = `${now}: ${req.method} ${req.url}`;
  logger.info(log);
  next();
};
