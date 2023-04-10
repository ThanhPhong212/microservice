const {
  getProfile,
  loginMobile,
  resendOtp,
  checkPhone,
  updateProfile,
} = require('../controllers/users');

module.exports = (app, router) => {
  router.post('/check-phone', checkPhone);
  router.post('/login-otp', loginMobile);
  router.post('/resend-otp', resendOtp);
  router.get('/', getProfile);
  router.put('/', updateProfile);
  app.use('/v1/mobile/users', router);
};
