/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const Project = require('../models/project');
const Block = require('../models/block');
const Apartment = require('../models/apartment');
const connect = require('../lib/rabbitMQ');
const logger = require('../utils/logger');

const eventEmitter = new EventEmitter();

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('FILE-PROJECT');
  await channel.assertQueue('PROJECT-GETINFO-NOTIFY');
  await channel.assertQueue('PROJECT-LIST');
  await channel.assertQueue('PROJECT-SEARCH-REQUEST');
  await channel.assertQueue('PROJECT-SEND-REQUEST');
  await channel.assertQueue('PROJECT-SERVICE-INFO');
  await channel.assertQueue('PROJECT-BASEMENT-INFO');
};
connectRabbit().then(() => {
  channel.consume('FILE-PROJECT', async (data) => {
    const dtum = JSON.parse(data.content);
    channel.ack(data);
    try {
      await Project.findByIdAndUpdate(dtum.id, { thumbnail: dtum.thumbnail });
    } catch (error) {
      logger.error(error.message);
    }
  });

  channel.consume('PROJECT-GETINFO-NOTIFY', async (data) => {
    const dtum = JSON.parse(data.content);
    channel.ack(data);
    try {
      const apartment = await Apartment.find({ owner: dtum.userId }, '-__v -owner -tenant -member -status')
        .populate({
          path: 'block',
          populate: {
            path: 'idProject',
            select: 'name _id',
          },
          select: 'name _id',
        }).lean();
      await channel.sendToQueue('NOTIFY-PROJECT', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      await channel.sendToQueue('NOTIFY-PROJECT', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('PROJECT-LIST', async (data) => {
    const dtum = JSON.parse(data.content);
    channel.ack(data);
    try {
      const obj = {};
      obj.block = {};
      obj.floor = {};
      obj.userId = [];
      obj.apartment = {};
      const arrayApartment = [];
      if (dtum.length > 0) {
        const project = await Project.findOne({ _id: dtum[0].toProject })
          .select('block')
          .populate({
            path: 'block',
            select: 'name _id floor',
          });
        const blockJson = {};
        // eslint-disable-next-line array-callback-return
        project.block.map((item) => { blockJson[item._id] = item; });
        await Promise.all(dtum.map(async (item) => {
          const element = item;
          if (!item.toBlock) {
            return element;
          }
          if (!item.toFloor) {
            // data json key block id - value: detail block
            obj.block[element.toBlock] = blockJson[element.toBlock].name;
            return element;
          }
          if (!item.toApartment) {
            const floorJson = {};
            // data json key floor id - value: detail floor
            obj.block[element.toBlock] = blockJson[element.toBlock].name;
            // eslint-disable-next-line array-callback-return
            blockJson[element.toBlock].floor.map((value) => { floorJson[value._id] = value; });
            obj.floor[element.toFloor] = floorJson[element.toFloor].name;
            return element;
          }
          if (!arrayApartment.includes(element.toApartment)) {
            arrayApartment.push(element.toApartment);
            return element;
          }
          return element;
        }));
        const apartment = await Apartment.find({ _id: { $in: arrayApartment } }).select('id owner');
        await Promise.all(apartment.map(async (item) => {
          const element = item;
          if (element.owner) {
            obj.userId.push(element.owner);
          }
          obj.apartment[element.id] = element.owner;
          return element;
        }));
        await channel.sendToQueue('NOTIFY-LIST-PROJECT', Buffer.from(JSON.stringify(obj)));
      }
    } catch (error) {
      logger.error(error.message);
      await channel.sendToQueue('NOTIFY-LIST-PROJECT', Buffer.from(JSON.stringify(null)));
    }
  });
  channel.consume('PROJECT-SEARCH-REQUEST', async (data) => {
    const dtum = JSON.parse(data.content);
    channel.ack(data);
    try {
      const { keywords, projectId } = dtum;

      // search block theo keywords
      const block = await Block.find({ name: { $regex: keywords, $options: 'i' }, idProject: projectId });
      const arrayBlockId = Array.from(block, ({ _id }) => _id);

      // search căn hộ theo keywords
      const apartment = await Apartment.find({
        apartmentCode: { $regex: keywords, $options: 'i' },
      }).select('id');
      const arrayApartmentId = Array.from(apartment, ({ _id }) => _id);
      await channel.sendToQueue('REQUEST-SEARCH-PROJECT', Buffer.from(JSON.stringify({ block: arrayBlockId, apartment: arrayApartmentId })));
    } catch (error) {
      logger.error(error.message);
      await channel.sendToQueue('REQUEST-SEARCH-PROJECT', Buffer.from(JSON.stringify({ block: [], apartment: [] })));
    }
  });

  channel.consume('PROJECT-SEND-REQUEST', async (data) => {
    const dtum = JSON.parse(data.content);
    channel.ack(data);
    try {
      // search căn hộ theo keywords
      const apartment = await Apartment.find({ _id: dtum }).select('apartmentCode block')
        .populate('block', 'name').lean();
      await channel.sendToQueue('REQUEST-GET-PROJECT', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      logger.error(error.message);
      await channel.sendToQueue('REQUEST-GET-PROJECT', Buffer.from(JSON.stringify([])));
    }
  });
});

exports.listProject = async (req, res) => {
  try {
    const { keywords } = req.query;
    const query = Project.find().sort({ name: 1 });
    query.populate('block', '-__v');
    query.populate('typeApartment', '-__v');
    if (keywords) {
      query.regex('name', new RegExp(keywords, 'i'));
    }
    query.select('-__v');
    const data = await query.exec();
    data.forEach((element, index) => {
      const sum = element.block.reduce((accumulator, obj) => accumulator + obj.numberApartment, 0);
      data[index]._doc.numberApartment = sum;
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

exports.createProject = async (req, res) => {
  try {
    const projectIns = req.body;
    const userId = req.headers.userid;
    projectIns.createdBy = userId;
    projectIns.updatedBy = userId;
    await Project.create(projectIns, (error, prj) => {
      if (error) {
        return res.status(400).send({
          success: false,
          error: error.message,
        });
      }
      return res.status(200).send({
        success: true,
        data: prj,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Project.findById(id, '-createdAt -createdBy -updatedAt -updatedBy -__v')
      .populate('block', '-createdAt -createdBy -updatedAt -updatedBy -__v')
      .populate('typeApartment', '-createdAt -createdBy -updatedAt -updatedBy -__v').exec();
    data._doc.numberOfBlock = data.block.length;
    data._doc.numberOfTypeApartment = data.typeApartment.length;

    // Get the total utility
    await channel.sendToQueue('PROJECT-SERVICE-GET', Buffer.from(JSON.stringify(id)));
    await channel.consume('PROJECT-SERVICE-INFO', (info) => {
      const dataService = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('sumService', dataService);
    });
    setTimeout(() => eventEmitter.emit('sumService'), 10000);
    const service = await new Promise((resolve) => { eventEmitter.once('sumService', resolve); });
    data._doc.service = service;

    // Take the  total basement
    await channel.sendToQueue('PROJECT-BASEMENT-GET', Buffer.from(JSON.stringify(id)));
    await channel.consume('PROJECT-BASEMENT-INFO', (info) => {
      const dataBasement = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('sumBasement', dataBasement);
    });
    setTimeout(() => eventEmitter.emit('sumBasement'), 10000);
    const basement = await new Promise((resolve) => { eventEmitter.once('sumBasement', resolve); });
    data._doc.basement = basement;

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

exports.updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectIns = req.body;
    delete projectIns.thumbnail;
    projectIns.updatedBy = req.headers.userid;
    await Project.findByIdAndUpdate(projectId, projectIns, {
      returnDocument: 'before',
    }, (error, prj) => {
      if (error) {
        return res.status(400).send({
          success: false,
          error: error.message,
        });
      }
      return res.status(200).send({
        success: true,
        data: prj,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
