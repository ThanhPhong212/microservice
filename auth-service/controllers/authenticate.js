/* eslint-disable no-underscore-dangle */
/* eslint-disable default-param-last */
/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
const jwt = require('jsonwebtoken');
const connect = require('../lib/rabbitMQ');
const Auth = require('../models/authenticate');
const logger = require('../utils/logger');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('AUTH-USER');
};
connectRabbit().then(() => {
  channel.consume('AUTH-USER', async (data) => {
    try {
      const auth = JSON.parse(data.content);
      const userAuth = await Auth.findOne({ userId: auth.userId });
      if (userAuth) {
        userAuth.value = auth.value;
        await userAuth.save();
      }
      if (!userAuth) {
        await Auth.create(auth);
      }
      channel.ack(data);
    } catch (err) {
      logger.error(err.message);
    }
  });
});

// eslint-disable-next-line consistent-return
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return next('Please login to access the data!');
    }
    const bearerToken = token.split(' ')[1];
    const verify = jwt.verify(bearerToken, process.env.SECRET_KEY);
    const data = {
      userId: verify._id, role: verify.role, name: verify.name, phone: verify.phone,
    };
    const auth = await Auth.findOne({ userId: verify._id });
    if (!auth) {
      return res.status(401).send({
        success: false,
        error: 'Authenticate fail!',
      });
    }
    if (auth) {
      return res.status(200).send({
        success: true,
        data,
      });
    }
  } catch (error) {
    return res.status(401).send({
      success: false,
      error: error.message,
    });
  }
};

exports.createRefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(403).send({
        success: false,
        error: 'Refresh token is required!!!',
      });
    }
    const verify = jwt.verify(refreshToken, process.env.SECRET_REFRESH_KEY);
    const {
      _id, name, role, phone,
    } = verify;
    const token = jwt.sign({
      _id, name, role, phone,
    }, process.env.SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRE,
    });
    const userAuth = await Auth.findOne({ userId: _id });
    if (userAuth) {
      userAuth.value = token;
      await userAuth.save();
    }
    return res.status(200).send({
      success: true,
      data: {
        token,
      },
    });
  } catch (error) {
    logger.error(error);
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
