const validation = require('../middlewares/validation');
const {
  editRegistration, listRegistration, registrationDetails,
} = require('../controllers/register');
const {
  createService,
  getServiceById,
  getListService,
  updateService,
} = require('../controllers/service');
const { createServiceValidate, updateServiceValidate } = require('../validates/service.validate');

module.exports = (app, router) => {
  router.put('/register/:registerId', editRegistration);
  router.get('/register', listRegistration);
  router.get('/register/:registerId', registrationDetails);

  router.post('/', validation(createServiceValidate), createService);
  router.put('/:serviceId', validation(updateServiceValidate), updateService);
  router.get('/list', getListService);
  router.get('/:serviceId', getServiceById);
  app.use('/v1/services', router);
};
