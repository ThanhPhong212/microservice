const {
  uploadImage,
  uploadVideo,
  uploadProject,
  uploadFile,
  uploadFileEditor,
} = require('../controllers/upload');

module.exports = (app, router) => {
  router.post('/upload-image', uploadImage);
  router.post('/upload-video', uploadVideo);
  router.post('/upload', uploadFile);
  router.post('/upload-ckEditor', uploadFileEditor);
  router.post('/upload-project/:id', uploadProject);
  app.use('/v1/file', router);
};
