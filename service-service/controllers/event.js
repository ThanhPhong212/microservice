/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const Event = require('../models/event');
const logger = require('../utils/logger/index');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');
const { url } = require('../config');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('EVENT-USER-INFO');
  await channel.assertQueue('EVENT-CREATEDBY-INFO');
  await channel.assertQueue('EVENT-CREATEDBY-DETAIL-INFO');
  await channel.assertQueue('CHECK-EVENT-GET');
  await channel.assertQueue('EVENT-USER-DETAIL-INFO');
};
connectRabbit().then(() => {
  channel.consume('CHECK-EVENT-GET', async (data) => {
    channel.ack(data);
    try {
      const today = new Date();
      today.setHours(1, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 0, 0, 0);
      const event = await Event.find(
        { time: { $gte: today.valueOf(), $lte: tomorrow.valueOf() } },
      );
      channel.sendToQueue('CHECK-EVENT-INFO', Buffer.from(JSON.stringify(event)));
    } catch (error) {
      channel.sendToQueue('CHECK-EVENT-INFO', Buffer.from(JSON.stringify([])));
    }
  });
});

const getInfoUser = async (userId) => {
  try {
    await channel.sendToQueue('EVENT-USER-DETAIL-GET', Buffer.from(JSON.stringify(userId)));
    await channel.consume('EVENT-USER-DETAIL-INFO', (info) => {
      const listUser = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('createdByInfo', listUser);
    });
    setTimeout(() => eventEmitter.emit('createdByInfo'), 10000);
    const dataUser = await new Promise((resolve) => { eventEmitter.once('createdByInfo', resolve); });
    return dataUser;
  } catch (error) {
    logger.error(error);
    return null;
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { body } = req;
    body.createdBy = req.headers.userid;
    body.updatedBy = req.headers.userid;
    body.time = new Date(body.time).valueOf();
    const event = await Event.create(body);
    if (event && body.image) {
      await channel.sendToQueue(
        'FILE-IMAGE',
        Buffer.from(JSON.stringify({
          id: event._id,
          fileSave: { event: body.image },
          userId: req.headers.userid,
        })),
      );
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

function timePost(date) {
  const now = new Date();
  const time = new Date(date * 1);
  const distance = now - time;
  const seconds = Math.floor(distance / 1000);
  if (seconds < 5) { return 'Vừa xong'; }
  if (seconds < 60) { return `${seconds} giây trước`; }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) { return `${minutes} phút trước`; }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) { return `${hours} giờ trước`; }
  const days = Math.floor(hours / 24);
  if (days < 2) { return 'Hôm qua'; }
  return time.toLocaleDateString('vi-VN');
}

exports.listEvent = async (req, res) => {
  try {
    const { userid } = req.headers;
    const {
      page, limit, keywords, projectId,
    } = req.query;
    const perPage = parseInt(limit || 10, 10);
    const currentPage = parseInt(page || 1, 10);

    const query = { projectId };
    if (keywords) {
      query.$or = [
        { title: { $regex: keywords, $options: 'i' } },
        { content: { $regex: keywords, $options: 'i' } },
      ];
    }
    const event = await Event.find(query)
      .sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .select('-__v');

    if (event.length) {
      const listCreatedBy = Array.from(event, ({ createdBy }) => createdBy);
      await channel.sendToQueue('EVENT-CREATEDBY-GET', Buffer.from(JSON.stringify(listCreatedBy)));
      await channel.consume('EVENT-CREATEDBY-INFO', (info) => {
        const listUser = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('createdByList', listUser);
      });
      setTimeout(() => eventEmitter.emit('createdByList'), 10000);
      const dataUser = await new Promise((resolve) => { eventEmitter.once('createdByList', resolve); });

      event.map((item) => {
        const { createdBy } = item;
        if (dataUser && dataUser[item.createdBy]) {
          item._doc.createdBy = dataUser[item.createdBy];
        }

        if (item.interest.includes(userid)) {
          item._doc.interested = true;
        } else {
          item._doc.interested = false;
        }
        // số người quan tâm
        item._doc.interest = item.interest.length;

        item._doc.timePost = timePost(item.createdAt);
        if (item.participants.includes(userid)) {
          item._doc.joined = true;
        } else {
          item._doc.joined = false;
        }
        if (createdBy === userid) {
          item._doc.permittedToEdit = true;
        } else {
          item._doc.permittedToEdit = false;
        }
        return item;
      });
    }

    const total = await Event.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    return res.status(200).send({
      success: true,
      data: event,
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

exports.eventDetail = async (req, res) => {
  try {
    const { userid } = req.headers;
    const { eventId } = req.params;
    const event = await Event.findById(eventId, '-__V');
    if (!event) {
      return res.status(400).send({
        success: false,
        error: 'Sự kiện không tồn tại!',
      });
    }

    await channel.sendToQueue('EVENT-CREATEDBY-DETAIL-GET', Buffer.from(JSON.stringify(event.createdBy)));
    await channel.consume('EVENT-CREATEDBY-DETAIL-INFO', (info) => {
      const listUser = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('createdBy', listUser);
    });
    setTimeout(() => eventEmitter.emit('createdBy'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('createdBy', resolve); });
    if (userData) {
      event._doc.createdBy = userData;
    }

    // lấy danh sách người tham gia sự kiện
    if (event.participants.length) {
      const listUserId = event.participants;
      // gọi rabbitMQ
      await channel.sendToQueue('EVENT-USER-GET', Buffer.from(JSON.stringify(listUserId)));
      await channel.consume('EVENT-USER-INFO', (info) => {
        const listUser = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('event', listUser);
      });
      setTimeout(() => eventEmitter.emit('event'), 10000);
      const dataUser = await new Promise((resolve) => { eventEmitter.once('event', resolve); });

      // trả về data người dùng
      event._doc.participants = dataUser;
    }
    if (event.participants.find((o) => o._id.toString() === userid)) {
      event._doc.joined = true;
    } else {
      event._doc.joined = false;
    }
    if (event.interest.includes(userid)) {
      event._doc.interested = true;
    } else {
      event._doc.interested = false;
    }
    // số người quan tâm
    event._doc.interest = event.interest.length;

    if (event.createdBy._id.toString() === userid) {
      event._doc.permittedToEdit = true;
    } else {
      event._doc.permittedToEdit = false;
    }
    event._doc.timePost = timePost(event.createdAt);

    return res.status(200).send({
      success: true,
      data: event,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.editEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { body } = req;
    if (body.time) {
      body.time = new Date(body.time).valueOf();
    }
    const event = await Event.findByIdAndUpdate(eventId, body);
    if (event && body.image) {
      const fileSave = {
        newFile: body.image,
        oldFile: event.image,
      };
      channel.sendToQueue('FILE-EVENT-CHANGE', Buffer.from(JSON.stringify({
        id: event._id,
        fileSave,
        userId: req.headers.userid,
      })));
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

exports.joinTheEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userid } = req.headers;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(400).send({
        success: false,
        error: 'Sự kiện không tồn tại!',
      });
    }
    if (event.participants.includes(userid)) {
      event.participants = event.participants.filter((item) => item !== userid);
      const { participants } = event;
      const leaveEvent = await Event.findByIdAndUpdate(eventId, { participants });

      if (leaveEvent) {
        // tạo thông báo rời sự kiện
        const user = await getInfoUser(userid);
        if (user) {
          channel.sendToQueue('CREATE-NOTIFY', Buffer.from(JSON.stringify({
            type: 'HOUSE_ROOF',
            title: `${user.name} đã rời sự kiện ${event.title} của bạn`,
            content: `${user.name} đã rời sự kiện ${event.title} của bạn`,
            toProject: leaveEvent.projectId,
            toUser: leaveEvent.createdBy,
            url: `${url}community/${event._id}`,
          })));

          // gửi thông báo
          channel.sendToQueue('SEND-MESSAGE', Buffer.from(JSON.stringify({
            userId: leaveEvent.createdBy,
            content: `${user.name} đã rời sự kiện ${event.title} của bạn`,
            type: 'HOUSE_ROOF',
            url: `${url}community/${event._id}`,
          })));
        }
      }

      return res.status(200).send({
        success: true,
      });
    }

    if (event.participants.length === event.slot) {
      return res.status(400).send({
        success: false,
        error: 'Sự kiện đã hết chỗ!',
      });
    }

    const currentDate = new Date();
    const eventDate = new Date(event.time * 1);
    if (currentDate >= eventDate) {
      return res.status(400).send({
        success: false,
        error: 'Sự kiện đã bắt đầu!',
      });
    }

    event.participants.push(userid);
    const { participants } = event;
    const joinEvent = await Event.findByIdAndUpdate(eventId, { participants });
    if (joinEvent) {
      const user = await getInfoUser(userid);
      if (user) {
      // tạo thông báo rời sự kiện
        channel.sendToQueue('CREATE-NOTIFY', Buffer.from(JSON.stringify({
          type: 'HOUSE_ROOF',
          title: `${user.name} đã tham gia sự kiện ${event.title} của bạn`,
          content: `${user.name} đã tham gia sự kiện ${event.title} của bạn`,
          toProject: joinEvent.projectId,
          toUser: joinEvent.createdBy,
          url: `${url}community/${event._id}`,
        })));

        // gửi thông báo
        channel.sendToQueue('SEND-MESSAGE', Buffer.from(JSON.stringify({
          userId: joinEvent.createdBy,
          content: `${user.name} đã tham gia sự kiện ${event.title} của bạn`,
          type: 'HOUSE_ROOF',
          urlNotify: `${url}community/${event._id}`,
        })));
      }
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

exports.interestedEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userid } = req.headers;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(400).send({
        success: false,
        error: 'Sự kiện không tồn tại!',
      });
    }
    if (event.interest.includes(userid)) {
      event.interest = event.interest.filter((item) => item !== userid);
      const { interest } = event;
      await Event.findByIdAndUpdate(eventId, { interest });
      return res.status(200).send({
        success: true,
      });
    }

    event.interest.push(userid);
    const { interest } = event;
    const update = await Event.findByIdAndUpdate(eventId, { interest });
    if (update) {
      const user = await getInfoUser(userid);
      if (user) {
        channel.sendToQueue('CREATE-NOTIFY', Buffer.from(JSON.stringify({
          type: 'HOUSE_ROOF',
          title: `${user.name} đã quan tâm sự kiện ${event.title} của bạn`,
          content: `${user.name} đã quan tâm sự kiện ${event.title} của bạn`,
          toProject: event.projectId,
          toUser: event.createdBy,
          url: `${url}community/${event._id}`,
        })));

        // gửi thông báo
        channel.sendToQueue('SEND-MESSAGE', Buffer.from(JSON.stringify({
          userId: event.createdBy,
          content: `${user.name} đã quan tâm sự kiện ${event.title} của bạn`,
          type: 'HOUSE_ROOF',
          urlNotify: `${url}community/${event._id}`,
        })));
      }
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
