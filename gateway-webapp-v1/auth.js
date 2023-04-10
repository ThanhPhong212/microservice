const Keycloak = require('keycloak-connect');
const session = require('express-session');

const setupAuth = (app, routes) => {
  const memoryStore = new session.MemoryStore();
  const keycloak = new Keycloak({ store: memoryStore });

  app.use(session({
    secret: '<RANDOM GENERATED TOKEN>',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  }));

  app.use(keycloak.middleware());

  routes.forEach((r) => {
    if (r.auth) {
      app.use(r.url, keycloak.protect(), (req, res, next) => {
        next();
      });
    }
  });
};

exports.setupAuth = setupAuth;
