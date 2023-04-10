/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
const jwt = require('jsonwebtoken');
const User = require('../models/user');

function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return [
    async (req, res, next) => {
      const bearerHeader = req.headers.authorization;
      if (!bearerHeader) {
        return next('Please login to access the data');
      }
      try {
        const bearer = bearerHeader.split(' ')[1];
        const verify = jwt.verify(bearer, process.env.SECRET_KEY);
        const user = await User.findById(verify._id).populate('role').select('role').exec();
        if (!user) {
          return next('User not found');
        }
        if (roles.length && !roles.includes(user.role.value)) {
          return next('Unauthorized');
        }
        next();
      } catch (error) {
        next(error.message);
      }
    },
  ];
}
module.exports = authorize;
