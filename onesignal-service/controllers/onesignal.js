const { omitBy, isNil } = require('lodash');

const DeviceToken = require('../models/deviceToken');

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
