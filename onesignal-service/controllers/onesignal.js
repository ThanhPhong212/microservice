/* eslint-disable camelcase */
const { omitBy, isNil } = require('lodash');

const DeviceToken = require('../models/deviceToken');
const Device = require('../models/device');
const CustomNotification = require('../lib/onesignal');

exports.createOrUpdateDevices = async (req, res, next) => {
  try {
    const deviceTokenData = omitBy({
      oneSignalId: req.body.oneSignalId,
      deviceToken: req.body.deviceToken,
      deviceModel: req.body.deviceModel,
      platform: req.body.platform,
      appVersion: req.body.appVersion,
    }, isNil);
    if (req.headers.userid) {
      deviceTokenData.userId = req.headers.userid;
    }
    if ('userId' in req.body && req.body.userId === null) {
      deviceTokenData.userId = null;
    }
    const filter = {
      oneSignalId: req.body.oneSignalId,
      deviceToken: req.body.deviceToken,
    };
    const doc = await DeviceToken.findOneAndUpdate(filter, deviceTokenData, {
      new: true,
      upsert: true, // Make this update into an upsert
    });
    res.status(200).send({
      success: true,
      data: doc,
    });
  } catch (error) {
    res.status(400).send({
      success: false,
      error: error.message,
    });
  }
  next();
};

exports.createOrUpdateDeviceWeb = async (req, res, next) => {
  try {
    const {
      deviceId, playerId, userId, type,
    } = req.body;

    if ('userId' in req.body && req.body.userId === null) {
      req.body.userId = null;
    }

    const doc = await Device.findOneAndUpdate({ playerId }, {
      deviceId, playerId, userId, type,
    }, {
      new: true,
      upsert: true,
    });

    res.status(200).send({
      success: true,
      data: doc,
    });
  } catch (error) {
    res.status(400).send({
      success: false,
      error: error.message,
    });
  }
  next();
};

exports.sendMessage = async (req, res) => {
  try {
    const { userId, content, web_url } = req.body;
    const userDevice = await Device.find({ userId, playerId: { $ne: null } });
    if (userDevice.length) {
      const listPlayerId = userDevice.map((item) => item.playerId);
      const customNotification = new CustomNotification({
        includePlayerIds: listPlayerId,
        contents: { en: `${content}` },
        web_url,
      });
      customNotification.create();
    }

    return res.status(200).send({
      success: true,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.sendMultipleMessage = async (req, res) => {
  try {
    const { userIds, content, web_url } = req.body;

    const userDevice = await Device.find({ userId: { $in: userIds }, playerId: { $ne: null } });
    if (userDevice.length) {
      const listPlayerId = Array.from(userDevice, ({ playerId }) => playerId);
      const customNotification = new CustomNotification(
        {
          includePlayerIds: listPlayerId,
          contents: { en: `${content}` },
          web_url,
        },
      );
      customNotification.create();
    }

    return res.status(200).send({
      success: true,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.sendAll = async (req, res) => {
  try {
    const { content, web_url } = req.body;
    const customNotification = new CustomNotification(
      {
        includedSegments: ['Subscribed Users'],
        contents: { en: `${content}` },
        web_url,
      },
    );
    customNotification.create();

    return res.status(200).send({
      success: true,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
