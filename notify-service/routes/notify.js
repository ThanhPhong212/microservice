const {
  createNotify,
  listNotify,
  updateNotify,
  getNotifyById,
} = require('../controllers/notify');

module.exports = (app, router) => {
  router.post('/', createNotify);
  router.get('/list', listNotify);
  router.put('/:notifyId', updateNotify);
  router.get('/:notifyId', getNotifyById);

  app.use('/v1/notify', router);
};
