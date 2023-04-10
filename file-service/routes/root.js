const rootController = require('../controllers/root');

module.exports = (app) => {
  app.route('/').get(rootController.index);
};
