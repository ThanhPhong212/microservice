const mongoose = require('mongoose');
const config = require('../config/index');
const logger = require('../utils/logger/index');

module.exports = () => {
  const option = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  };
  const connection = mongoose.connect(`${config.database.uri}/${config.database.database_name}`, option);
  connection
    .then((db) => {
      logger.info(
        `Successfully connected to ${config.database.uri} MongoDB cluster in ${config.server.environment
        } mode.`,
      );
      return db;
    }, (err) => {
      if (err.message.code === 'ETIMEDOUT') {
        logger.info('Attempting to re-establish database connection.');
        mongoose.connect(config.database.uri, option);
      } else {
        logger.error('Error while attempting to connect to database:');
        logger.error(err);
      }
    });
};
