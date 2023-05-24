const {
  getProfile,
  loginMobile,
  resendOtp,
  checkPhone,
  updateProfile,
  login,
  listPartnerInCategory,
} = require('../controllers/users');

module.exports = (app, router) => {
  router.post('/check-phone', checkPhone);
  router.post('/login-otp', loginMobile);
  router.post('/resend-otp', resendOtp);
  router.post('/login', login);
  router.get('/profile', getProfile);
  router.put('/profile', updateProfile);
  router.get('/category', listPartnerInCategory);

  app.use('/v1/mobile/users', router);
};
