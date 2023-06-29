/* eslint-disable consistent-return */
/* eslint-disable radix */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');

const eventEmitter = new EventEmitter();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Role = require('../models/role');
const Otp = require('../models/otp');
const logger = require('../utils/logger');
const connect = require('../lib/rabbitMQ');
const Demo = require('../models/demo');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('OWNER-GET');
  await channel.assertQueue('RESIDENT-GET');
  await channel.assertQueue('USER-LIST');
  await channel.assertQueue('USER-SEND-SERVICE');
  await channel.assertQueue('USER-SEARCH');
  await channel.assertQueue('USER-GET');
  await channel.assertQueue('USER-SEARCH-BY-FIELD');
  await channel.assertQueue('USER-REGISTER-SEARCH-GET');
  await channel.assertQueue('USER-DETAILS-GET');
  await channel.assertQueue('PARKING-SEARCH-USER-GET');
  await channel.assertQueue('PARKING-USER-GET');
  await channel.assertQueue('PARKING-DETAILS-USER-GET');
  await channel.assertQueue('USER-SEARCH-REQUEST');
  await channel.assertQueue('USER-SEND-REQUEST');
  await channel.assertQueue('USER-SEND-REQUESTID');
  await channel.assertQueue('CARD-USER-GET');
  await channel.assertQueue('CARD-SEARCH-USER-GET');
  await channel.assertQueue('CARD-DETAIL-USER-GET');
  await channel.assertQueue('REQUEST-USER-ROLE-GET');
  await channel.assertQueue('APARTMENT-CREATE-USER');
  await channel.assertQueue('USER-CREATE-APARTMENT-GET');
  await channel.assertQueue('LIBRARY-USER-GET');
  await channel.assertQueue('LIBRARY-DETAIL-USER-GET');
  await channel.assertQueue('FEE-CONFIG-USER-GET');
  await channel.assertQueue('FEE-CONFIG-USERID-GET');
  await channel.assertQueue('FEE-SEARCH-USER-GET');
  await channel.assertQueue('FEE-USER-GET');
  await channel.assertQueue('ORDER-USER-GET');
  await channel.assertQueue('ORDER-DETAIL-USER-GET');
  await channel.assertQueue('USER-DELETE-INFO');
  await channel.assertQueue('ORDER-EXPORT-USER-GET');
  await channel.assertQueue('ACCOUNTING-LIST-USER-GET');
  await channel.assertQueue('APARTMENT-LIST-RESIDENT-GET');
  await channel.assertQueue('ORDER-LIST-DETAIL-USER-GET');
  await channel.assertQueue('PAYMENT-USER-GET');
  await channel.assertQueue('STATISTICS-USER-GET');
  await channel.assertQueue('USER-APARTMENT-INFO');
  await channel.assertQueue('RECEIPT-EXPORT-USER-GET');
  await channel.assertQueue('PAYMENT-EXPORT-USER-GET');
  await channel.assertQueue('USER-ADD-PROJECT');
  await channel.assertQueue('LIST-PROJECT-USER-GET');
  await channel.assertQueue('PROJECT-MANAGE-GET');
  await channel.assertQueue('CASHBACK-CATEGORY-USER-GET');
  await channel.assertQueue('CASHBACK-LIST-CATEGORY-USER-GET');
  await channel.assertQueue('CASHBACK-CATEGORY-PARTNER-GET');
  await channel.assertQueue('CASHBACK-ORDER-PARTNER-GET');
  await channel.assertQueue('CASHBACK-ORDER-USER-GET');
  await channel.assertQueue('CASHBACK-ORDER-DETAIL-USER-GET');
  await channel.assertQueue('CASHBACK-EDIT-ORDER-GET');
  await channel.assertQueue('USER-CATEGORY-INFO');
  await channel.assertQueue('USER-CATEGORY-DETAIL-INFO');
  await channel.assertQueue('CASHBACK-MOBILE-CATEGORY-USER-GET');
  await channel.assertQueue('CASHBACK-MOBILE-CATEGORY-DETAIL-USER-GET');
  await channel.assertQueue('CHECK-API-KEY-GET');
  await channel.assertQueue('USER-WALLET-INFO');
  await channel.assertQueue('WALLET-USER-GET');
  await channel.assertQueue('ORDER-CASHBACK-USER-GET');
  await channel.assertQueue('RESIDENT-CARD-CHECK-USER-GET');
  await channel.assertQueue('RESIDENT-CARD-CREATE-USER');
  await channel.assertQueue('RESIDENT-CARD-USER-GET');
  await channel.assertQueue('NOTIFY-DETAIL-USER-GET');
  await channel.assertQueue('EVENT-USER-GET');
  await channel.assertQueue('EVENT-CREATEDBY-GET');
  await channel.assertQueue('EVENT-CREATEDBY-DETAIL-GET');
  await channel.assertQueue('EVENT-USER-DETAIL-GET');
};

const getJsonUser = async (arrayUserId) => {
  try {
    const user = await User.find({ _id: { $in: arrayUserId } }, '-password').lean();
    const jsonData = {};
    user.forEach((element) => {
      jsonData[element._id] = element;
    });
    return jsonData;
  } catch (error) {
    return null;
  }
};

const listUserID = async (listUserId) => {
  try {
    const user = await User.find({ _id: { $in: listUserId } }).select('-password');
    const userData = user.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});
    return userData;
  } catch (error) {
    return null;
  }
};

const searchUser = async (keywords) => {
  try {
    const user = await User.find({
      $or: [
        { name: { $regex: keywords, $options: 'i' } },
        { phone: { $regex: keywords, $options: 'i' } },
      ],
    });
    return user;
  } catch (error) {
    return null;
  }
};

const detailUser = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password').populate('role');
    return user;
  } catch (error) {
    return null;
  }
};

const searchUserByField = async (dtum) => {
  const query = {};
  query.$or = [];
  if (dtum.field.length > 0) {
    await Promise.all(dtum.field.map((item) => {
      if (item.type === 'string') {
        query.$or.push({ [item.value]: { $regex: dtum.keywords, $options: 'i' } });
        return item;
      }
      query.$or.push({
        [item.value]: {
          $expr: {
            $regexMatch: {
              input: { $toString: item.value },
              regex: dtum.keywords,
            },
          },
        },
      });
      return item;
    }));
  }
  return query;
};

const convertArrayObjIdToArrayString = (data) => {
  try {
    const element = [];
    data.map((item) => {
      element.push(item.toString());
      return item;
    });
    return element;
  } catch (error) {
    logger.error(error);
    return [];
  }
};

