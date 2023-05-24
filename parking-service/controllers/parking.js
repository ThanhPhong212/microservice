/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable radix */
const EventEmitter = require('events');

const eventEmitter = new EventEmitter();
const Parking = require('../models/parking');
const connect = require('../lib/rabbitMQ');
const VehicleCard = require('../models/vehicleCard');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('PARKING-SEARCH-BLOCK-INFO');
  await channel.assertQueue('PARKING-SEARCH-USER-INFO');
  await channel.assertQueue('PARKING-USER-INFO');
  await channel.assertQueue('PARKING-BLOCK-INFO');
  await channel.assertQueue('PARKING-BLOCKID-INFO');
  await channel.assertQueue('PARKING-DETAILS-USER-INFO');
  await channel.assertQueue('PARKING-DETAILS-BLOCK-INFO');
  await channel.assertQueue('PROJECT-BASEMENT-GET');
};
connectRabbit().then(() => {
  channel.consume('PROJECT-BASEMENT-GET', async (data) => {
    const projectId = JSON.parse(data.content);
    try {
      const parking = await Parking.find({ projectId });
      let sumBasement = 0;
      if (parking.length > 0) {
        parking.map((item) => {
          sumBasement += item.floor;
          return item;
        });
        await channel.sendToQueue('PROJECT-BASEMENT-INFO', Buffer.from(JSON.stringify(sumBasement)));
      }
      await channel.sendToQueue('PROJECT-BASEMENT-INFO', Buffer.from(JSON.stringify(0)));
    } catch (error) {
      await channel.sendToQueue('PROJECT-BASEMENT-INFO', Buffer.from(JSON.stringify(0)));
    }
    channel.ack(data);
  });
});
const countVehicleCard = async () => {
  try {
    const countVehicle = await VehicleCard.aggregate([
      {
        $group: {
          _id: {
            parking: '$parking',
            vehicleType: '$vehicleType',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);
    const vehicle = countVehicle.reduce((acc, cur) => {
      const id = cur._id.parking + cur._id.vehicleType + cur._id.status;
      return { ...acc, [id]: cur };
    }, {});
    return vehicle;
  } catch (error) {
    return {};
  }
};

exports.createParking = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const parkingIns = req.body;
    parkingIns.createdBy = userId;
    parkingIns.updatedBy = userId;
    parkingIns.quantityConfig = {
      motor: parkingIns.motor,
      car: parkingIns.car,
      bicycle: parkingIns.bicycle,
    };
    const parking = await Parking.create(parkingIns);
    return res.status(200).send({
      success: true,
      data: parking,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.updateParking = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const { parkingId } = req.params;
    const parkingIns = req.body;
    parkingIns.updatedBy = userId;

    // kiểm tra thẻ xe trong bãi xe
    const carCardInTheParkingLot = await VehicleCard.findOne({ parking: parkingId });
    if (parkingIns.isDeleted && carCardInTheParkingLot) {
      return res.status(400).send({
        success: false,
        error: 'Bãi xe này đang được sử dụng!',
      });
    }

    if (parkingIns.motor && parkingIns.motor && parkingIns.motor) {
      parkingIns.quantityConfig = {
        motor: parkingIns.motor,
        car: parkingIns.car,
        bicycle: parkingIns.bicycle,
      };
    }
    await Parking.findByIdAndUpdate(parkingId, parkingIns);
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

exports.listParking = async (req, res) => {
  try {
    const {
      projectId, limit, page, keywords,
    } = req.query;
    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);
    const query = { projectId, isDeleted: false };
    if (keywords) {
      // setup search updatedAt
      const date = new Date(keywords).valueOf();

      // setup search block
      await channel.sendToQueue('PARKING-SEARCH-BLOCK-GET', Buffer.from(JSON.stringify({ keywords, projectId })));
      await channel.consume('PARKING-SEARCH-BLOCK-INFO', (search) => {
        const block = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('consumeBlock', block);
      });
      setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
      const blockSearch = await new Promise((resolve) => { eventEmitter.once('consumeBlock', resolve); });
      const searchBlock = Array.from(blockSearch, ({ _id }) => _id);

      // setup search user
      await channel.sendToQueue('PARKING-SEARCH-USER-GET', Buffer.from(JSON.stringify(keywords)));
      await channel.consume('PARKING-SEARCH-USER-INFO', (search) => {
        const user = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('consumeUser', user);
      });
      setTimeout(() => eventEmitter.emit('consumeUser'), 10000);
      const searchUser = await new Promise((resolve) => { eventEmitter.once('consumeUser', resolve); });
      const userSearch = Array.from(searchUser, ({ _id }) => _id);

      query.$or = [
        { name: { $regex: keywords, $options: 'i' } },
        { blockId: { $in: searchBlock } },
        { updatedBy: { $in: userSearch } },
        { updatedAt: { $regex: date, $options: 'i' } },
      ];
    }
    const parking = await Parking.find(query)
      .sort({ _id: -1 })
      .select('-__v -idDeleted -createdBy -createdAt -isDeleted')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const total = await Parking.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    // get info user
    const user = Array.from(parking, ({ updatedBy }) => updatedBy);
    await channel.sendToQueue('PARKING-USER-GET', Buffer.from(JSON.stringify(user)));
    await channel.consume('PARKING-USER-INFO', (userList) => {
      const dataUser = JSON.parse(userList.content);
      channel.ack(userList);
      eventEmitter.emit('consumeUserList', dataUser);
    });
    setTimeout(() => eventEmitter.emit('consumeUserList'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('consumeUserList', resolve); });

    // get info block
    const block = Array.from(parking, ({ blockId }) => blockId);
    await channel.sendToQueue('PARKING-BLOCK-GET', Buffer.from(JSON.stringify(block)));
    await channel.consume('PARKING-BLOCK-INFO', (blockList) => {
      const dataBlock = JSON.parse(blockList.content);
      channel.ack(blockList);
      eventEmitter.emit('consumeBlockList', dataBlock);
    });
    setTimeout(() => eventEmitter.emit('consumeBlockList'), 10000);
    const blockData = await new Promise((resolve) => { eventEmitter.once('consumeBlockList', resolve); });

    // Count the number of car cards approved in each yard
    const vehicle = await countVehicleCard();

    // format data
    parking.map((item) => {
      if (userData) {
        item._doc.updatedBy = {
          name: userData[item.updatedBy].name,
          phone: userData[item.updatedBy].phone,
        };
      }
      item._doc.motor = {
        quantity: vehicle[`${item._id}MOTORDONE`] ? vehicle[`${item._id}MOTORDONE`].count : 0,
        capacity: item.quantityConfig.motor,
      };
      item._doc.car = {
        quantity: vehicle[`${item._id}CARDONE`] ? vehicle[`${item._id}CARDONE`].count : 0,
        capacity: item.quantityConfig.car,
      };
      item._doc.bicycle = {
        quantity: vehicle[`${item._id}BICYCLEDONE`] ? vehicle[`${item._id}BICYCLEDONE`].count : 0,
        capacity: item.quantityConfig.bicycle,
      };
      if (blockData) { item._doc.block = blockData[item.blockId].name; }
      delete item._doc.blockId;
      delete item._doc.quantityConfig;
      return item;
    });

    const data = {};
    data.parking = parking ?? [];
    data.active = await Parking.countDocuments({ projectId, status: true, isDeleted: false });
    data.totalParking = await Parking.countDocuments({ projectId, isDeleted: false });
    data.maintenance = data.totalParking - data.active;

    return res.status(200).send({
      success: true,
      data,
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

exports.listParkingByBlock = async (req, res) => {
  try {
    const { apartmentId, blockId } = req.query;
    const query = { isDeleted: false };

    if (blockId) {
      query.blockId = blockId;
    }
    if (apartmentId) {
      // Get the project ID through the apartment
      await channel.sendToQueue('PARKING-BLOCKID-GET', Buffer.from(JSON.stringify(apartmentId)));
      await channel.consume('PARKING-BLOCKID-INFO', (info) => {
        const apartment = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeBlock', apartment);
      });
      setTimeout(() => eventEmitter.emit('consumeBlock'), 10000);
      const dataApartment = await new Promise((resolve) => { eventEmitter.once('consumeBlock', resolve); });

      const blockOfTheApartment = dataApartment.block._id;
      query.blockId = blockOfTheApartment;
    }
    const parking = await Parking.find(query).select('name');

    return res.status(200).send({
      success: true,
      data: parking,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.detailParking = async (req, res) => {
  try {
    const { parkingId } = req.params;
    const parking = await Parking.findById(parkingId).select('-__v -idDeleted -createdBy');

    // get info createdBy
    await channel.sendToQueue('PARKING-DETAILS-USER-GET', Buffer.from(JSON.stringify(parking.updatedBy)));
    await channel.consume('PARKING-DETAILS-USER-INFO', (user) => {
      const dataBlock = JSON.parse(user.content);
      channel.ack(user);
      eventEmitter.emit('consumeDone', dataBlock);
    });
    setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });

    // get info block
    const blockInfo = {
      blockId: parking.blockId,
    };
    await channel.sendToQueue('PARKING-DETAILS-BLOCK-GET', Buffer.from(JSON.stringify(blockInfo)));
    await channel.consume('PARKING-DETAILS-BLOCK-INFO', (block) => {
      const dataBlock = JSON.parse(block.content);
      channel.ack(block);
      eventEmitter.emit('consumeDone', dataBlock);
    });
    setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
    const blockData = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });

    // Count the number of car cards approved in each yard
    const vehicle = await countVehicleCard();

    // format data
    parking._doc.updatedBy = {
      name: userData.name,
      phone: userData.phone,
    };
    parking._doc.block = blockData.name;
    parking._doc.motor = {
      quantity: vehicle[`${parking._id}MOTORDONE`] ? vehicle[`${parking._id}MOTORDONE`].count : 0,
      capacity: parking.quantityConfig.motor,
    };
    parking._doc.car = {
      quantity: vehicle[`${parking._id}CARDONE`] ? vehicle[`${parking._id}CARDONE`].count : 0,
      capacity: parking.quantityConfig.car,
    };
    parking._doc.bicycle = {
      quantity: vehicle[`${parking._id}BICYCLEDONE`] ? vehicle[`${parking._id}BICYCLEDONE`].count : 0,
      capacity: parking.quantityConfig.bicycle,
    };
    delete parking._doc.blockId;
    delete parking._doc.quantityConfig;

    return res.status(200).send({
      success: true,
      data: parking,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
