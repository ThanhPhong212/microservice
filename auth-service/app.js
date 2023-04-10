/* eslint-disable import/no-dynamic-require */
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const config = require(path.resolve(__dirname, './config/index'));
const logger = require(path.resolve(__dirname, './utils/logger/index'));
const connectDB = require(path.resolve(__dirname, './lib/database')); // connect DB

const app = express();
const router = express.Router();
// eslint-disable-next-line camelcase
const loggerRequestMiddleware = require('./middlewares/logger_request');

app.use(loggerRequestMiddleware);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// run server
app.listen(config.server.port, (err) => {
  if (err) {
    logger.error(err);
    process.exit(1);
  }
  /* eslint-disable */
  fs.readdirSync(path.join(__dirname, './routes')).map((file) => {
    require(`./routes/${file}`)(app, router);
  });
  connectDB();

  /* eslint-enable */
  logger.info(
    `API is now running on port ${config.server.port} in ${config.server.environment} mode`,
  );
});

module.exports = app;