connectRabbit().then(() => {
  channel.consume('EVENT-USER-DETAIL-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findById(userId).select('-__v -password');
      channel.sendToQueue('EVENT-USER-DETAIL-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('EVENT-USER-DETAIL-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('EVENT-CREATEDBY-DETAIL-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findById(userId).select('-__v -password');
      channel.sendToQueue('EVENT-CREATEDBY-DETAIL-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('EVENT-CREATEDBY-DETAIL-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('EVENT-CREATEDBY-GET', async (data) => {
    try {
      const listId = JSON.parse(data.content);
      channel.ack(data);
      let user = await User.find({ _id: { $in: listId } }).select('-__v -password');
      if (user.length > 0) {
        user = user.reduce((acc, cur) => {
          const id = cur._id;
          return { ...acc, [id]: cur };
        }, {});
      }
      channel.sendToQueue('EVENT-CREATEDBY-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('EVENT-CREATEDBY-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('EVENT-USER-GET', async (data) => {
    try {
      const listId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listId } }).select('avatar name phone');
      channel.sendToQueue('EVENT-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('EVENT-USER-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('NOTIFY-DETAIL-USER-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findById(userId).select('-__v -password');
      channel.sendToQueue('NOTIFY-DETAIL-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('NOTIFY-DETAIL-USER-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('RESIDENT-CARD-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } }).select('-__v -password');
      channel.sendToQueue('RESIDENT-CARD-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('RESIDENT-CARD-USER-INFO', Buffer.from(JSON.stringify([])));
    }
  });

  channel.consume('RESIDENT-CARD-CREATE-USER', async (data) => {
    try {
      const { phone, numberIdentify, projectId } = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findOne({ phone, numberIdentify });
      if (user) {
        if (user.isDeleted) {
          await User.findByIdAndUpdate(user._id, { isDeleted: false });
        }
        if (!user.projects.includes(projectId)) {
          user.projects.push(projectId);
          await User.findByIdAndUpdate(user._id, { projects: user.projects });
        }
      }
      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  });

  channel.consume('RESIDENT-CARD-CHECK-USER-GET', async (data) => {
    try {
      const dataUser = JSON.parse(data.content);
      channel.ack(data);
      const role = await Role.findOne({ value: 'CUSTOMER' });
      const user = await User.findOne(
        { phone: dataUser.phone, numberIdentify: dataUser.numberIdentify, role: role._id },
      );
      let check = true;
      if (!user) {
        dataUser.username = dataUser.numberIdentify;
        dataUser.isDeleted = true;
        dataUser.projects = [dataUser.partnerId];
        dataUser.role = role._id;
        await User.create(dataUser);
      } else if (user.projects.includes(dataUser.projectId)) {
        check = false;
      }
      channel.sendToQueue('RESIDENT-CARD-CHECK-USER-INFO', Buffer.from(JSON.stringify(check)));
    } catch (error) {
      channel.sendToQueue('RESIDENT-CARD-CHECK-USER-INFO', Buffer.from(JSON.stringify(false)));
    }
  });

  channel.consume('ORDER-CASHBACK-USER-GET', async (data) => {
    try {
      const phone = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findOne({ phone });
      channel.sendToQueue('ORDER-CASHBACK-USER-INFO', Buffer.from(JSON.stringify(user ? user._id.toString() : null)));
    } catch (error) {
      channel.sendToQueue('ORDER-CASHBACK-USER-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('WALLET-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } }).select('-__v -password');
      channel.sendToQueue('WALLET-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('WALLET-USER-INFO', Buffer.from(JSON.stringify([])));
    }
  });

  channel.consume('CHECK-API-KEY-GET', async (data) => {
    try {
      const apiKey = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findOne({ APIKey: apiKey });
      channel.sendToQueue('CHECK-API-KEY-INFO', Buffer.from(JSON.stringify(!!user)));
    } catch (error) {
      channel.sendToQueue('CHECK-API-KEY-INFO', Buffer.from(JSON.stringify(false)));
    }
  });

  channel.consume('CASHBACK-MOBILE-CATEGORY-DETAIL-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } }).select('-__v -password');
      channel.sendToQueue('CASHBACK-MOBILE-CATEGORY-DETAIL-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CASHBACK-MOBILE-CATEGORY-DETAIL-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-MOBILE-CATEGORY-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } }).select('-__v -password');
      channel.sendToQueue('CASHBACK-MOBILE-CATEGORY-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CASHBACK-MOBILE-CATEGORY-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-EDIT-ORDER-GET', async (data) => {
    try {
      const apiKey = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findOne({ APIKey: apiKey });
      channel.sendToQueue('CASHBACK-EDIT-ORDER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = null;
      channel.sendToQueue('CASHBACK-EDIT-ORDER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-ORDER-DETAIL-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } });
      channel.sendToQueue('CASHBACK-ORDER-DETAIL-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CASHBACK-ORDER-DETAIL-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-ORDER-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } });
      channel.sendToQueue('CASHBACK-ORDER-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CASHBACK-ORDER-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-ORDER-PARTNER-GET', async (data) => {
    try {
      const apiKey = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findOne({ APIKey: apiKey });
      channel.sendToQueue('CASHBACK-ORDER-PARTNER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = null;
      channel.sendToQueue('CASHBACK-ORDER-PARTNER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-CATEGORY-PARTNER-GET', async (data) => {
    try {
      const partnerId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findById(partnerId).select('category');
      channel.sendToQueue('CASHBACK-CATEGORY-PARTNER-INFO', Buffer.from(JSON.stringify(user ? user.category : [])));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CASHBACK-CATEGORY-PARTNER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-LIST-CATEGORY-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } }).select('-__v -password');
      channel.sendToQueue('CASHBACK-LIST-CATEGORY-USER-INFO', Buffer.from(JSON.stringify(user ?? [])));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CASHBACK-LIST-CATEGORY-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CASHBACK-CATEGORY-USER-GET', async (data) => {
    try {
      const listUserId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.find({ _id: { $in: listUserId } }).select('-__v -password');
      channel.sendToQueue('CASHBACK-CATEGORY-USER-INFO', Buffer.from(JSON.stringify(user ?? [])));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CASHBACK-CATEGORY-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('PROJECT-MANAGE-GET', async (data) => {
    const projectId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const role = await Role.findOne({ value: 'MANAGER_COMPANY' });
      const userData = await User.findOne({ projects: projectId, role: role._id }).select('name').lean();
      channel.sendToQueue('PROJECT-MANAGE-INFO', Buffer.from(JSON.stringify(userData ?? null)));
    } catch (error) {
      const dataAvailable = null;
      channel.sendToQueue('PROJECT-MANAGE-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('LIST-PROJECT-USER-GET', async (data) => {
    const userId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await User.findById(userId);
      channel.sendToQueue('LIST-PROJECT-USER-INFO', Buffer.from(JSON.stringify(userData ? userData.projects : [])));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('LIST-PROJECT-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('USER-ADD-PROJECT', async (data) => {
    const { managerCompanyId, projectId, role } = JSON.parse(data.content);
    channel.ack(data);
    try {
      const user = await User.findById(managerCompanyId);
      if (user) {
        user.projects.push(projectId);
        await User.findByIdAndUpdate(managerCompanyId, { projects: user.projects });
        if (role !== 'ADMIN_SPS') {
          const investor = await User.findById(user.parent);
          if (investor && !investor.projects.includes(projectId)) {
            investor.projects.push(projectId);
            await User.findByIdAndUpdate(investor._id, { projects: investor.projects });
          }
        }
      }
    } catch (error) {
      logger.error(error);
    }
  });

  channel.consume('PAYMENT-EXPORT-USER-GET', async (data) => {
    const listUserId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await listUserID(listUserId);
      channel.sendToQueue('PAYMENT-EXPORT-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('PAYMENT-EXPORT-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('RECEIPT-EXPORT-USER-GET', async (data) => {
    const listUserId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await listUserID(listUserId);
      channel.sendToQueue('RECEIPT-EXPORT-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('RECEIPT-EXPORT-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('STATISTICS-USER-GET', async (data) => {
    const userId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await listUserID(userId);
      channel.sendToQueue('STATISTICS-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      logger.error(error);
      const dataAvailable = [];
      channel.sendToQueue('STATISTICS-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('PAYMENT-USER-GET', async (data) => {
    const userId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await detailUser(userId);
      channel.sendToQueue('PAYMENT-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      logger.error(error);
      const dataAvailable = [];
      channel.sendToQueue('PAYMENT-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-LIST-DETAIL-USER-GET', async (data) => {
    const listUserId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await listUserID(listUserId);
      channel.sendToQueue('ORDER-LIST-DETAIL-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      logger.error(error);
      const dataAvailable = [];
      channel.sendToQueue('ORDER-LIST-DETAIL-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('APARTMENT-LIST-RESIDENT-GET', async (data) => {
    const listUserId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await listUserID(listUserId);
      channel.sendToQueue('APARTMENT-LIST-RESIDENT-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('APARTMENT-LIST-RESIDENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ACCOUNTING-LIST-USER-GET', async (data) => {
    const listUserId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await listUserID(listUserId);
      channel.sendToQueue('ACCOUNTING-LIST-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('ACCOUNTING-LIST-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-EXPORT-USER-GET', async (data) => {
    const listUserId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await listUserID(listUserId);
      channel.sendToQueue('ORDER-EXPORT-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('ORDER-EXPORT-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-DETAIL-USER-GET', async (data) => {
    const userId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await detailUser(userId);
      channel.sendToQueue('ORDER-DETAIL-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = null;
      channel.sendToQueue('ORDER-DETAIL-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-USER-GET', async (data) => {
    const userId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const userData = await detailUser(userId);
      channel.sendToQueue('ORDER-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = null;
      channel.sendToQueue('ORDER-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-SEARCH-USER-GET', async (data) => {
    const keywords = JSON.parse(data.content);
    try {
      const userData = await searchUser(keywords);
      channel.sendToQueue('FEE-SEARCH-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-SEARCH-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('FEE-USER-GET', async (data) => {
    const listUserId = JSON.parse(data.content);
    try {
      const userData = await listUserID(listUserId);
      channel.sendToQueue('FEE-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('FEE-CONFIG-USER-GET', async (data) => {
    try {
      const listId = JSON.parse(data.content);
      channel.ack(data);
      const user = await listUserID(listId);

      channel.sendToQueue('FEE-CONFIG-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('FEE-CONFIG-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-CONFIG-USERID-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      channel.ack(data);
      const user = await User.findById(userId);

      channel.sendToQueue('FEE-CONFIG-USERID-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('FEE-CONFIG-USERID-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('LIBRARY-USER-GET', async (data) => {
    try {
      const listId = JSON.parse(data.content);
      channel.ack(data);
      const user = await listUserID(listId);
      channel.sendToQueue('LIBRARY-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('LIBRARY-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('LIBRARY-DETAIL-USER-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      const user = await User.find({ _id: { $in: userId } }).select('-password');
      const userData = user.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      channel.sendToQueue('LIBRARY-DETAIL-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('LIBRARY-DETAIL-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('APARTMENT-CREATE-USER', async (data) => {
    try {
      const dataCreate = JSON.parse(data.content);
      channel.ack(data);
      const listResidentNew = [];
      const listUpdateIsDelete = [];
      const listAddProjectId = [];
      const listUpdateName = [];
      let createNewUser;

      // Check the user exist
      const user = await User.find({
        phone: { $in: dataCreate.listPhone },
      }).select('phone name projects isDeleted');

      // get role id customer
      const getRoleId = await Role.findOne({ value: 'CUSTOMER' });

      // List of residents by key: phone
      const listResidents = dataCreate.listResidents.reduce((acc, cur) => {
        const id = cur.phone;
        return { ...acc, [id]: cur };
      }, {});

      if (user.length > 0) {
        user.map(async (item) => {
          // If the user has been deleted the user to the recovery list
          if (item.isDeleted) {
            listUpdateIsDelete.push(item._id);
          }

          // Check the user is in the current project
          const checkProject = item.projects.filter(
            (projectId) => projectId === dataCreate.projectId,
          ).length === 1;

          if (checkProject) {
            // If it exists in the project, put the user in listResidentNew and update name
            listResidentNew.push({
              _id: item._id, phone: item.phone,
            });
            listUpdateName.push({
              _id: item._id, phone: item.phone, name: listResidents[item.phone].name,
            });
          } else {
            // add the project to the user then put user in listResidentNew, and update name
            listAddProjectId.push({
              _id: item._id,
              name: listResidents[item.phone].name,
              projectId: item.projects,
            });
            listResidentNew.push({
              _id: item._id, phone: item.phone,
            });
          }
        });

        // Get a list of users who do not exist in the system, and create new
        const ListUserOld = Array.from(user, ({ phone }) => phone);
        const listUserNew = dataCreate.listPhone;
        const listDifference = listUserNew.filter((x) => !ListUserOld.includes(x));
        const listCreateUser = [];
        if (listDifference.length > 0) {
          listDifference.map((item) => {
            listCreateUser.push({
              name: listResidents[item].name,
              phone: item,
              role: getRoleId._id,
              projects: [dataCreate.projectId],
            });
            return item;
          });
          createNewUser = await User.insertMany(listCreateUser);
        }
      } else {
        // Create accounts for users if that account does not exist
        const listCreateUser = dataCreate.listResidents;
        listCreateUser.map((item) => {
          item.role = getRoleId._id;
          item.projects = [dataCreate.projectId];
          return item;
        });
        createNewUser = await User.insertMany(dataCreate.listResidents);
      }

      // Put the new user list listResidentNew
      if (createNewUser && createNewUser.length > 0) {
        createNewUser.map((item) => {
          listResidentNew.push({ _id: item._id, phone: item.phone });
          return item;
        });
      }

      // Add projects and update names
      if (listAddProjectId.length > 0) {
        const listUpdateNameAndProjectId = listAddProjectId.map((item) => {
          item.projectId.push(dataCreate.projectId);
          return {
            updateOne: {
              filter: { _id: item._id },
              update: { $set: { projects: item.projectId, name: item.name } },
            },
          };
        });
        await User.bulkWrite(listUpdateNameAndProjectId);
      }

      // Update name
      if (listUpdateName.length > 0) {
        const listUpdateNameInProJect = listUpdateName.map((item) => ({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { name: item.name } },
          },
        }));
        await User.bulkWrite(listUpdateNameInProJect);
      }

      // account recovery if the account has been deleted
      if (listUpdateIsDelete.length > 0) {
        await User.updateMany(
          { _id: { $in: listUpdateIsDelete } },
          { $set: { isDeleted: false } },
        );
      }

      channel.sendToQueue('APARTMENT-DATA-USER', Buffer.from(JSON.stringify(listResidentNew)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('APARTMENT-DATA-USER', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('USER-CREATE-APARTMENT-GET', async (info) => {
    try {
      const data = JSON.parse(info.content);
      channel.ack(info);

      const user = await User.findById(data.owner);
      if (user) {
        if (user.projects.length) {
          const { projectId } = data;
          const checkProject = user.projects.includes(projectId);
          if (!checkProject) {
            user.projects.push(projectId);
            await User.findByIdAndUpdate(data.owner, { projects: user.projects });
          }
        } else {
          const projectId = [...user.projectId, data.projectId];
          await User.findByIdAndUpdate(data.owner, { projects: [projectId] });
        }
      }
    } catch (error) {
      logger.error(error);
    }
  });

  channel.consume('REQUEST-USER-ROLE-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      const user = await detailUser(userId);
      channel.sendToQueue('REQUEST-USER-ROLE-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('REQUEST-USER-ROLE-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('CARD-DETAIL-USER-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      const user = await detailUser(userId);
      channel.sendToQueue('CARD-DETAIL-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('CARD-DETAIL-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('CARD-SEARCH-USER-GET', async (data) => {
    const keywords = JSON.parse(data.content);
    try {
      const userData = await searchUser(keywords);
      channel.sendToQueue('CARD-SEARCH-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('CARD-SEARCH-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('CARD-USER-GET', async (data) => {
    try {
      const listId = JSON.parse(data.content);
      const user = await listUserID(listId);

      channel.sendToQueue('CARD-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('CARD-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('PARKING-USER-GET', async (data) => {
    try {
      const arrayUserId = JSON.parse(data.content);
      const user = await listUserID(arrayUserId);

      channel.sendToQueue('PARKING-USER-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('PARKING-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('PARKING-SEARCH-USER-GET', async (data) => {
    const keywords = JSON.parse(data.content);
    try {
      const userData = await searchUser(keywords);
      channel.sendToQueue('PARKING-SEARCH-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('PARKING-SEARCH-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('PARKING-DETAILS-USER-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      const userData = await detailUser(userId);
      channel.sendToQueue('PARKING-DETAILS-USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('PARKING-DETAILS-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('USER-DETAILS-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      const user = await User.findById(userId).select('-password');

      channel.sendToQueue('USER-DETAILS-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('USER-DETAILS-INFO', Buffer.from(JSON.stringify(null)));
    }
    channel.ack(data);
  });

  // Get information owner
  channel.consume('OWNER-GET', async (data) => {
    try {
      const dtum = JSON.parse(data.content);

      // Get the owner's ID list
      const userId = Array.from(dtum, ({ owner }) => owner);

      // Find the owner information through the ID list
      const dataUser = await User.find({ _id: { $in: userId } }).select('name');
      const userData = dataUser.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      dtum.map((item) => {
        if (item.owner) {
          if (userData[item.owner] && userData[item.owner].name) {
            item.owner = userData[item.owner].name;
          }
        }
        if (item.block && item.typeApartment) {
          item.typeApartment = item.typeApartment.name;
          item.block = item.block.name;
        }
        return item;
      });

      channel.sendToQueue('OWNER-INFO', Buffer.from(JSON.stringify(dtum)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('OWNER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  // Get information all residents in the apartment
  channel.consume('RESIDENT-GET', async (data) => {
    try {
      const dtum = JSON.parse(data.content);
      if (dtum.owner) {
        dtum.owner = await User.findById(dtum.owner).select('-password');
      }
      if (dtum.relativeOwners) {
        dtum.relativeOwners = await User.find({ _id: { $in: dtum.relativeOwners } }).select('-password');
      }
      if (dtum.tenants) {
        dtum.tenants = await User.find({ _id: { $in: dtum.tenants } }).select('-password');
      }
      if (dtum.memberTenants) {
        dtum.memberTenants = await User.find({ _id: { $in: dtum.memberTenants } }).select('-password');
      }
      channel.sendToQueue('RESIDENT-INFO', Buffer.from(JSON.stringify(dtum)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('RESIDENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('USER-LIST', async (data) => {
    const listId = JSON.parse(data.content);
    try {
      const user = await getJsonUser(listId);
      channel.sendToQueue('USER-NOTIFY', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('USER-NOTIFY', Buffer.from(JSON.stringify(null)));
    }
    channel.ack(data);
  });

  channel.consume('USER-SEND-SERVICE', async (data) => {
    const dtum = JSON.parse(data.content);
    try {
      const user = await getJsonUser(dtum);
      channel.sendToQueue('SERVICE-GET-USER', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('SERVICE-GET-USER', Buffer.from(JSON.stringify(null)));
    }
    channel.ack(data);
  });
  channel.consume('USER-SEND-REQUEST', async (data) => {
    const dtum = JSON.parse(data.content);
    try {
      const user = await getJsonUser(dtum);
      channel.sendToQueue('REQUEST-GET-USER', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('REQUEST-GET-USER', Buffer.from(JSON.stringify(null)));
    }
    channel.ack(data);
  });

  channel.consume('USER-SEND-REQUESTID', async (data) => {
    const dtum = JSON.parse(data.content);
    try {
      const user = await getJsonUser(dtum);
      channel.sendToQueue('REQUESTID-GET-USER', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('REQUESTID-GET-USER', Buffer.from(JSON.stringify(null)));
    }
    channel.ack(data);
  });

  // search owner
  channel.consume('USER-SEARCH', async (data) => {
    const dtum = JSON.parse(data.content);
    try {
      const user = await User.find({ name: { $regex: dtum, $options: 'i' } }).select('name').lean();
      channel.sendToQueue('USER-SEARCH-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('USER-SEARCH-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('USER-REGISTER-SEARCH-GET', async (data) => {
    const dtum = JSON.parse(data.content);
    try {
      const user = await User.find({
        $or: [
          { name: { $regex: dtum, $options: 'i' } },
          { phone: { $regex: dtum, $options: 'i' } },
        ],
      })
        .select('name').lean();
      channel.sendToQueue('USER-REGISTER-SEARCH-INFO', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('USER-REGISTER-SEARCH-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('USER-GET', async (data) => {
    try {
      const user = JSON.parse(data.content);
      const dataUser = await User.find({ _id: { $in: user } })
        .select('name phone')
        .lean();
      const userData = dataUser.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      channel.sendToQueue('USER-INFO', Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  // search field
  channel.consume('USER-SEARCH-BY-FIELD', async (data) => {
    const dtum = JSON.parse(data.content);
    try {
      const query = await searchUserByField(dtum);
      const user = await User.find(query).select('id').lean();
      channel.sendToQueue('SERVICE-USER-SEARCH', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('SERVICE-USER-SEARCH', Buffer.from(JSON.stringify(null)));
    }
    channel.ack(data);
  });

  // search field
  channel.consume('USER-SEARCH-REQUEST', async (data) => {
    const dtum = JSON.parse(data.content);
    try {
      const query = await searchUserByField(dtum);
      const user = await User.find(query).select('id').lean();
      channel.sendToQueue('REQUEST-SEARCH-USER', Buffer.from(JSON.stringify(user)));
    } catch (error) {
      channel.sendToQueue('REQUEST-SEARCH-USER', Buffer.from(JSON.stringify(null)));
    }
    channel.ack(data);
  });
});

// *******************************************************************************

const getEditFileSave = (data) => {
  const { userIns, user } = data;
  const fileSave = {};

  if (userIns.avatar) {
    fileSave.avatar = {
      newFile: userIns.avatar,
      oldFile: user.avatar,
    };
  }
  userIns.imageIdentify = user.imageIdentify;
  if (userIns.imageIdentify) {
    if (userIns.imageFront) {
      const oldFile = user.imageIdentify.front;
      userIns.imageIdentify.front = userIns.imageFront;
      fileSave.front = {
        newFile: userIns.imageFront,
        oldFile,
      };
    }
    if (userIns.imageBackside) {
      const oldFile = user.imageIdentify.imageBackside;
      userIns.imageIdentify.backside = userIns.imageBackside;
      fileSave.backside = {
        newFile: userIns.imageBackside,
        oldFile,
      };
    }
  }
  return fileSave;
};

// done
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne(
      {
        status: true,
        isDeleted: false,
        $or: [
          { username },
          { phone: username },
        ],
      },
    ).populate('role', 'value');
    if (!user) {
      return res.status(400).send({
        success: false,
        error: 'Người dùng không tồn tại!',
      });
    }
    const check = await bcrypt.compare(password, user.password);
    if (!check) {
      return res.status(400).send({
        success: false,
        error: 'Mật khẩu không đúng',
      });
    }
    const token = jwt.sign(
      {
        _id: user._id, name: user.name, role: user.role.value, phone: user.phone,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: process.env.JWT_EXPIRE,
      },
    );
    const refreshToken = jwt.sign(
      {
        _id: user._id, name: user.name, role: user.role.value, phone: user.phone,
      },
      process.env.SECRET_REFRESH_KEY,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE },
    );
    channel.sendToQueue('AUTH-USER', Buffer.from(JSON.stringify({ userId: user._id, value: token })));
    return res.status(200).send({
      success: true,
      data: {
        token,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// done
const listUser = async (req, res) => {
  try {
    const {
      limit, page, keywords, role, parent, projectId,
    } = req.query;

    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);

    const query = { isDeleted: false };

    // lấy danh sách user theo role
    if (role) {
      const roleUser = await Role.findOne({ value: role });
      query.role = roleUser._id;
    }
    if (projectId) { query.projects = projectId; }
    if (parent) { query.parent = parent; }

    // tìm kiếm user
    if (keywords) {
      query.$or = [
        { phone: { $regex: keywords, $options: 'i' } },
        { email: { $regex: keywords, $options: 'i' } },
        { name: { $regex: keywords, $options: 'i' } },
        { website: { $regex: keywords, $options: 'i' } },
        { numberIdentify: { $regex: keywords, $options: 'i' } },
      ];
    }

    const dataUser = await User.find(query).select('-password -__v')
      .sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .populate('role', '-__v')
      .limit(perPage);

    if (dataUser.length) {
      let listCategoryId = [];
      dataUser.map((item) => {
        if (item.category.length) {
          listCategoryId = listCategoryId.concat(item.category);
        }
        return item;
      });
      listCategoryId = [...new Set(listCategoryId)];
      if (listCategoryId.length) {
        await channel.sendToQueue('USER-CATEGORY-GET', Buffer.from(JSON.stringify(listCategoryId)));
        await channel.consume('USER-CATEGORY-INFO', (info) => {
          const listCategory = JSON.parse(info.content);
          channel.ack(info);
          eventEmitter.emit('category', listCategory);
        });
        setTimeout(() => eventEmitter.emit('category'), 10000);
        const categoryList = await new Promise((resolve) => { eventEmitter.once('category', resolve); });

        if (categoryList) {
          dataUser.map((item) => {
            item._doc.category = categoryList.filter(
              (e) => item.category.includes(e._id.toString()),
            );
            return item;
          });
        }
      }
    }

    const total = await User.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    return res.status(200).send({
      success: true,
      data: dataUser,
      paging: {
        page: currentPage,
        limit: perPage,
        total,
        totalPage,
      },
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// lấy category bằng rabbitMQ
const infoUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { projectId } = req.query;
    const user = await User.findById(userId, '-password -__v')
      .populate('role', 'value text');

    if (!user) {
      return res.status(400).send({
        success: false,
        error: 'Người dùng không tồn tại!',
      });
    }
    if (user.role.value === 'CUSTOMER') {
      // lấy thông tin căn hộ
      await channel.sendToQueue('USER-APARTMENT-GET', Buffer.from(JSON.stringify({ projectId, userId })));
      await channel.consume('USER-APARTMENT-INFO', (info) => {
        const dataApartment = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeDone', dataApartment);
      });
      setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
      const apartmentData = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });
      user._doc.listApartment = [];

      if (apartmentData && apartmentData.length) {
        apartmentData.map((item) => {
          const apartment = {};
          apartment.name = item.apartmentCode;
          apartment.block = item.block.name;
          if (user._id.toString() === item.owner.toString()) {
            apartment.role = 'owner';
          } else if (item.relativeOwners.length > 0
          && convertArrayObjIdToArrayString(item.relativeOwners).includes(userId)) {
            apartment.role = 'relative owner';
          } else if (item.tenants.length > 0
          && convertArrayObjIdToArrayString(item.tenants).includes(userId)) {
            apartment.role = 'tenant';
          } else if (item.memberTenants.length > 0
          && convertArrayObjIdToArrayString(item.memberTenants).includes(userId)) {
            apartment.role = 'member tenant';
          } else {
            apartment.role = null;
          }
          user._doc.listApartment.push(apartment);
          return item;
        });
      }
    }

    if (user.role.value === 'PARTNER') {
      // USER-CATEGORY-DETAIL-INFO
      if (user.category.length) {
        await channel.sendToQueue('USER-CATEGORY-DETAIL-GET', Buffer.from(JSON.stringify(user.category)));
        await channel.consume('USER-CATEGORY-DETAIL-INFO', (info) => {
          const listCategory = JSON.parse(info.content);
          channel.ack(info);
          eventEmitter.emit('category', listCategory);
        });
        setTimeout(() => eventEmitter.emit('category'), 10000);
        const categoryList = await new Promise((resolve) => { eventEmitter.once('category', resolve); });

        user._doc.category = categoryList;
      }
    }

    return res.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// done
const createUser = async (req, res) => {
  try {
    const { body } = req;
    const userCreateId = req.headers.userid;
    const { projectId } = req.query;
    body.createdBy = userCreateId;
    body.updatedBy = userCreateId;
    if (body.birthday) { body.birthday = new Date(body.birthday).valueOf(); }
    if (body.dateOfIssue) { body.dateOfIssue = new Date(body.dateOfIssue).valueOf(); }
    if (projectId) { body.projects = [projectId]; }
    if (!body.username) { body.username = body.phone; }

    // lấy role
    const roleUser = body.role;
    const role = await Role.findOne({ value: body.role });
    body.role = role._id;

    // cấu hình di chuyển ảnh định danh  vào thư mục
    body.imageIdentify = {
      front: body.imageFront,
      backside: body.imageBackside,
    };
    const fileSave = {
      avatar: body.avatar,
      front: body.imageFront,
      backside: body.imageBackside,
    };

    // truy vấn
    const query = {
      $or: [
        { username: body.username },
        { phone: body.phone },
      ],
    };
    if (body.numberIdentify) { query.$or.push({ numberIdentify: body.numberIdentify }); }
    if (body.ref) { query.$or.push({ ref: body.ref }); }

    const user = await User.findOne(query);

    if (user) {
      // nếu tạo tài khoản đã tồn tại trong dụ án này nhưng khác quyền thì báo lỗi
      if (user.role.toString() !== role._id.toString()) {
        return res.status(400).send({
          success: false,
          error: 'Tài khoản đã tồn tại!',
        });
      }

      if (user.isDeleted) {
        // khôi phục tài khoản nếu tài khoản đã bị xóa
        body.isDeleted = false;
        await User.findByIdAndUpdate(user._id, body);
        if (body.avatar) {
          channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
            id: user.id,
            fileSave: getEditFileSave({ body, user }),
            userId: req.headers.userid,
          })));
        }
        return res.status(200).send({
          success: true,
        });
      }

      if (roleUser === 'CUSTOMER') {
        if (projectId) {
          if (user.projects.includes(projectId)) {
            return res.status(400).send({
              success: false,
              error: 'Tài khoản đã tồn tại trong dự án!',
            });
          }
          user.projects.push(projectId);
          body.projects = user.projects;
          await User.findByIdAndUpdate(user._id, body);
          if (body.avatar) {
            channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
              id: user.id,
              fileSave: getEditFileSave({ body, user }),
              userId: req.headers.userid,
            })));
          }

          return res.status(200).send({
            success: true,
          });
        }
        return res.status(400).send({
          success: false,
          error: 'Tài khoản đã tồn tại!',
        });
      }

      return res.status(400).send({
        success: false,
        error: 'Tài khoản đã tồn tại!',
      });
    }
    await User.create(body, (err, result) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      channel.sendToQueue('FILE-IMAGE', Buffer.from(JSON.stringify({
        id: result.id,
        fileSave,
        userId: req.headers.userid,
      })));
      return res.status(200).send({
        success: true,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// done
const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { projectId } = req.query;
  const userIns = req.body;
  try {
    // format data update
    if (userIns.birthday) {
      userIns.birthday = new Date(userIns.birthday).valueOf();
    }
    if (userIns.dateOfIssue) {
      userIns.dateOfIssue = new Date(userIns.dateOfIssue).valueOf();
    }
    userIns.imageIdentify = {
      front: userIns.imageFront,
      backside: userIns.imageBackside,
    };
    userIns.updatedBy = req.headers.userid;

    // kiểm tra tài khoản có tồn tại trong hệ thống ?
    const userUpdate = await User.findById(userId).populate('role');
    if (!userUpdate) {
      return res.status(400).send({
        success: false,
        error: 'Tài khoản không tồn tại!',
      });
    }
    if (userUpdate.role.value === 'CUSTOMER' && userIns.numberIdentify) {
      userIns.username = userIns.numberIdentify;
    }
    // check phone, username, số định danh
    if (userIns.phone && userIns.phone !== userUpdate.phone) {
      const checkPhone = await User.findOne({ phone: userIns.phone });
      if (checkPhone) {
        return res.status(400).send({
          success: false,
          error: 'Số điện thoại đã được sử dụng!',
        });
      }
    }
    if (userIns.username && userIns.username !== userUpdate.username) {
      const checkUsername = await User.findOne({ username: userIns.username });
      if (checkUsername) {
        return res.status(400).send({
          success: false,
          error: 'Tên tài khoản đã được sử dụng!',
        });
      }
    }
    if (userIns.numberIdentify && userIns.numberIdentify !== userUpdate.numberIdentify) {
      const checkNumberIdentify = await User.findOne({ numberIdentify: userIns.numberIdentify });
      if (checkNumberIdentify) {
        return res.status(400).send({
          success: false,
          error: 'Số định danh đã được sử dụng!',
        });
      }
    }

    // xóa tài khoản ra khỏi dự án
    if (projectId && userIns.isDeleted === true) {
      const listProject = userUpdate.projects.filter((item) => item !== projectId);
      userIns.projects = listProject;
      if (listProject.length) { userIns.isDeleted = false; }
    }

    const user = await User.findByIdAndUpdate(userId, userIns);
    if (user) {
      // cập nhật ảnh profile
      const fileSave = getEditFileSave({ userIns, user });
      channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
        id: user.id,
        fileSave,
        userId: req.headers.userid,
      })));
      return res.status(200).send({
        success: true,
      });
    }
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// done
const getProfile = async (req, res) => {
  try {
    const { userid, role } = req.headers;

    let select = '-password -__v -category -website -isDeleted -createdBy -updatedBy';
    if (role === 'PARTNER') {
      select = '-password -__v -isDeleted -createdBy -updatedBy -gender';
    }
    const user = await User.findById(userid).select(select).populate('role', '-__v');
    if (!user) {
      return res.status(400).send({
        success: true,
        data: 'Người dùng không tồn tại!',
      });
    }

    if (user.status === false) {
      return res.status(400).send({
        success: true,
        data: 'Tài khoản đã bị khoá!',
      });
    }

    // kiểm tra , lấy thông tin ví
    if (role === 'CUSTOMER') {
      await channel.sendToQueue('USER-WALLET-GET', Buffer.from(JSON.stringify(userid)));
      await channel.consume('USER-WALLET-INFO', (info) => {
        const walletData = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('wallet', walletData);
      });
      setTimeout(() => eventEmitter.emit('wallet'), 10000);
      const dataWallet = await new Promise((resolve) => { eventEmitter.once('wallet', resolve); });

      if (dataWallet) { user._doc.wallet = dataWallet; }
    }

    return res.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(401).send({
      success: false,
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userIns = req.body;
    if (userIns.birthday) {
      userIns.birthday = new Date(userIns.birthday).valueOf();
    }
    if (userIns.dateOfIssue) {
      userIns.dateOfIssue = new Date(userIns.dateOfIssue).valueOf();
    }
    const userId = req.headers.userid;
    const fileSave = {};
    const user = await User.findById(userId);
    if (userIns.avatar) {
      fileSave.avatar = {
        newFile: userIns.avatar,
        oldFile: user.avatar,
      };
    }
    userIns.imageIdentify = user.imageIdentify;
    if (userIns.imageIdentify) {
      if (userIns.imageFront) {
        const oldFile = user.imageIdentify.front;
        userIns.imageIdentify.front = userIns.imageFront;
        fileSave.front = {
          newFile: userIns.imageFront,
          oldFile,
        };
      }
      if (userIns.imageBackside) {
        const oldFile = user.imageIdentify.imageBackside;
        userIns.imageIdentify.backside = userIns.imageBackside;
        fileSave.backside = {
          newFile: userIns.imageBackside,
          oldFile,
        };
      }
    }
    userIns.updatedBy = userId;
    await User.updateOne({ _id: userId }, userIns);
    channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({ id: userId, fileSave })));
    return res.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// done
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.headers.userid;
    const user = await User.findById(userId);
    const check = await bcrypt.compare(oldPassword, user.password);
    if (!check) {
      return res.status(400).send({
        success: false,
        error: 'Mật khẩu cũ không đúng!',
      });
    }
    if (oldPassword === newPassword) {
      return res.status(400).send({
        success: false,
        error: 'Mật khẩu cũ không được giống mật khẩu mới!',
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashPassword;
    user.updatedBy = userId;
    await User.findByIdAndUpdate(userId, user);
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

const forgotPassword = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    const user = await User.findOne({ phone }).exec();
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashPassword;
    await user.save();
    return res.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const sendOtp = async (phone) => {
  // const otp = Math.floor(100000 + Math.random() * 899999);
  const otp = '123456';
  // đợi nhà cung cấp sms
  try {
    const phoneOtp = await Otp.findOne({ phone });
    if (phoneOtp) {
      if (phoneOtp.timeExpired <= Date.now()) {
        phoneOtp.otp = otp;
        phoneOtp.timeExpired = new Date(new Date().getTime() + 90 * 1000);
        await phoneOtp.save();
        return true;
      }
      return false;
    }
    const data = {
      otp,
      phone,
      timeExpired: new Date(new Date().getTime() + 90 * 1000),
    };
    await Otp.create(data);
    return true;
  } catch (error) {
    logger.error(error.message);
    return false;
  }
};

const checkPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({
      phone,
      status: true,
      isDeleted: false,
    }).exec();
    if (!user) {
      return res.status(404).send({
        success: false,
        error: 'Unregistered phone number',
      });
    }
    if (user) {
      const check = await sendOtp(phone);
      if (check) {
        return res.status(200).json({
          success: true,
          error: '',
        });
      }
    }
    return res.status(400).json({
      success: false,
      error: 'Please wait 90second to send again!!!',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

const loginMobile = async (req, res) => {
  try {
    const { phone, otp, device } = req.body;
    const checkOtp = await Otp.findOne({
      phone,
      otp,
      timeExpired: { $gt: Date.now() },
    });
    if (!checkOtp) return res.status(400).json({ success: false, error: 'OTP is not valid' });
    const user = await User.findOne({
      phone,
      status: true,
      isDeleted: false,
    }).populate('role');
    const token = jwt.sign(
      {
        _id: user._id, role: user.role.value, name: user.name, phone: user.phone,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: process.env.JWT_EXPIRE,
      },
    );
    const refreshToken = jwt.sign(
      {
        _id: user._id, role: user.role.value, name: user.name, phone: user.phone,
      },
      process.env.SECRET_REFRESH_KEY,

      {
        expiresIn: process.env.JWT_REFRESH_EXPIRE,
      },
    );
    channel.sendToQueue(
      'AUTH-USER',
      Buffer.from(JSON.stringify({ userId: user._id, value: token, device })),
    );
    return res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
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

// gửi lại otp
const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const check = await sendOtp(phone);
    if (!check) return res.status(400).json({ status: false, message: 'Please wait 90second to send again!!!' });
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

const listResidents = async (req, res) => {
  try {
    const { keywords } = req.query;
    if (keywords) {
      const role = await Role.findOne({ value: 'CUSTOMER' }).select('_id');
      const data = await User.find({
        isDeleted: false,
        role: role._id,
        status: true,
        $or: [
          { numberIdentify: { $regex: keywords, $options: 'i' } },
          { name: { $regex: keywords, $options: 'i' } },
          { phone: { $regex: keywords, $options: 'i' } },
        ],

      }).select('name phone numberIdentify').lean();

      return res.status(200).json({
        success: true,
        data,
      });
    }
    return res.status(200).json({
      success: true,
      data: [],
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

const listExecute = async (req, res) => {
  try {
    const { projectId } = req.params;
    const roleId = await Role.findOne({ value: 'EXECUTE' }).select('_id');
    const query = await User.find({
      isDeleted: false,
      role: roleId._id,
      projectId: { $in: projectId },
    }).select('name phone').lean();
    return res.status(200).json({
      success: true,
      data: query,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

const listStaffByProjectId = async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (!projectId) {
      return res.status(400).send({
        success: false,
        error: 'Please select project',
      });
    }
    query.projectId = projectId;
    query.isDeleted = false;
    query.status = true;
    const role = await Role.findOne({ value: 'EXECUTE' });
    if (role) { query.role = role._id; }
    const user = await User.find(query, '_id phone name').lean();
    return res.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// done
const changePasswordUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminPassword, userPassword } = req.body;
    const { userid } = req.headers;

    const requester = await User.findById(userId).populate('role');
    const superior = await User.findById(userid).populate('role');
    if (!requester) {
      return res.status(400).send({
        success: false,
        error: 'Tài khoản không tồn tại!',
      });
    }
    if (requester.role.value === 'CUSTOMER') {
      const projects = superior.projects.filter((item) => requester.projects.includes(item));
      if (!projects.length && superior.role.value !== 'ADMIN_SPS') {
        return res.status(400).send({
          success: false,
          error: 'Không thể thực hiện hành động này!',
        });
      }
    } else if (superior.role.value !== 'ADMIN_SPS' && requester.parent.toString() !== userid) {
      return res.status(400).send({
        success: false,
        error: 'Không thể thực hiện hành động này!',
      });
    }
    const check = await bcrypt.compare(adminPassword, superior.password);
    if (!check) {
      const roleSuperior = superior.role.text.charAt(0).toLowerCase() + superior.role.text.slice(1);
      return res.status(400).send({
        success: false,
        error: `Mật khẩu ${roleSuperior} không đúng!`,
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(userPassword, salt);
    await User.findByIdAndUpdate(requester._id, { password: hashPassword });
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

const checkUser = async (req, res) => {
  try {
    const { body } = req;
    const { projectId } = req.query;

    body.isDeleted = false;
    const user = await User.findOne(body).select('-__V -password').populate('role');
    if (!user) {
      return res.status(400).send({
        success: false,
        error: 'Không tìm thấy thông tin tài khoản trong hệ thống!',
      });
    }
    if (user.role.value !== 'CUSTOMER') {
      return res.status(400).send({
        success: false,
        error: 'Số định danh đã được đăng ký!',
      });
    }
    if (user.projects.includes(projectId)) {
      return res.status(400).send({
        success: false,
        error: 'Tài khoản đã tồn tại trong dự án này!',
      });
    }
    return res.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
const createAPIKey = async (req, res) => {
  try {
    const { userId } = req.query;
    const APIKey = jwt.sign({ _id: userId }, process.env.SECRET_KEY);
    await User.findByIdAndUpdate(userId, { APIKey });
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

const listPartnerInCategory = async (req, res) => {
  try {
    const { keywords, categoryId } = req.query;
    const query = { category: categoryId, isDeleted: false, status: true };
    if (keywords) {
      query.$or = [
        { name: { $regex: keywords, $options: 'i' } },
        { phone: { $regex: keywords, $options: 'i' } },
        { website: { $regex: keywords, $options: 'i' } },
      ];
    }

    const partner = await User.find(query)
      .select('-__v -password');
    return res.status(200).send({
      success: true,
      data: partner,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const createUserPPA = async (req, res) => {
  try {
    const { body } = req;
    const userCreateId = req.headers.userid;
    const { projectId } = req.query;
    body.createdBy = userCreateId;
    body.updatedBy = userCreateId;
    if (body.birthday) { body.birthday = new Date(body.birthday).valueOf(); }
    if (body.dateOfIssue) { body.dateOfIssue = new Date(body.dateOfIssue).valueOf(); }
    if (projectId) { body.projects = [projectId]; }
    if (!body.username) { body.username = body.phone; }

    // lấy role
    const roleUser = body.role;
    const role = await Role.findOne({ value: body.role });
    body.role = role._id;

    // cấu hình di chuyển ảnh định danh  vào thư mục
    body.imageIdentify = {
      front: body.imageFront,
      backside: body.imageBackside,
    };
    const fileSave = {
      avatar: body.avatar,
      front: body.imageFront,
      backside: body.imageBackside,
    };

    // truy vấn
    const query = {
      $or: [
        { username: body.username },
        { phone: body.phone },
      ],
    };
    if (body.numberIdentify) { query.$or.push({ numberIdentify: body.numberIdentify }); }
    if (body.ref) { query.$or.push({ ref: body.ref }); }

    const user = await User.findOne(query);

    if (user) {
      // nếu tạo tài khoản đã tồn tại trong dụ án này nhưng khác quyền thì báo lỗi
      if (user.role.toString() !== role._id.toString()) {
        return res.status(400).send({
          success: false,
          message: 'Không thể tạo tài khoản!',
          id: '',
        });
      }

      if (user.isDeleted) {
        // khôi phục tài khoản nếu tài khoản đã bị xóa
        body.isDeleted = false;
        await User.findByIdAndUpdate(user._id, body);
        if (body.avatar) {
          channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
            id: user.id,
            fileSave: getEditFileSave({ body, user }),
            userId: req.headers.userid,
          })));
        }
        return res.status(200).send({
          success: true,
          message: '',
          id: user._id,
        });
      }

      if (roleUser === 'CUSTOMER') {
        if (projectId) {
          if (user.projects.includes(projectId)) {
            return res.status(200).send({
              success: false,
              message: 'Tài khoản đã tồn tại trong dự án!',
              id: user._id,
            });
          }
          user.projects.push(projectId);
          body.projects = user.projects;
          await User.findByIdAndUpdate(user._id, body);
          if (body.avatar) {
            channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
              id: user._id,
              fileSave: getEditFileSave({ body, user }),
              userId: req.headers.userid,
            })));
          }

          return res.status(200).send({
            success: true,
            message: '',
            id: user._id,
          });
        }
        return res.status(200).send({
          success: false,
          message: 'Tài khoản đã tồn tại!',
          id: user._id,
        });
      }

      return res.status(200).send({
        success: false,
        message: 'Tài khoản đã tồn tại!',
        id: user._id,
      });
    }
    await User.create(body, (err, result) => {
      if (err) {
        return res.status(400).send({
          success: false,
          message: '',
          id: '',
        });
      }
      channel.sendToQueue('FILE-IMAGE', Buffer.from(JSON.stringify({
        id: result.id,
        fileSave,
        userId: req.headers.userid,
      })));
      return res.status(200).send({
        success: true,
        message: '',
        id: result.id,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message,
      id: '',
    });
  }
};

const createDemo = async (req, res) => {
  try {
    await Demo.create({ email: req.body.email });
    return res.status(200).send({
      success: true,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: 'Đăng ký thất bại!',
    });
  }
};

const listDemo = async (req, res) => {
  try {
    const {
      limit, page, keywords,
    } = req.query;
    const query = {};

    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);

    if (keywords) {
      query.email = { $regex: keywords, $options: 'i' };
    }

    const dataUser = await Demo.find(query)
      .sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .populate('role', '-__v')
      .limit(perPage);

    const total = await Demo.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    return res.status(200).send({
      success: true,
      data: dataUser,
      paging: {
        page: currentPage,
        limit: perPage,
        total,
        totalPage,
      },
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  login,
  listUser,
  infoUser,
  createUser,
  updateUser,
  getProfile,
  forgotPassword,
  changePassword,
  loginMobile,
  resendOtp,
  checkPhone,
  listResidents,
  listExecute,
  updateProfile,
  listStaffByProjectId,
  changePasswordUser,
  checkUser,
  createAPIKey,
  listPartnerInCategory,
  createUserPPA,
  createDemo,
  listDemo,
};
