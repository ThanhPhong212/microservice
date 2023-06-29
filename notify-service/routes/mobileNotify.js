const {
  listNotifyByUser,
  userGetNotifyById,
  updateNotify,
} = require('../controllers/notify');

module.exports = (app, router) => {
  router.get('/notifications', listNotifyByUser);
  router.get('/notifications/:notifyId', userGetNotifyById);
  router.put('/notifications/:notifyId', updateNotify);

  app.use('/v1/mobile', router);
};
