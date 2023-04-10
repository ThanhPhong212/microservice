const {
  listNotifyByUser,
  userGetNotifyById,
} = require('../controllers/notify');

module.exports = (app, router) => {
  router.get('/notifications', listNotifyByUser);
  router.get('/notifications/:notifyId', userGetNotifyById);

  app.use('/v1/mobile', router);
};
