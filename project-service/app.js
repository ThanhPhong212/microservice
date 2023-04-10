/* eslint-disable import/no-dynamic-require */
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyparser = require('body-parser');

const config = require('./config/index');
const logger = require('./utils/logger/index');
const connectDB = require('./lib/database'); // connect DB

const app = express();
const router = express.Router();
// eslint-disable-next-line camelcase
const loggerRequestMiddleware = require('./middlewares/logger_request');

app.use(loggerRequestMiddleware);
app.use(bodyparser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyparser.json({ limit: '50mb' }));
app.use(cors());

// run server
app.listen(config.server.port, (err) => {
  if (err) {
    logger.error(err);
    process.exit(1);
  }
  /* eslint-disable */
  fs.readdirSync(path.join(__dirname, './models')).map((file) => {
    require(`./models/${file}`);
  });
  connectDB();

  // import Router
  /* eslint-disable */
  fs.readdirSync(path.join(__dirname, './routes')).map((file) => {
    require(`./routes/${file}`)(app, router);
  });
  /* eslint-enable */
  logger.info(
    `API is now running on port ${config.server.port} in ${config.server.environment} mode`,
  );
});

module.exports = app;
