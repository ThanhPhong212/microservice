const ROUTES = [
  {
    url: '/v1/users/login',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:1001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/users/demo',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:1001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/users/create',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:1001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/users/detail',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:1001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/users',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:1001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/users/profile',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:1001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/users',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:1001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/auth/refresh-token',
    auth: false,
    creditCheck: false,
    proxy: {
      target: 'http://localhost:3001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/auth/refresh-token',
    auth: false,
    creditCheck: false,
    proxy: {
      target: 'http://localhost:3001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/auth',
    auth: false,
    creditCheck: false,
    proxy: {
      target: 'http://localhost:3001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/file',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:2001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/file',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:2001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/project',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:4001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/project',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:4001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/notify',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:5001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/notifications',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:5001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/services',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:6001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/community',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:6001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/services',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:6001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/requests',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:5050',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/requests',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:5050',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/devices/playerid',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:7001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/devices/send-notify-ppa',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:7001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/devices',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:7001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/onesignal',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:7001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/parking',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:8001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/order',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:9001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/order',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:9001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/parking',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:8001',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/cashback/order',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:8443',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/cashback',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:8443',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/ppa',
    auth: false,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:9999',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  {
    url: '/v1/mobile/cashback',
    auth: true,
    creditCheck: false,
    // rateLimit: {
    //   windowMs: 15 * 60 * 1000,
    //   max: 5,
    // },
    proxy: {
      target: 'http://localhost:8443',
      changeOrigin: true,
      // pathRewrite: {
      //   '^/users': '',
      // },
    },
  },
  // { example 2
  //   url: '/premium',
  //   auth: true,
  //   creditCheck: true,
  //   proxy: {
  //     target: 'https://www.google.com',
  //     changeOrigin: true,
  //     pathRewrite: {
  //       '^/premium': '',
  //     },
  //   },
  // },
];

exports.ROUTES = ROUTES;
