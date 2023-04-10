/* eslint-disable no-unused-expressions */
/* eslint-disable eqeqeq */
/* eslint-disable radix */
/* eslint-disable array-callback-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');

const eventEmitter = new EventEmitter();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/user');
const Role = require('../models/role');
const Otp = require('../models/otp');
const logger = require('../utils/logger');
const connect = require('../lib/rabbitMQ');

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
};

const getJsonUser = async (arrayUserId) => {
  try {
    const user = await User.find({ _id: { $in: arrayUserId } }, 'id phone fullName').lean();
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
        { fullName: { $regex: keywords, $options: 'i' } },
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
    });
    return element;
  } catch (error) {
    logger.error(error);
    return [];
  }
};

connectRabbit().then(() => {
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
      const listUpdateFullName = [];
      let createNewUser;

      // Check the user exist
      const user = await User.find({
        phone: { $in: dataCreate.listPhone },
      }).select('phone fullName idProject isDeleted');

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
          const checkProject = item.idProject.filter(
            (projectId) => projectId == dataCreate.projectId,
          ).length === 1;

          if (checkProject) {
            // If it exists in the project, put the user in listResidentNew and update fullName
            listResidentNew.push({
              _id: item._id, phone: item.phone,
            });
            listUpdateFullName.push({
              _id: item._id, phone: item.phone, fullName: listResidents[item.phone].fullName,
            });
          } else {
            // add the project to the user then put user in listResidentNew, and update fullName
            listAddProjectId.push({
              _id: item._id,
              fullName: listResidents[item.phone].fullName,
              idProject: item.idProject,
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
              fullName: listResidents[item].fullName,
              phone: item,
              role: getRoleId._id,
              idProject: [dataCreate.projectId],
            });
          });
          createNewUser = await User.insertMany(listCreateUser);
        }
      } else {
        // Create accounts for users if that account does not exist
        const listCreateUser = dataCreate.listResidents;
        listCreateUser.map((item) => {
          item.role = getRoleId._id;
          item.idProject = [dataCreate.projectId];
        });
        createNewUser = await User.insertMany(dataCreate.listResidents);
      }

      // Put the new user list listResidentNew
      if (createNewUser && createNewUser.length > 0) {
        createNewUser.map((item) => {
          listResidentNew.push({ _id: item._id, phone: item.phone });
        });
      }

      // Add projects and update names
      if (listAddProjectId.length > 0) {
        const listUpdateFullNameAndIdProject = listAddProjectId.map((item) => {
          item.idProject.push(dataCreate.projectId);
          return {
            updateOne: {
              filter: { _id: item._id },
              update: { $set: { idProject: item.idProject, fullName: item.fullName } },
            },
          };
        });
        await User.bulkWrite(listUpdateFullNameAndIdProject);
      }

      // Update name
      if (listUpdateFullName.length > 0) {
        const listUpdateFullNameInProJect = listUpdateFullName.map((item) => ({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { fullName: item.fullName } },
          },
        }));
        await User.bulkWrite(listUpdateFullNameInProJect);
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
        if (user.idProject.length > 0) {
          const { projectId } = data;
          const listProjectId = convertArrayObjIdToArrayString(user.idProject);
          const checkProject = listProjectId.includes(projectId.toString());
          if (!checkProject) {
            const idProject = [...user.idProject, data.projectId];
            await User.findByIdAndUpdate(data.owner, { idProject });
          }
        } else {
          const projectId = [...user.idProject, data.projectId];
          await User.findByIdAndUpdate(data.owner, { idProject: projectId });
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
      const dataAvailable = {};
      channel.sendToQueue('USER-DETAILS-INFO', Buffer.from(JSON.stringify(dataAvailable)));
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
      const dataUser = await User.find({ _id: { $in: userId } }).select('fullName');
      const userData = dataUser.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      dtum.map((item) => {
        if (item.owner) {
          if (userData[item.owner] && userData[item.owner].fullName) {
            item.owner = userData[item.owner].fullName;
          }
        }
        if (item.block && item.typeApartment && item.floor) {
          item.typeApartment = item.typeApartment.name;
          item.block = item.block.name;
          item.floor = item.floor.name;
        }
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
    const dtum = JSON.parse(data.content);
    try {
      const user = await getJsonUser(dtum);
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
      const user = await User.find({ fullName: { $regex: dtum, $options: 'i' } }).select('fullName').lean();
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
          { fullName: { $regex: dtum, $options: 'i' } },
          { phone: { $regex: dtum, $options: 'i' } },
        ],
      })
        .select('fullName').lean();
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
        .select('fullName phone')
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

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    // eslint-disable-next-line object-shorthand
    const user = await User.findOne(

      {
        status: true,
        isDeleted: false,
        $or: [
          { phone },
          { userName: phone },
        ],
      },

    )
      .exec();
    if (!user) {
      return res.status(403).send({
        success: false,
        error: 'User not exist!!!',
      });
    }
    const check = await bcrypt.compare(password, user.password);
    if (!check) {
      return res.status(403).send({
        success: false,
        error: 'password wrong!!!',
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRE,
    });
    // eslint-disable-next-line no-underscore-dangle
    const refreshToken = jwt.sign({ _id: user._id }, process.env.SECRET_REFRESH_KEY, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE,
    });
    channel.sendToQueue(
      'AUTH-USER',
      Buffer.from(JSON.stringify({ userId: user._id, value: token })),
    );
    return res.status(200).send({
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

const listUser = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      limit, page, keywords, tab,
    } = req.query;
    let role = null;
    const perPage = parseInt(limit || 20);
    const currentPage = parseInt(page || 1);

    // get id from token
    const bearerToken = req.headers.authorization.split(' ')[1];
    const verify = jwt.verify(bearerToken, process.env.SECRET_KEY);
    const { _id } = verify;

    // get role current user
    const queryRole = User.findOne();
    queryRole.where('_id').equals(_id);
    queryRole.select('_id');
    queryRole.populate('role', 'id value');
    const userRole = await queryRole.exec();
    role = userRole.role.value;

    // query builder user
    const query = User.find({ isDeleted: false, idProject: { $in: projectId } }).sort({ _id: -1 });
    if (role === 'ADMIN') {
      let roleCondition = [];
      if (tab === 'CUSTOMER') {
        roleCondition = ['CUSTOMER'];
      }
      if (tab === 'EXECUTE') {
        roleCondition = ['EXECUTE', 'ADMIN'];
      }
      let roleId = await Role.find({ value: { $in: roleCondition } }).select('_id');
      // eslint-disable-next-line no-shadow
      roleId = Array.from(roleId, ({ _id }) => _id);
      query.where('role').in(roleId);
    }
    if (role === 'EXECUTE') {
      let roleCondition = [];
      if (tab === 'CUSTOMER') {
        roleCondition = ['CUSTOMER'];
      }
      if (tab === 'EXECUTE') {
        roleCondition = ['EXECUTE'];
      }
      let roleId = await Role.find({ value: { $in: roleCondition } }).select('_id');
      // eslint-disable-next-line no-shadow
      roleId = Array.from(roleId, ({ _id }) => _id);
      query.where('role').in(roleId);
    }
    query.populate('role', '-__v');
    if (keywords) {
      // eslint-disable-next-line no-invalid-regexp
      query.find({
        $or: [
          { phone: { $regex: keywords, $options: 'i' } },
          { fullName: { $regex: keywords, $options: 'i' } },
          { email: { $regex: keywords, $options: 'i' } },
          { numberIdentify: { $regex: keywords, $options: 'i' } },
        ],
      });
    }
    query.select('-password -__v');
    query.skip((currentPage - 1) * perPage);
    query.limit(perPage);
    const data = await query.exec();

    const totalDocuments = await query.countDocuments();

    const totalPage = Math.ceil(totalDocuments / perPage);

    return res.status(200).send({
      success: true,
      data,
      paging: {
        page: currentPage,
        limit: perPage,
        totalDocuments,
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

const getUser = async (req, res) => {
  try {
    const { projectId } = req.query;
    const { userId } = req.params;
    const user = await User.findById(userId, '-password -__v').populate('role', '_id value text');

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
    const newProject = new Set(convertArrayObjIdToArrayString(user.idProject));
    await User.findByIdAndUpdate(userId, { idProject: [...newProject] });

    if (apartmentData.length) {
      apartmentData.map((item) => {
        const apartment = {};
        apartment.name = item.apartmentCode;
        apartment.block = item.block.name;
        apartment.floor = item.floor.name;
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

// eslint-disable-next-line consistent-return
const createUser = async (req, res) => {
  try {
    const userIns = req.body;
    const userCreateId = req.headers.userid;
    userIns.createdBy = userCreateId;
    userIns.updatedBy = userCreateId;
    if (userIns.birthday) {
      userIns.birthday = new Date(userIns.birthday).valueOf();
    }
    if (userIns.dateOfIssue) {
      userIns.dateOfIssue = new Date(userIns.dateOfIssue).valueOf();
    }
    // hash password
    if (userIns.password === null) {
      userIns.password = '12345678';
    }
    const role = await Role.findOne({ value: userIns.role });
    userIns.role = role._id;
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(userIns.password, salt);
    userIns.password = hashPassword;

    // image imageIdentify
    userIns.imageIdentify = {
      front: userIns.imageFront,
      backside: userIns.imageBackside,
    };
    const fileSave = {
      avatar: userIns.avatar,
      front: userIns.imageFront,
      backside: userIns.imageBackside,
    };

    // check phone and project
    const user = await User.findOne({
      phone: userIns.phone,
    });
    if (user) {
      if (user.isDeleted) {
        const newUser = new User(userIns);
        delete newUser._doc._id;
        await User.updateOne(user, newUser);
        channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
          id: user.id,
          fileSave: getEditFileSave({ userIns, user }),
          userId: req.headers.userid,
        })));
        return res.status(200).send({
          success: true,
        });
      }

      let project = false;
      // eslint-disable-next-line consistent-return
      user.idProject.map((item) => {
        // eslint-disable-next-line eqeqeq
        if (userIns.idProject == item) {
          project = true;
          return res.status(400).send({
            success: false,
            error: 'Tài khoản đã tham gia dự án này !',
          });
        }
      });

      if (!project) {
        user.idProject.push(userIns.idProject);
        userIns.idProject = user.idProject;
        if (user.role.toString() !== userIns.role.toString()) {
          return res.status(400).send({
            success: false,
            error: 'Tạo tài khoản thất bại !',
          });
        }
        await User.findByIdAndUpdate(user._id, userIns);
        channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
          id: user.id,
          fileSave: getEditFileSave({ userIns, user }),
          userId: req.headers.userid,
        })));
        return res.status(200).send({
          success: true,
        });
      }
    } else {
      await User.create(userIns, (err, result) => {
        if (err) {
          return res.status(400).send({
            success: false,
            error: err.message,
          });
        }
        channel.sendToQueue(
          'FILE-IMAGE',
          Buffer.from(JSON.stringify({
            id: result.id,
            fileSave,
            userId: req.headers.userid,
          })),
        );
        return res.status(200).send({
          success: true,
          data: result,
        });
      });
    }
    // create user
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  const { userId, projectId } = req.params;
  const userIns = req.body;
  try {
    if (userIns.birthday) {
      userIns.birthday = new Date(userIns.birthday).valueOf();
    }
    if (userIns.dateOfIssue) {
      userIns.dateOfIssue = new Date(userIns.dateOfIssue).valueOf();
    }
    userIns.updatedBy = req.headers.userid;
    const user = await User.findById(userId);

    const fileSave = getEditFileSave({ userIns, user });

    if (userIns.isDeleted) {
      await channel.sendToQueue('USER-DELETE-GET', Buffer.from(JSON.stringify({ userId, projectId })));
      await channel.consume('USER-DELETE-INFO', (info) => {
        const dataUser = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('doneDELETE', dataUser);
      });
      setTimeout(() => eventEmitter.emit('doneDELETE'), 10000);
      const userData = await new Promise((resolve) => { eventEmitter.once('doneDELETE', resolve); });
      if (userData.length > 0) {
        return res.status(400).send({
          success: false,
          error: 'Không thể xóa tài khoản cư dân đang sử dụng căn hộ !',
        });
      }
      if (user.idProject.length > 1) {
        userIns.isDeleted = false;
        userIns.idProject = user.idProject.filter((item) => item != projectId);
      }
      if (user.idProject.length === 1) {
        userIns.idProject = user.idProject.filter((item) => item != projectId);
      }
    }

    await User.updateOne({ _id: userId }, userIns);
    channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({
      id: user.id,
      fileSave,
      userId: req.headers.userid,
    })));
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

const getProfile = async (req, res) => {
  try {
    const bearerToken = req.headers.authorization.split(' ')[1];
    const verify = jwt.verify(bearerToken, process.env.SECRET_KEY);
    const { _id } = verify;
    const query = User.findOne();
    query.where('_id').equals(_id);
    query.select('-password -__v');
    query.populate('role', '-active');
    const user = await query.exec();
    if (user) {
      return res.status(200).send({
        success: true,
        data: user,
      });
    }
    return res.status(404).send({
      message: `Cannot find User with id=${_id}.`,
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
    const bearerToken = req.headers.authorization.split(' ')[1];
    const verify = jwt.verify(bearerToken, process.env.SECRET_KEY);
    const { _id } = verify;
    const fileSave = {};
    const user = await User.findById(_id);
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
    userIns.updatedBy = _id;
    await User.updateOne({ _id }, userIns);
    channel.sendToQueue('FILE-CHANGE', Buffer.from(JSON.stringify({ id: _id, fileSave })));
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

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const bearerToken = req.headers.authorization.split(' ')[1];
    const verify = jwt.verify(bearerToken, process.env.SECRET_KEY);
    const { _id } = verify;
    const user = await User.findById(_id);
    const check = await bcrypt.compare(oldPassword, user.password);
    if (!check) {
      return res.status(400).send({
        success: false,
        error: 'Mật khẩu cũ không đúng!',
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashPassword;
    await user.save();
    return res.status(200).send({
      success: true,
      message: 'Thay đổi mật khẩu thành công!',
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
    }).exec();
    const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRE,
    });
    // eslint-disable-next-line no-underscore-dangle
    const refreshToken = jwt.sign({ _id: user._id }, process.env.SECRET_REFRESH_KEY, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE,
    });
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
      const query = User.find({
        isDeleted: false,
        $or: [
          { phone: { $regex: keywords, $options: 'i' } },
          { fullName: { $regex: keywords, $options: 'i' } },
        ],
      });
      let roleId = await Role.find({ value: 'CUSTOMER' }).select('_id');
      roleId = Array.from(roleId, ({ _id }) => _id);
      query.where('role').in(roleId);
      query.select('_id fullName phone');
      const data = await query.exec();

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
      idProject: { $in: projectId },
    }).select('fullName phone').lean();
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
    query.idProject = projectId;
    query.isDeleted = false;
    query.status = true;
    const role = await Role.findOne({ value: 'EXECUTE' });
    query.role = role.id;
    const user = await User.find(query, '_id phone fullName').lean();
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

const populationDensity = async (req, res) => {
  try {
    const { projectId } = req.query;
    const idProject = mongoose.Types.ObjectId(projectId);
    const user = await User.aggregate([
      { $match: { idProject: { $in: [idProject] } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $toDate: {
                  $multiply: [
                    { $toDouble: '$createdAt' },
                    1,
                  ],
                },
              },
            },
          },
          resident: { $push: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
    ]);

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

module.exports = {
  login,
  listUser,
  getUser,
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
  populationDensity,
};
