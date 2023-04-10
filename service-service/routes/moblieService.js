const {
  registration, userRegistrationHistory, registrationDetails, editRegistration,
} = require('../controllers/register');
const {
  cshGetListService,
  cshGetServiceById,
} = require('../controllers/service');
const validation = require('../middlewares/validation');
const { registerService } = require('../validates/register.validate');

module.exports = (app, router) => {
  router.post('/mobile/services/register', validation(registerService), registration);
  router.put('/mobile/services/register/:registerId', editRegistration);
  router.get('/mobile/services/register/history', userRegistrationHistory);
  router.get('/mobile/services/register/:registerId', registrationDetails);

  router.get('/mobile/services', cshGetListService);
  router.get('/mobile/services/:serviceId', cshGetServiceById);
  app.use('/v1', router);
};
