const {
  createParking, updateParking, detailParking, listParking, listParkingByBlock,
} = require('../controllers/parking');
const {
  createVehicleCard, updateVehicleCard, listVehicleCard, detailVehicleCard,
} = require('../controllers/vehicleCard');

module.exports = (app, router) => {
  router.post('/parking/card', createVehicleCard);
  router.get('/parking/block', listParkingByBlock);
  router.put('/parking/card/:cardId', updateVehicleCard);
  router.get('/parking/card', listVehicleCard);
  router.get('/parking/card/:cardId', detailVehicleCard);

  router.post('/parking', createParking);
  router.put('/parking/:parkingId', updateParking);
  router.get('/parking', listParking);
  router.get('/parking/:parkingId', detailParking);

  app.use('/v1', router);
};
