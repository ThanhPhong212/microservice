const {
  uploadImage,
  uploadVideo,
  uploadProject,
  uploadFile,
  uploadFileEditor,
  uploadImagePPA,
} = require('../controllers/upload');

module.exports = (app, router) => {
  router.post('/upload-image', uploadImage);
  router.post('/upload-video', uploadVideo);
  router.post('/upload', uploadFile);
  router.post('/upload-ckEditor', uploadFileEditor);
  router.post('/upload-project/:id', uploadProject);
  router.post('/upload-image-repair/:repairId', uploadImagePPA);
  app.use('/v1/file', router);
};
