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
  // listExecute,
  checkUser,
  infoUser,
  createAPIKey,
} = require('../controllers/users');
const validation = require('../middlewares/validation');
const { create } = require('../validates/user.validate');

module.exports = (app, router) => {
  router.get('/staff', listStaffByProjectId);
  // router.get('/project/:projectId/execute', listExecute);

  router.get('/resident', listResidents);
  // đăng nhập
  router.post('/login', login);

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
  app.use('/v1/users', router);
};
