const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');

const setupProxies = (app, routes) => {
  routes.forEach((r) => {
    if (r.auth) {
      app.use(r.url, async (req, res, next) => {
        const bearerHeader = req.headers.authorization;
        if (!bearerHeader) {
          return res.status(401).json({
            success: false,
            error: 'Authenticate fail!',
          });
        }
        try {
          const response = await axios.get(`${process.env.URL_AUTH}v1/auth`, {
            headers: {
              Authorization: bearerHeader,
            },
          });
          if (response && response.data?.success) {
            req.headers.userId = response.data.data.userId;
            req.headers.role = response.data.data.role;
            req.headers.phone = response.data.data.phone;
            return next();
          }
          return res.status(401).send({
            success: false,
            error: 'Authenticate fail!',
          });
        } catch (error) {
          return res.status(400).send({
            success: false,
            error: 'Authenticate fail!',
          });
        }
      }, createProxyMiddleware(r.proxy));
    } else {
      app.use(r.url, createProxyMiddleware(r.proxy));
    }
  });
};

exports.setupProxies = setupProxies;
