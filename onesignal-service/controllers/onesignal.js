/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
const { omitBy, isNil } = require('lodash');

const EventEmitter = require('events');
const DeviceToken = require('../models/deviceToken');
const Device = require('../models/device');
const CustomNotification = require('../lib/onesignal');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');
const logger = require('../utils/logger');
const { url } = require('../config');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('SEND-MESSAGE');
  await channel.assertQueue('SEND-MULTIPLE-MESSAGE');
  await channel.assertQueue('CHECK-EVENT-INFO');
  await channel.assertQueue('CHECK-SERVICE-INFO');
};
connectRabbit().then(() => {
  channel.consume('SEND-MESSAGE', async (data) => {
    try {
      // type: HOUSE_ROOF, CASHBACK
      const { userId, content, urlNotify } = JSON.parse(data.content);
      channel.ack(data);
      const userDevice = await Device.find({ userId, playerId: { $ne: null } });
      if (userDevice.length) {
        const listPlayerId = userDevice.map((item) => item.playerId);
        const customNotification = new CustomNotification({
          includePlayerIds: listPlayerId,
          contents: { en: `${content}` },
          web_url: urlNotify || `${url}notifications`,
        });
        customNotification.create();
      }
      return true;
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });

  channel.consume('SEND-MULTIPLE-MESSAGE', async (data) => {
    try {
      const {
        userIds, content,
      } = JSON.parse(data.content);
      channel.ack(data);

      const userDevice = await Device.find({ userId: { $in: userIds }, playerId: { $ne: null } });
      if (userDevice.length) {
        const listPlayerId = Array.from(userDevice, ({ playerId }) => playerId);
        const customNotification = new CustomNotification(
          {
            includePlayerIds: listPlayerId,
            contents: { en: `${content}` },
            web_url: `${url}notifications`,
          },
        );
        customNotification.create();
      }
      return true;
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });
});

//  cập nhật playerId cho  thiết bị
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

// gửi thông báo
exports.sendMessage = async (req, res) => {
  try {
    const {
      userId, content, web_url, type,
    } = req.body;
    const userDevice = await Device.find({ userId, playerId: { $ne: null } });
    if (userDevice.length) {
      const listPlayerId = userDevice.map((item) => item.playerId);
      const customNotification = new CustomNotification({
        includePlayerIds: listPlayerId,
        contents: { en: `${content}` },
        web_url,
        type,
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
    const {
      userIds, content, web_url, type,
    } = req.body;

    const userDevice = await Device.find({ userId: { $in: userIds }, playerId: { $ne: null } });
    if (userDevice.length) {
      const listPlayerId = Array.from(userDevice, ({ playerId }) => playerId);
      const customNotification = new CustomNotification(
        {
          includePlayerIds: listPlayerId,
          contents: { en: `${content}` },
          web_url,
          type,
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
    const { content, web_url, type } = req.body;
    const customNotification = new CustomNotification(
      {
        includedSegments: ['Subscribed Users'],
        contents: { en: `${content}` },
        web_url,
        type,
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

// gửi thông báo sự kiện
exports.checkStartingTheEvent = async () => {
  try {
    await channel.sendToQueue('CHECK-EVENT-GET', Buffer.from(JSON.stringify(5)));
    await channel.consume('CHECK-EVENT-INFO', (info) => {
      const eventData = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('event', eventData);
    });
    setTimeout(() => eventEmitter.emit('event'), 10000);
    const dataEvent = await new Promise((resolve) => { eventEmitter.once('event', resolve); });
    if (dataEvent && dataEvent.length) {
      let userIds = [];

      dataEvent.map((item) => {
        if (item.participants.length) {
          userIds = userIds.concat(item.participants);
        }
        return item;
      });
      if (userIds.length) {
        let userDevice = await Device.aggregate([
          {
            $match: {
              userId: { $in: userIds }, playerId: { $ne: null },
            },
          },
          { $group: { _id: '$userId', devices: { $push: '$$ROOT' } } },
        ]);
        if (userDevice.length) {
          userDevice = userDevice.reduce((acc, cur) => {
            const id = cur._id;
            return { ...acc, [id]: cur };
          }, {});
          if (userDevice) {
            dataEvent.map((element) => {
              let listPlayerIds = [];
              if (element.participants.length) {
                element.participants.map((item) => {
                  if (userDevice[item]) {
                    const listPlayerId = Array.from(userDevice[item].devices, ({ playerId }) => playerId);
                    listPlayerIds = listPlayerIds.concat(listPlayerId);
                  }
                  return item;
                });
              }
              if (listPlayerIds.length) {
                const customNotification = new CustomNotification(
                  {
                    includePlayerIds: listPlayerIds,
                    contents: { en: `${element.title} sắp bắt đầu` },
                    web_url: `${url}community/${element._id}`,
                  },
                );
                customNotification.create();
              }
              return element;
            });
          }
        }
      }
    }
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
};

// gửi thông báo tiện ích
exports.checkTheUtilityRegistration = async () => {
  try {
    // lấy thông tin tiện ích mà người dũng đã đăng ký ngày hôm nay
    await channel.sendToQueue('CHECK-SERVICE-GET', Buffer.from(JSON.stringify(5)));
    await channel.consume('CHECK-SERVICE-INFO', (info) => {
      const serviceData = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('service', serviceData);
    });
    setTimeout(() => eventEmitter.emit('service'), 10000);
    const registerList = await new Promise((resolve) => { eventEmitter.once('service', resolve); });

    if (registerList && registerList.length) {
      // lấy list playerId của user để gửi thông báo
      const listUserId = Array.from(registerList, ({ userId }) => userId);
      if (listUserId.length) {
        let userDevice = await Device.aggregate([
          { $match: { userId: { $in: listUserId }, playerId: { $ne: null } } },
          { $group: { _id: '$userId', devices: { $push: '$$ROOT' } } },
        ]);

        // gửi thông báo đến tất cả các playerId của user
        if (userDevice.length) {
          userDevice = userDevice.reduce((acc, cur) => {
            const id = cur._id;
            return { ...acc, [id]: cur };
          }, {});
          if (userDevice) {
            registerList.map((element) => {
              const listPlayerIds = [];
              if (element.userId && userDevice[element.userId]) {
                const { devices } = userDevice[element.userId];
                if (devices.length) {
                  devices.map((item) => { listPlayerIds.push(item.playerId); return item; });
                }
              }
              if (listPlayerIds.length) {
                const customNotification = new CustomNotification(
                  {
                    includePlayerIds: listPlayerIds,
                    contents: { en: `${element.service.name} bạn đã đăng ký lúc ${element.time[0].from} đừng quên nhé` },
                    web_url: `${url}service/history/${element._id}`,
                  },
                );
                customNotification.create();
              }
              return element;
            });
          }
        }
      }
    }
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
};

// gửi thông báo cập nhật mua nhà PPA
exports.createNotifyPPA = async (req, res) => {
  try {
    const {
      userId, content, type, title, repairId, stepId, productId,
    } = req.body;

    let typeNotify = 'PPA';
    if (!userId) {
      return res.status(400).send({
        success: false,
        message: '',
      });
    }
    let web_url = null;
    if (type === 'MAINTENANCE') {
      web_url = `${url}post-purchase/maintain/${repairId}/`;
    }
    if (type === 'PAYMENT') {
      web_url = `${url}post-purchase/invoice/${stepId}`;
    }
    if (type === 'PRODUCT') {
      web_url = `${url}post-purchase/estate/${productId}`;

      if (title.includes('Yêu cầu đặt lịch')) {
        typeNotify = 'TASK';
      }
    }
    channel.sendToQueue('CREATE-NOTIFY', Buffer.from(JSON.stringify({
      type: typeNotify,
      title,
      content,
      toUser: userId,
      url: web_url,
    })));

    const userDevice = await Device.find({ userId, playerId: { $ne: null } });
    if (userDevice.length) {
      const listPlayerId = userDevice.map((item) => item.playerId);
      const customNotification = new CustomNotification({
        includePlayerIds: listPlayerId,
        contents: { en: `${title}` },
        web_url,
      });
      customNotification.create();
    }
    return res.status(200).send({
      success: true,
    });
  } catch (error) {
    logger.error(error);
    return res.status(200).send({
      success: false,
    });
  }
};
