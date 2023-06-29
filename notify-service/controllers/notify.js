/* eslint-disable no-param-reassign */
/* eslint-disable no-cond-assign */
/* eslint-disable radix */
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
  await channel.assertQueue('NOTIFY-DETAIL-USER-INFO');
  await channel.assertQueue('CREATE-NOTIFY');
  await channel.assertQueue('ONESIGNAL-LIST-RESIDENT-INFO');
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

  channel.consume('CREATE-NOTIFY', async (data) => {
    try {
      // {type, title, content, toProject, toUser , createdBy}
      const notify = JSON.parse(data.content);
      channel.ack(data);
      notify.level = 'IMPORTANCE';
      notify.updatedBy = notify.createdBy;
      await Notify.create(notify);
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
    notifyIns.typeNotify = 'MANAGEMENT';
    const imageAdd = [];

    if (imageCKEditor && imageCKEditor.length) {
      imageCKEditor.map((item) => {
        const checkImage = notifyIns.content.includes(item);
        if (checkImage) {
          notifyIns.content = notifyIns.content.replace(item, `notify/ckEditor/${item}`);
          imageAdd.push(item);
        }
        return item;
      });
      imageCKEditor = [];
      await channel.sendToQueue('CKEDITOR-CHANGE', Buffer.from(JSON.stringify({ imageAdd, type: 'notify' })));
    }

    const data = await Notify.create(notifyIns);
    if (data) {
      channel.sendToQueue('FILE', Buffer.from(JSON.stringify({
        id: data.id,
        fileSave: { notify: notifyIns.file },
        userId: req.headers.userid,
      })));

      // gửi thông báo
      const projectId = notifyIns.toProject;
      const blockId = notifyIns.toBlock;
      const apartmentId = notifyIns.toApartment;
      // lấy danh sách cư dân trong block hoặc danh sách cư dân trong căn hộ
      await channel.sendToQueue('ONESIGNAL-LIST-RESIDENT-GET', Buffer.from(JSON.stringify({ projectId, blockId, apartmentId })));
      await channel.consume('ONESIGNAL-LIST-RESIDENT-INFO', (search) => {
        const listId = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('resident', listId);
      });
      setTimeout(() => eventEmitter.emit('resident'), 10000);
      const listResidentId = await new Promise((resolve) => { eventEmitter.once('resident', resolve); });

      if (listResidentId && listResidentId.length) {
        await channel.sendToQueue('SEND-MULTIPLE-MESSAGE', Buffer.from(JSON.stringify(
          {
            userIds: listResidentId,
            content: notifyIns.title,
            type: 'HOUSE_ROOF',
          },
        )));
      }
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

// eslint-disable-next-line consistent-return
exports.updateNotify = async (req, res) => {
  try {
    const { notifyId } = req.params;
    const { userid } = req.headers;
    const notifyIns = req.body;
    notifyIns.updatedBy = userid;

    // đánh dấu đã đọc đánh dấu chưa đọc
    const notify = await Notify.findById(notifyId);
    if ('seen' in notifyIns && notify) {
      if (notify.typeNotify === 'MANAGEMENT') {
        if (notifyIns.seen === false) {
          notifyIns.listSeen = notify.listSeen.filter((item) => item !== userid);
        } else {
          notifyIns.listSeen = notify.listSeen;
          notifyIns.listSeen.push(userid);
        }
      }
    }

    await Notify.findByIdAndUpdate(notifyId, notifyIns, (err, result) => {
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
  try {
    const listBlockId = [];
    const listApartmentId = [];
    const listUserId = [];
    dataQuery.map((item) => {
      if (item.toUser) { listUserId.push(item.toUser); }
      if (item.createdBy && item.createdBy !== 'System') { listUserId.push(item.createdBy); }
      if (item.toBlock) { listBlockId.push(item.toBlock); }
      if (item.toApartment) { listApartmentId.push(item.toApartment); }
      return item;
    });

    // lấy thông tin block và thông tin  căn hộ
    await channel.sendToQueue('PROJECT-LIST', Buffer.from(JSON.stringify({ listBlockId, listApartmentId })));
    await channel.consume('NOTIFY-LIST-PROJECT', async (message) => {
      const dtum = JSON.parse(message.content);
      channel.ack(message);
      eventEmitter.emit('consumeListProject', dtum);
    });
    setTimeout(() => eventEmitter.emit('consumeListProject'), 10000);
    const dataProject = await new Promise((resolve) => { eventEmitter.once('consumeListProject', resolve); });

    // lấy thông tin user
    await channel.sendToQueue('USER-LIST', Buffer.from(JSON.stringify(listUserId)));
    await channel.consume('USER-NOTIFY', async (message) => {
      const userData = JSON.parse(message.content);
      channel.ack(message);
      eventEmitter.emit('userNotify', userData);
    });
    setTimeout(() => eventEmitter.emit('userNotify'), 10000);
    const dataUser = await new Promise((resolve) => { eventEmitter.once('userNotify', resolve); });

    const { dataBlock, dataApartment } = dataProject;
    return { dataBlock, dataApartment, dataUser };
  } catch (error) {
    logger.error(error);
    return null;
  }
};

exports.getNotifyById = async (req, res) => {
  try {
    const { notifyId } = req.params;
    const data = await Notify.findById(notifyId);
    const dataQuery = [data];
    if (data) {
      const result = await consumeData(dataQuery);
      if (result) {
        const { dataBlock, dataApartment, dataUser } = result;
        if (data.createdBy !== 'System') {
          if (!dataUser) {
            data._doc.createdBy = '';
          } else {
            data._doc.createdBy = dataUser[data.createdBy];
          }
        } else {
          data._doc.createdBy = { name: data.createdBy };
        }
        if (!data.toBlock) {
          data._doc.sendTo = 'Tất cả cư dân';
        }
        if (data.toBlock && dataBlock && dataBlock[data.toBlock]) {
          data._doc.sendTo = `Block ${dataBlock[data.toBlock].name}`;
        }
        if (data.toApartment && dataApartment && dataApartment[data.toApartment]) {
          data._doc.sendTo = `Căn hộ ${dataApartment[data.toApartment].apartmentCode}`;
        }
        if (data.toUser) {
          data._doc.sendTo = dataUser[data.toUser];
        }
      }
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
    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);
    const query = { toProject: projectId, type: 'HOUSE_ROOF', createdBy: { $ne: 'System' } };
    const dataQuery = await Notify.find(query).sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .select('-__v');
    if (dataQuery.length) {
      const result = await consumeData(dataQuery);
      if (result) {
        const { dataBlock, dataApartment, dataUser } = result;
        dataQuery.map((item) => {
          const element = item;
          if (element.createdBy !== 'System') {
            if (!dataUser) {
              element._doc.createdBy = '';
            } else {
              element._doc.createdBy = dataUser[element.createdBy];
            }
          } else {
            element._doc.createdBy = { name: element.createdBy };
          }
          if (!element.toBlock) {
            element._doc.sendTo = 'Tất cả cư dân';
          }
          if (element.toBlock && dataBlock && dataBlock[element.toBlock]) {
            element._doc.sendTo = `Block ${dataBlock[element.toBlock].name}`;
          }
          if (element.toApartment && dataApartment && dataApartment[element.toApartment]) {
            element._doc.sendTo = `Căn hộ ${dataApartment[element.toApartment].apartmentCode}`;
          }
          if (element.toUser) {
            element._doc.sendTo = dataUser ? dataUser[element.toUser] : '';
          }
          return item;
        });
      }
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
    const {
      time, projectId, page, limit, type, seen, typeNotify,
    } = req.query;
    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);
    const query = {};

    // lấy thông danh sách block, căn hộ có user
    await channel.sendToQueue('PROJECT-GETINFO-NOTIFY', Buffer.from(JSON.stringify({ userId })));
    await channel.consume('NOTIFY-PROJECT', async (message) => {
      const dtum = JSON.parse(message.content);
      eventEmitter.emit('consumeNotify', dtum);
      channel.ack(message);
    });
    setTimeout(() => eventEmitter.emit('consumeNotify'), 10000);
    const dataConsume = await new Promise((resolve) => { eventEmitter.once('consumeNotify', resolve); });

    let arrayBlock = [];
    let arrayApartment = [];
    if (dataConsume && dataConsume.length) {
      arrayBlock = Array.from(dataConsume, ({ block }) => block);
      arrayApartment = Array.from(dataConsume, ({ _id }) => _id);
      arrayBlock = [...new Set(arrayBlock)];
      arrayApartment = [...new Set(arrayApartment)];
    }

    if (type) { query.type = type; } else { query.type = { $ne: 'TASK' }; }
    if (seen) { query.seen = seen; }
    if (typeNotify) { query.typeNotify = typeNotify; }
    query.$or = [
      {
        toProject: projectId, toBlock: null, toApartment: null, toUser: null,
      },
      { toProject: projectId, toUser: userId },
      { toUser: userId },
    ];

    // lấy danh sách thông báo của block
    if (arrayBlock.length) {
      query.$or.push(
        {
          toBlock: { $in: arrayBlock }, toProject: projectId, toApartment: null, toUser: null,
        },
      );
    }

    // lấy danh sách thông báo của căn hộ
    if (arrayApartment.length) {
      query.$or.push({
        toProject: projectId,
        toBlock: { $in: arrayBlock },
        toApartment: { $in: arrayApartment },
        toUser: null,
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

    const notify = await Notify.find(query)
      .select('-__v -updatedAt -updatedBy')
      .sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    if (notify.length) {
      notify.map((item) => {
        if (item.typeNotify === 'MANAGEMENT') {
          if (item.listSeen.includes(userId)) {
            item._doc.seen = true;
          } else {
            item._doc.seen = false;
          }
        }
        return item;
      });
    }

    const total = await Notify.countDocuments(query);

    // tính số lượng thông báo chưa xem của user
    const { type: objType, ...copyQuery } = query;
    const seenManage = copyQuery;
    const seenSystem = copyQuery;

    // số lượng thông báo bang quản lý chưa xem
    seenManage.listSeen = { $ne: userId };
    seenManage.typeNotify = 'MANAGEMENT';
    const seenManageNotify = await Notify.countDocuments(seenManage);

    // số lượng thông báo hệ thống chưa xem
    seenSystem.seen = false;
    seenSystem.typeNotify = 'SYSTEM';
    const seenSystemNotify = await Notify.countDocuments(seenSystem);

    // tổng số lượng thông báo chưa xem
    const unreadNotifications = seenManageNotify + seenSystemNotify;

    const totalPage = Math.ceil(total / perPage);

    return res.status(200).send({
      success: true,
      data: notify,
      paging: {
        page: currentPage,
        limit: perPage,
        total,
        totalPage,
        unreadNotifications,
      },
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
    const { userid } = req.headers;
    const { notifyId } = req.params;
    const data = await Notify.findById(notifyId).select('-__v -updatedAt -updatedBy -toProject -toBlock -toApartment');

    if (data) {
      if (data.createdBy !== 'System') {
        await channel.sendToQueue('NOTIFY-DETAIL-USER-GET', Buffer.from(JSON.stringify(data.createdBy)));
        await channel.consume('NOTIFY-DETAIL-USER-INFO', (search) => {
          const dataUser = JSON.parse(search.content);
          channel.ack(search);
          eventEmitter.emit('consumeDone', dataUser);
        });
        setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
        const userData = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });
        if (userData) {
          data._doc.createdBy = userData;
        }
      } else {
        data._doc.createdBy = { name: 'System' };
      }

      // cập nhật trạng thái đã xem
      if (data.typeNotify === 'MANAGEMENT') {
        const { listSeen } = data;
        listSeen.push(userid);
        await Notify.findByIdAndUpdate(data._id, { listSeen });
      } else {
        await Notify.findByIdAndUpdate(data._id, { seen: true });
      }
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
