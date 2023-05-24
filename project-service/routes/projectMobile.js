const {
  listApartmentByUserId,
  getApartmentById,
} = require('../controllers/apartment');
const { getBuildingLibrary, getBuildingLibraryById } = require('../controllers/buildingLibrary');
const {
  listOfResidentsCards,
  registrationOfResidentialCards,
  updateResidentialCard,
  detailResidentialCard,
} = require('../controllers/residentialCard');

module.exports = (app, router) => {
  router.get('/mobile/project/apartment/list', listApartmentByUserId);
  router.get('/mobile/project/apartment/:apartmentId', getApartmentById);
  router.get('/mobile/project/:projectId/library-building', getBuildingLibrary);
  router.get('/mobile/project/library-building/:libraryId', getBuildingLibraryById);

  // thẻ cư dân
  router.get('/mobile/project/residential-card', listOfResidentsCards);
  router.post('/mobile/project/residential-card', registrationOfResidentialCards);
  router.put('/mobile/project/residential-card', registrationOfResidentialCards);
  router.put('/mobile/project/residential-card/:cardId', updateResidentialCard);
  router.get('/mobile/project/residential-card/:cardId', detailResidentialCard);

  app.use('/v1', router);
};
