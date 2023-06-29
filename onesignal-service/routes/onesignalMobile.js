const {
  createOrUpdateDevices,
  createOrUpdateDeviceWeb,
  sendMessage, sendAll,
  sendMultipleMessage,
  createNotifyPPA,
} = require('../controllers/onesignal');
const validation = require('../middlewares/validation');
const validDeviceToken = require('../validates/deviceToken.validate');

module.exports = (app, router) => {
  router.patch('/devices', validation(validDeviceToken.create), createOrUpdateDevices);
  router.put('/devices/playerid', validation(validDeviceToken.createDevice), createOrUpdateDeviceWeb);
  router.post('/devices/send-message', sendMessage);
  router.post('/devices/multiple-send-message', sendMultipleMessage);
  router.post('/devices/send-all', sendAll);

  // gửi thông báo ppa
  router.post('/devices/send-notify-ppa', createNotifyPPA);

  app.use('/v1/mobile', router);
};
