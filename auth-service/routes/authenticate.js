const {
  authenticate,
  createRefreshToken,
} = require('../controllers/authenticate');

module.exports = (app, router) => {
  router.get('/auth', authenticate);
  router.post('/auth/refresh-token', createRefreshToken);
  app.use('/v1', router);
};
