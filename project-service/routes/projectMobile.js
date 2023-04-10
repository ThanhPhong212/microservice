const {
  listApartmentByUserId,
  getApartmentById,
} = require('../controllers/apartment');
const { getBuildingLibrary, getBuildingLibraryById } = require('../controllers/buildingLibrary');

module.exports = (app, router) => {
  router.get('/mobile/project/apartment/list', listApartmentByUserId);
  router.get('/mobile/project/apartment/:apartmentId', getApartmentById);
  router.get('/mobile/project/:projectId/library-building', getBuildingLibrary);
  router.get('/mobile/project/library-building/:libraryId', getBuildingLibraryById);
  app.use('/v1', router);
};
