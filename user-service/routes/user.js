const {
  login,
  listUser,
  createUser,
  updateUser,
  getProfile,
  changePassword,
  listResidents,
  updateProfile,
  listStaffByProjectId,
  changePasswordUser,
  checkUser,
  infoUser,
  createAPIKey,
  createUserPPA,
  createDemo,
  listDemo,
} = require('../controllers/users');
const validation = require('../middlewares/validation');
const { create, validateLogin, validateCreate } = require('../validates/user.validate');

module.exports = (app, router) => {
  router.get('/staff', listStaffByProjectId);
  // router.get('/project/:projectId/execute', listExecute);

  router.get('/resident', listResidents);
  // đăng nhập
  router.post('/login', validation(validateLogin), login);

  // thông tin người dùng
  router.put('/change-password', changePassword);
  router.post('/check-user', checkUser);
  router.put('/change-password/:userId', changePasswordUser);
  router.put('/', updateProfile);
  router.post('/', validation(create), createUser);
  router.get('/', getProfile);
  router.put('/api-key', createAPIKey);
  router.put('/:userId', updateUser);
  router.get('/list', listUser);
  router.get('/:userId', infoUser);

  // other
  router.post('/create', validation(validateCreate), createUserPPA);
  router.post('/demo', createDemo);
  router.get('/demo/list', listDemo);
  router.get('/detail/:userId', infoUser);
  app.use('/v1/users', router);
};
