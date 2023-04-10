const {
  uploadImage,
  uploadVideo,
  uploadFile,
} = require('../controllers/upload');

module.exports = (app, router) => {
  router.post('/upload-image', uploadImage);
  router.post('/upload', uploadFile);
  router.post('/upload-video', uploadVideo);
  app.use('/v1/mobile/file', router);
};
