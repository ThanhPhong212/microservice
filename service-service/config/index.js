const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  server: {
    environment: process.env.environment,
    port: 6001,
  },
  database: {
    uri: process.env.mongoose_url,
    database_name: process.env.database_name,
  },
  logger: {
    file_name: process.env.environment,
  },
  url: process.env.url_notify,
  utcDay: {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    0: 'sunday',
  },
};
