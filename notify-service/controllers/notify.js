/* eslint-disable array-callback-return */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const Notify = require('../models/notify');
const connect = require('../lib/rabbitMQ');
const logger = require('../utils/logger');

const eventEmitter = new EventEmitter();

let imageCKEditor = [];
let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('USER-NOTIFY');
  await channel.assertQueue('NOTIFY-PROJECT');
  await channel.assertQueue('NOTIFY-LIST-PROJECT');
  await channel.assertQueue('CKEDITOR-NOTIFY');
};
connectRabbit().then(() => {
  channel.consume('CKEDITOR-NOTIFY', async (data) => {
    try {
      const image = JSON.parse(data.content);
      channel.ack(data);
      imageCKEditor.push(image);
    } catch (error) {
      logger.error(error.message);
    }
  });
});

// eslint-disable-next-line consistent-return
exports.createNotify = async (req, res) => {
  try {
    const notifyIns = req.body;
    notifyIns.createdBy = req.headers.userid;
    notifyIns.updatedBy = req.headers.userid;
    const imageAdd = [];

    imageCKEditor.map((item) => {
      const checkImage = notifyIns.content.includes(item);
      if (checkImage) {
        notifyIns.content = notifyIns.content.replace(item, `notify/ckEditor/${item}`);
        imageAdd.push(item);
      }
    });
    imageCKEditor = [];
    await channel.sendToQueue('CKEDITOR-CHANGE', Buffer.from(JSON.stringify({ imageAdd, type: 'notify' })));

    const data = await Notify.create(notifyIns);
    channel.sendToQueue(
      'FILE',
      Buffer.from(JSON.stringify({
        id: data.id,
        fileSave: { notify: notifyIns.file },
        userId: req.headers.userid,
      })),
    );
    return res.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

// eslint-disable-next-line consistent-return
exports.updateNotify = async (req, res) => {
  try {
    const { notifyId } = req.params;
    const notifyIns = req.body;
    notifyIns.updatedBy = req.headers.userid;
    await Notify.findByIdAndUpdate(notifyId, notifyIns, { returnDocument: 'after' }, (err, result) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      return res.status(200).send({
        success: true,
        data: result,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const consumeData = async (dataQuery) => {
  const arrayProejctInfo = Array.from(dataQuery, ({
    toProject, toBlock, toFloor, toApartment,
  }) => ({
    toProject, toBlock, toFloor, toApartment,
  }));
  await channel.sendToQueue('PROJECT-LIST', Buffer.from(JSON.stringify(arrayProejctInfo)));
  await channel.consume('NOTIFY-LIST-PROJECT', async (message) => {
    const dtum = JSON.parse(message.content);
    channel.ack(message);
    eventEmitter.emit('consumeListProject', dtum);
  });

  setTimeout(() => eventEmitter.emit('consumeListProject'), 10000);
  // eslint-disable-next-line no-promise-executor-return
  const projectInfo = await new Promise((resolve) => eventEmitter.once('consumeListProject', resolve));
  // array user id create
  const arrayIdCreate = Array.from(dataQuery, ({ createdBy }) => createdBy);
  // merge two array
  const arrayMergeId = [...projectInfo.userId, String(...arrayIdCreate)];
  await channel.sendToQueue('USER-LIST', Buffer.from(JSON.stringify(arrayMergeId)));
  await channel.consume('USER-NOTIFY', async (message) => {
    channel.ack(message);
    const dtum = JSON.parse(message.content);
    eventEmitter.emit('consumeNotify', dtum);
  });

  setTimeout(() => eventEmitter.emit('consumeNotify'), 10000);
  // eslint-disable-next-line no-promise-executor-return
  const dataConsume = await new Promise((resolve) => eventEmitter.once('consumeNotify', resolve));
  return { projectInfo, dataConsume };
};

exports.getNotifyById = async (req, res) => {
  try {
    const { notifyId } = req.params;
    const data = await Notify.findById(notifyId);
    const dataQuery = [data];
    const result = await consumeData(dataQuery);
    const { projectInfo, dataConsume } = result;
    if (data) {
      if (!data.toBlock) {
        data._doc.sendTo = 'Tất cả cư dân';
      }
      if (data.toBlock && !data.toFloor) {
        data._doc.sendTo = projectInfo.block[data.toBlock];
      }
      if (data.toBlock && data.toFloor && !data.toApartment) {
        data._doc.sendTo = `${projectInfo.block[data.toBlock]}-${projectInfo.floor[data.toFloor]}`;
      }
      if (data.toApartment) {
        const userId = projectInfo.apartment[data.toApartment];
        data._doc.sendTo = dataConsume[userId];
      }
      delete data._doc.toBlock;
      delete data._doc.toApartment;
      delete data._doc.toFloor;
    }
    return res.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.listNotify = async (req, res) => {
  try {
    const {
      limit, page, projectId,
    } = req.query;
    // eslint-disable-next-line radix
    const perPage = parseInt(limit || 10);
    // eslint-disable-next-line radix
    const currentPage = parseInt(page || 1);
    // query builder user
    const query = {};
    query.toProject = projectId;
    const dataQuery = await Notify.find(query).sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .select('-__v');
    if (dataQuery.length > 0) {
      const result = await consumeData(dataQuery);
      const { projectInfo, dataConsume } = result;
      dataQuery.map((item) => {
        const element = item;
        if (!element.createdBy?.fullName) {
          if (!dataConsume) {
            element._doc.createdBy = '';
          }
          element._doc.createdBy = dataConsume[element.createdBy];
        }
        if (!element.toBlock) {
          element._doc.sendTo = 'Tất cả cư dân';
        }
        if (element.toBlock && !element.toFloor) {
          element._doc.sendTo = projectInfo.block[element.toBlock];
        }
        if (element.toBlock && element.toFloor && !element.toApartment) {
          element._doc.sendTo = `${projectInfo.block[element.toBlock]}-${projectInfo.floor[element.toFloor]}`;
        }
        if (element.toApartment) {
          const userId = projectInfo.apartment[element.toApartment];
          element._doc.sendTo = dataConsume[userId];
        }
        delete element._doc.toBlock;
        delete element._doc.toApartment;
        delete element._doc.toFloor;
        return item;
      });
    }

    const total = await Notify.countDocuments(query);

    const totalPage = Math.ceil(total / perPage);
    return res.status(200).send({
      success: true,
      data: dataQuery,
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

exports.listNotifyByUser = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const { time, projectId } = req.query;
    await channel.sendToQueue('PROJECT-GETINFO-NOTIFY', Buffer.from(JSON.stringify({ userId })));
    await channel.consume('NOTIFY-PROJECT', async (message) => {
      const dtum = JSON.parse(message.content);
      eventEmitter.emit('consumeNotify', dtum);
      channel.ack(message);
    });
    setTimeout(() => eventEmitter.emit('consumeNotify'), 10000);
    // eslint-disable-next-line no-promise-executor-return
    const dataConsume = await new Promise((resolve) => eventEmitter.once('consumeNotify', resolve));
    let arrayBlock = Array.from(dataConsume, ({ block }) => block._id);
    let arrayFloor = Array.from(dataConsume, ({ floor }) => floor._id);
    let arrayApartment = Array.from(dataConsume, ({ _id }) => _id);
    arrayBlock = [...new Set(arrayBlock)];
    arrayFloor = [...new Set(arrayFloor)];
    arrayApartment = [...new Set(arrayApartment)];
    const query = {};
    query.$or = [
      {
        $and: [
          { toProject: projectId }, { toBlock: null }, { toFloor: null }, { toApartment: null },
        ],
      },
    ];
    if (arrayBlock.length > 0) {
      query.$or.push({
        $and: [
          { toProject: projectId },
          { toBlock: { $in: arrayBlock } },
          { toFloor: null },
          { toApartment: null },
        ],
      });
    }
    if (arrayFloor.length > 0) {
      query.$or.push({
        $and: [
          { toProject: projectId },
          { toBlock: { $in: arrayBlock } },
          { toFloor: { $in: arrayFloor } },
          { toApartment: null },
        ],
      });
    }
    if (arrayApartment.length > 0) {
      query.$or.push({
        toProject: projectId,
        toBlock: { $in: arrayBlock },
        toFloor: { $in: arrayFloor },
        toApartment: { $in: arrayApartment },
      });
    }
    if (time) {
      const date = new Date(time);
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 2);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      query.createdAt = {
        $gt: firstDay.valueOf(),
        $lt: lastDay.valueOf(),
      };
    }
    const notify = await Notify.find(query).select('-__v -updatedAt -updatedBy');
    // eslint-disable-next-line consistent-return, array-callback-return
    const data = notify.filter((item) => {
      const element = item;
      // format data res
      delete element._doc.toProject;
      delete element._doc.toBlock;
      delete element._doc.toFloor;
      delete element._doc.toApartment;
      if (!item.toBlock) {
        return element;
      }
      if (!item.toFloor) {
        if (arrayBlock.includes(String(item.toBlock))) {
          return element;
        }
      }
      if (!item.toApartment) {
        if (arrayFloor.includes(String(item.toFloor))) {
          return element;
        }
      }
      if (item.toApartment) {
        if (arrayApartment.includes(String(item.toApartment))) {
          return element;
        }
      }
    });
    return res.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.userGetNotifyById = async (req, res) => {
  try {
    const { notifyId } = req.params;
    const data = await Notify.findById(notifyId).select('-__v -updatedAt -updatedBy -toProject -toBlock -toFloor -toApartment');
    return res.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
