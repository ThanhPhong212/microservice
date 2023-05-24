const {
  createOrUpdateDevices, createOrUpdateDeviceWeb, sendMessage, sendAll, sendMultipleMessage,
} = require('../controllers/onesignal');
const validation = require('../middlewares/validation');
const validDeviceToken = require('../validates/deviceToken.validate');

module.exports = (app, router) => {
  router.patch('/devices', validation(validDeviceToken.create), createOrUpdateDevices);
  router.put('/devices', validation(validDeviceToken.createDevice), createOrUpdateDeviceWeb);
  router.post('/devices/send-message', sendMessage);
  router.post('/devices/multiple-send-message', sendMultipleMessage);
  router.post('/devices/send-all', sendAll);

  app.use('/v1/mobile', router);
};
