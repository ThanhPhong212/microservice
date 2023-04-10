const {
  createRefreshToken,
} = require('../controllers/authenticate');

module.exports = (app, router) => {
  router.post('/auth/refresh-token', createRefreshToken);
  app.use('/v1/mobile', router);
};
