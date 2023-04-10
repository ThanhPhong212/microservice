const express = require('express');
const path = require('path');
const cors = require('cors');
const YAML = require('yamljs');

const swaggerDocument = YAML.load(path.resolve(__dirname, './swagger/schema.yaml'));
const swaggerMobileDocument = YAML.load(path.resolve(__dirname, './swagger/mobile.yaml'));
const swaggerUi = require('swagger-ui-express');
const { ROUTES } = require('./routes');
const { setupLogging } = require('./logging');
const { setupRateLimit } = require('./ratelimit');
const { setupCreditCheck } = require('./creditcheck');
const { setupProxies } = require('./proxy');
require('dotenv').config();

// const { setupAuth } = require('./auth');

const app = express();
const port = 8080;

app.use(cors());

setupLogging(app);
setupRateLimit(app, ROUTES);
// setupAuth(app, ROUTES);
setupCreditCheck(app, ROUTES);
setupProxies(app, ROUTES);

app.get('/', (req, resp) => resp.send('NamLong API-V1'));

app.use('/api-docs/mobile', swaggerUi.serveFiles(swaggerMobileDocument), swaggerUi.setup(swaggerMobileDocument));
app.use('/api-docs', swaggerUi.serveFiles(swaggerDocument), swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
