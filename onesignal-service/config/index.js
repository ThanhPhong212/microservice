const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  server: {
    environment: process.env.environment,
    port: 7001,
  },
  database: {
    uri: process.env.mongoose_url,
    database_name: process.env.database_name,
  },
  logger: {
    file_name: process.env.environment,
  },
  onesignal: {
    id: process.env.onesignal_id,
    key: process.env.onesignal_key,
  },
  url: process.env.url_notify,
};
