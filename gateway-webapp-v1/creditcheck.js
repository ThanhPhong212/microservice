const checkCredit = (req) => new Promise((resolve, reject) => {
  console.log('Checking credit with token', req.headers.authorization);
  setTimeout(() => {
    // eslint-disable-next-line prefer-promise-reject-errors
    reject('No sufficient credits');
  }, 500);
});

const setupCreditCheck = (app, routes) => {
  routes.forEach((r) => {
    if (r.creditCheck) {
      app.use(r.url, (req, res, next) => {
        checkCredit(req).then(() => {
          next();
        }).catch((error) => {
          res.status(402).send({ error });
        });
      });
    }
  });
};

exports.setupCreditCheck = setupCreditCheck;
