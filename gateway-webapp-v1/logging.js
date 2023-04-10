const morgan = require('morgan');

const setupLogging = (app) => {
  // app.use(morgan({ format: 'POST body length in bytes :req[Content-Length]', immediate: true }));
  app.use(morgan('combined'));
};

exports.setupLogging = setupLogging;
