/* eslint-disable import/no-dynamic-require */
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyparser = require('body-parser');
const cors = require('cors');

const config = require('./config/index');
const logger = require('./utils/logger/index');
const connectDB = require('./lib/database'); // connect DB

const app = express();
const router = express.Router();
// eslint-disable-next-line camelcase
const loggerRequestMiddleware = require('./middlewares/logger_request');

app.use(loggerRequestMiddleware);
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(cors());

// run server
app.listen(config.server.port, (err) => {
  if (err) {
    logger.error(err);
    process.exit(1);
  }
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
