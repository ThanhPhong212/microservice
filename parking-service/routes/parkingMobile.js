const { listParkingByBlock } = require('../controllers/parking');
const {
  listVehicleCardOfUser, detailVehicleCard, createVehicleCard, updateVehicleCard,
} = require('../controllers/vehicleCard');

module.exports = (app, router) => {
  router.get('/mobile/parking/card', listVehicleCardOfUser);
  router.get('/mobile/parking/card/:cardId', detailVehicleCard);
  router.post('/mobile/parking/card', createVehicleCard);
  router.put('/mobile/parking/card/:cardId', updateVehicleCard);
  router.get('/mobile/parking/block', listParkingByBlock);

  app.use('/v1', router);
};
