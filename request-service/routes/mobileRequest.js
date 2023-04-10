const {
  createRequestMobile,
  getListType,
  updateRequest,
  getListRequest,
  getRequestById,
} = require('../controllers/request');
const validation = require('../middlewares/validation');
const { create } = require('../validates/request.validate');

module.exports = (app, router) => {
  router.post('/mobile/requests', validation(create), createRequestMobile);
  router.get('/mobile/requests/list', getListRequest);
  router.get('/mobile/requests/types', getListType);
  router.get('/mobile/requests/:requestId', getRequestById);
  router.put('/mobile/requests/:requestId/evaluate', updateRequest);
  app.use('/v1', router);
};
