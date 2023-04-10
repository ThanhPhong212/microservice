const {
  login,
  listUser,
  getUser,
  createUser,
  updateUser,
  getProfile,
  forgotPassword,
  changePassword,
  loginMobile,
  resendOtp,
  checkPhone,
  listResidents,
  updateProfile,
  listStaffByProjectId,
  listExecute,
  populationDensity,
} = require('../controllers/users');
const validation = require('../middlewares/validation');
const { create, update } = require('../validates/user.validate');

module.exports = (app, router) => {
  router.post('/login', login);
  router.post('/check-phone', checkPhone);
  router.post('/login-otp', loginMobile);
  router.post('/resend-otp', resendOtp);
  router.put('/change-password', changePassword);
  router.post('/forgot-password', forgotPassword);

  router.get('/', getProfile);
  router.put('/', updateProfile);
  router.post('/', validation(create), createUser);

  router.get('/statistics', populationDensity);

  router.get('/staff', listStaffByProjectId);
  router.get('/project/:projectId/resident', listResidents);
  router.get('/project/:projectId/execute', listExecute);
  router.get('/project/:projectId', listUser);
  router.put('/:userId/project/:projectId', validation(update), updateUser);
  router.get('/:userId', getUser);
  app.use('/v1/users', router);
};
