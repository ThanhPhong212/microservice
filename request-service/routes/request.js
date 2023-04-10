const {
  createRequest,
  getRequestById,
  getListRequest,
  updateRequest,
  getListType,
  assignStaffType,
} = require('../controllers/request');
const validation = require('../middlewares/validation');
const { create } = require('../validates/request.validate');

module.exports = (app, router) => {
  router.post('/', validation(create), createRequest);
  router.get('/types', getListType);
  router.put('/types/assign', assignStaffType);
  router.put('/:requestId', updateRequest);
  router.get('/list', getListRequest);
  router.get('/:requestId', getRequestById);
  app.use('/v1/requests', router);
};
