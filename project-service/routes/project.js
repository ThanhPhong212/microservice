const {
  createProject,
  getProjectById,
  listProject,
  updateProject,
} = require('../controllers/project');
const validation = require('../middlewares/validation');
const { createBlock, updateBlock, listBlockByProjectId } = require('../controllers/block');
const { createTypeApartment, updateTypeApartment } = require('../controllers/typeApartment');
const { validateCreateProject, validateUpdateProject, validateCUDBlock } = require('../validates/project.validate');

const {
  createApartment,
  listApartment,
  getApartmentById,
  editApartmentById,
  getApartmentByBlock,
  listResidentInApartment,
} = require('../controllers/apartment');

const { CUDtypeApartment, validateCreateApartment, validateUpdateApartment } = require('../validates/apartment.validate');

const {
  createBuildingLibrary,
  editBuildingLibrary,
  getBuildingLibrary,
  getBuildingLibraryById,
  deleteBuildingLibrary,
} = require('../controllers/buildingLibrary');
const { createLibraryValidate, editLibraryValidate } = require('../validates/buildingLibrary.validate');
const { listCard, detailResidentialCard, updateResidentialCard } = require('../controllers/residentialCard');

module.exports = (app, router) => {
  router.get('/project/list', listProject);
  router.post('/project', validation(validateCreateProject), createProject);
  router.put('/project/:projectId', validation(validateUpdateProject), updateProject);
  router.post('/project/:projectId/block', validation(validateCUDBlock), createBlock);
  router.get('/project/:projectId/block/list', listBlockByProjectId);
  router.put('/project/:projectId/block/:blockId', validation(validateCUDBlock), updateBlock);
  router.post('/project/:projectId/apartment/type', validation(CUDtypeApartment), createTypeApartment);
  router.get('/project/:projectId/apartment', listApartment);
  router.put('/project/:projectId/apartment/:typeApartmentId/type', validation(CUDtypeApartment), updateTypeApartment);
  router.post('/project/apartment/create', validation(validateCreateApartment), createApartment);
  router.get('/project/apartment/:apartmentId/resident', listResidentInApartment);
  router.get('/project/apartment/:apartmentId', getApartmentById);
  router.put('/project/apartment/:apartmentId', validation(validateUpdateApartment), editApartmentById);
  router.get('/project/:id', getProjectById);
  router.get('/project/block/:blockId', getApartmentByBlock);

  // Building Library
  router.get('/project/:projectId/library-building', getBuildingLibrary);
  router.get('/project/library-building/:libraryId', getBuildingLibraryById);
  router.post('/project/library-building', validation(createLibraryValidate), createBuildingLibrary);
  router.put('/project/library-building/:libraryId', validation(editLibraryValidate), editBuildingLibrary);
  router.delete('/project/library-building/:libraryId', deleteBuildingLibrary);

  // thẻ cư dân
  router.get('/project/residential-card/list', listCard);
  router.get('/project/residential-card/:cardId', detailResidentialCard);
  router.put('/project/residential-card/:cardId', updateResidentialCard);
  app.use('/v1', router);
};
