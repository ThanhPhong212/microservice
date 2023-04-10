/* eslint-disable no-console */
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyparser = require('body-parser');
const fileUpload = require('express-fileupload');
const logger = require('./utils/logger/index');
const config = require('./config/index');
const connectDB = require('./lib/database'); // connect DB

const app = express();
const router = express.Router();
// eslint-disable-next-line camelcase
const loggerRequestMiddleware = require('./middlewares/logger_request');

app.use(loggerRequestMiddleware);
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(express.static(`${__dirname}/public`)); // public
app.use(express.static(`${__dirname}/tmp`)); // public
app.use(cors());
app.use(fileUpload({ createParentPath: true }));

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
    require(`./routes/${file}`)(app,router);
  });
  /* eslint-enable */
  logger.info(
    `API is now running on port ${config.server.port} in ${config.server.environment} mode`,
  );
});

module.exports = app;
