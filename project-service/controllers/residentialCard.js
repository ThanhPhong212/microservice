/* eslint-disable radix */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const ResidentialCard = require('../models/residentialCard');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('RESIDENT-CARD-CHECK-USER-INFO');
  await channel.assertQueue('RESIDENT-CARD-USER-INFO');
};
connectRabbit();

exports.registrationOfResidentialCards = async (req, res) => {
  try {
    const { userid } = req.headers;
    const { body } = req;
    body.createdBy = userid;
    body.updatedBy = userid;

    const card = await ResidentialCard.findOne(
      {
        apartmentId: body.apartmentId,
        phone: body.phone,
        numberIdentify: body.numberIdentify,
        status: { $ne: 'CANCEL' },
      },
    );
    if (card) {
      return res.status(400).send({
        success: false,
        error: 'Thẻ cư dân đã tồn tại!',
      });
    }

    await channel.sendToQueue('RESIDENT-CARD-CHECK-USER-GET', Buffer.from(JSON.stringify(body)));
    await channel.consume('RESIDENT-CARD-CHECK-USER-INFO', (search) => {
      const dataUser = JSON.parse(search.content);
      channel.ack(search);
      eventEmitter.emit('createUser', dataUser);
    });
    setTimeout(() => eventEmitter.emit('createUser'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('createUser', resolve); });

    if (!userData) {
      return res.status(400).send({
        success: false,
        error: 'Thông tin người dùng đã tồn tại!',
      });
    }

    const cardUser = await ResidentialCard.create(body);

    if (cardUser && body.imageResident) {
      await channel.sendToQueue(
        'FILE-IMAGE',
        Buffer.from(JSON.stringify({
          id: cardUser._id,
          fileSave: { residentialCard: body.imageResident },
          userId: userid,
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

exports.listOfResidentsCards = async (req, res) => {
  try {
    const { apartmentId } = req.query;
    const { userid } = req.headers;
    const list = await ResidentialCard.find(
      { apartmentId, createdBy: userid, status: { $in: ['DONE', 'PROCESS', 'REFUSE'] } },
    ).sort({ _id: -1 });

    return res.status(200).send({
      success: true,
      data: list,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.listCard = async (req, res) => {
  try {
    const {
      status, limit, page, projectId, keywords,
    } = req.query;
    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);
    const query = { projectId };
    if (status) { query.status = status; }
    if (keywords) {
      query.$or = [
        { name: { $regex: keywords, $options: 'i' } },
        { numberIdentify: { $regex: keywords, $options: 'i' } },
        { phone: { $regex: keywords, $options: 'i' } },
        { email: { $regex: keywords, $options: 'i' } },
      ];
    }
    const list = await ResidentialCard.find(query)
      .sort({ _id: -1 })
      .select('-__v')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const total = await ResidentialCard.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    if (list.length) {
      const listUserId = [];
      list.map((item) => {
        if (item.createdBy) { listUserId.push(item.createdBy); }
        if (item.updatedBy) { listUserId.push(item.updatedBy); }
        return item;
      });
      if (listUserId.length) {
        await channel.sendToQueue('RESIDENT-CARD-USER-GET', Buffer.from(JSON.stringify(listUserId)));
        await channel.consume('RESIDENT-CARD-USER-INFO', (search) => {
          const dataUser = JSON.parse(search.content);
          channel.ack(search);
          eventEmitter.emit('user', dataUser);
        });
        setTimeout(() => eventEmitter.emit('user'), 10000);
        const userData = await new Promise((resolve) => { eventEmitter.once('user', resolve); });
        if (userData && userData.length) {
          const listUser = userData.reduce((acc, cur) => {
            const id = cur._id;
            return { ...acc, [id]: cur };
          }, {});
          list.map((item) => {
            if (listUser[item.createdBy]) { item._doc.createdBy = listUser[item.createdBy]; }
            if (listUser[item.updatedBy]) { item._doc.updatedBy = listUser[item.updatedBy]; }
            return item;
          });
        }
      }
    }

    return res.status(200).send({
      success: true,
      data: list,
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

exports.updateResidentialCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { status } = req.body;
    const { userid } = req.headers;
    const card = await ResidentialCard.findByIdAndUpdate(cardId, { status, updatedBy: userid });

    if (card && status === 'DONE') {
      const { phone, numberIdentify, projectId } = card;
      await channel.sendToQueue('RESIDENT-CARD-CREATE-USER', Buffer.from(JSON.stringify({ phone, numberIdentify, projectId })));
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

exports.detailResidentialCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await ResidentialCard.findById(cardId);
    return res.status(200).send({
      success: true,
      data: card,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
