const {
  createOrUpdateDevices,
} = require('../controllers/onesignal');
const validation = require('../middlewares/validation');
const validDeviceToken = require('../validates/deviceToken.validate');

module.exports = (app, router) => {
  router.patch('/devices', validation(validDeviceToken.create), createOrUpdateDevices);

  app.use('/v1/mobile', router);
};
