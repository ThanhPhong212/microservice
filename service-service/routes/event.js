const {
  createEvent, editEvent, listEvent, eventDetail, joinTheEvent, interestedEvent,
} = require('../controllers/event');

module.exports = (app, router) => {
  router.post('/event', createEvent);
  router.patch('/event/:eventId', joinTheEvent);
  router.patch('/event/interest/:eventId', interestedEvent);
  router.put('/event/:eventId', editEvent);
  router.get('/event', listEvent);
  router.get('/event/:eventId', eventDetail);
  app.use('/v1/community', router);
};
