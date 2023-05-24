/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
const EventEmitter = require('events');
const mongoose = require('mongoose');

const eventEmitter = new EventEmitter();
const VehicleCard = require('../models/vehicleCard');
const connect = require('../lib/rabbitMQ');
const Parking = require('../models/parking');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('PARKING-APARTMENT-INFO');
  await channel.assertQueue('CARD-USER-INFO');
  await channel.assertQueue('CARD-APARTMENT-INFO');
  await channel.assertQueue('CARD-SEARCH-USER-INFO');
  await channel.assertQueue('CARD-SEARCH-APARTMENT-INFO');
  await channel.assertQueue('CARD-DETAIL-USER-INFO');
  await channel.assertQueue('CARD-DETAIL-APARTMENT-INFO');
  await channel.assertQueue('FEE-CARD-VEHICLE-GET');
  await channel.assertQueue('FEE-DETAIL-VEHICLE-GET');
  await channel.assertQueue('CARD-CHECK-BILL-INFO');
  await channel.assertQueue('CARD-DETAIL-FEE-INFO');
};
connectRabbit().then(() => {
  channel.consume('FEE-DETAIL-VEHICLE-GET', async (data) => {
    try {
      const idProject = JSON.parse(data.content);
      channel.ack(data);

      const projectId = mongoose.Types.ObjectId(idProject);
      const vehicle = await VehicleCard.aggregate([
        {
          $match: {
            status: 'DONE', tariff: true, isDeleted: false, projectId,
          },
        },
        {
          $lookup: {
            from: 'parkings',
            localField: 'parking',
            foreignField: '_id',
            as: 'parking',
          },
        },
        { $group: { _id: '$apartmentId', vehicles: { $push: '$$ROOT' } } },
      ]);

      const vehicleData = vehicle.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      channel.sendToQueue('FEE-DETAIL-VEHICLE-INFO', Buffer.from(JSON.stringify(vehicleData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-DETAIL-VEHICLE-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-CARD-VEHICLE-GET', async (data) => {
    try {
      const idProject = JSON.parse(data.content);
      channel.ack(data);

      const projectId = mongoose.Types.ObjectId(idProject);
      const vehicle = await VehicleCard.aggregate([
        {
          $match: {
            status: 'DONE', isDeleted: false, projectId, tariff: true, vehicleType: { $ne: 'BICYCLE' },
          },
        },
        { $group: { _id: '$apartmentId', count: { $sum: 1 } } },
      ]);

      const vehicleMotor = await VehicleCard.aggregate([
        {
          $match: {
            status: 'DONE', isDeleted: false, projectId, tariff: true, vehicleType: 'MOTOR',
          },
        },
        { $group: { _id: '$apartmentId', count: { $sum: 1 } } },
      ]);

      const vehicleCar = await VehicleCard.aggregate([
        {
          $match: {
            status: 'DONE', isDeleted: false, projectId, tariff: true, vehicleType: 'CAR',
          },
        },
        { $group: { _id: '$apartmentId', count: { $sum: 1 } } },
      ]);

      const vehicleData = await VehicleCard.aggregate([
        {
          $match: {
            status: 'DONE', tariff: true, isDeleted: false, projectId, vehicleType: { $ne: 'BICYCLE' },
          },
        },
        {
          $lookup: {
            from: 'parkings',
            localField: 'parking',
            foreignField: '_id',
            as: 'parking',
          },
        },
        { $group: { _id: '$apartmentId', vehicles: { $push: '$$ROOT' } } },
      ]);

      channel.sendToQueue('FEE-CARD-VEHICLE-INFO', Buffer.from(JSON.stringify({
        vehicle, vehicleMotor, vehicleCar, vehicleData,
      })));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-CARD-VEHICLE-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });
});

// eslint-disable-next-line consistent-return
exports.createVehicleCard = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const cardIns = req.body;

    // Check the license plate
    const card = await VehicleCard.findOne({
      licensePlate: cardIns.licensePlate,
    });
    if (card) {
      return res.status(400).send({
        success: false,
        error: 'Biển số xe này đã có người đăng ký!',
      });
    }

    // Get the project ID through the apartment
    await channel.sendToQueue('PARKING-APARTMENT-GET', Buffer.from(JSON.stringify(cardIns.apartmentId)));
    await channel.consume('PARKING-APARTMENT-INFO', (info) => {
      const apartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeCreate', apartment);
    });
    setTimeout(() => eventEmitter.emit('consumeCreate'), 10000);
    const dataApartment = await new Promise((resolve) => { eventEmitter.once('consumeCreate', resolve); });

    if (!dataApartment) {
      return res.status(400).send({
        success: false,
        error: 'Không tìm thấy thông tin căn hộ!',
      });
    }

    // format data insert
    if (!cardIns.registrationDate) {
      cardIns.registrationDate = new Date().valueOf();
    } else {
      cardIns.registrationDate = new Date(cardIns.registrationDate).valueOf();
    }
    cardIns.cardCode = cardIns.licensePlate;
    cardIns.projectId = dataApartment.block.projectId;
    cardIns.createdBy = userId;
    cardIns.parking = cardIns.parkingId;
    if (!cardIns.userId) {
      cardIns.userId = userId;
    } else {
      cardIns.status = 'DONE';
      cardIns.timeDone = new Date().valueOf();
    }
    cardIns.vehicleLicense = {
      frontLicense: cardIns.frontLicense,
      backsideLicense: cardIns.backsideLicense,
      vehicleImage: cardIns.vehicleImage,
      vehicleType: cardIns.vehicleType,
    };

    // Check parking
    const parking = await Parking.findById(cardIns.parkingId);
    const totalCard = await VehicleCard.countDocuments({
      projectId: cardIns.projectId,
      vehicleType: cardIns.vehicleType,
      parking: cardIns.parkingId,
      status: 'DONE',
    });
    let blank;
    if (cardIns.vehicleType === 'MOTOR') {
      blank = parking.quantityConfig.motor - totalCard;
    }
    if (cardIns.vehicleType === 'CAR') {
      blank = parking.quantityConfig.car - totalCard;
    }
    if (cardIns.vehicleType === 'BICYCLE') {
      blank = parking.quantityConfig.bicycle - totalCard;
    }
    if (blank === 0) {
      return res.status(400).send({
        success: false,
        error: 'Bãi xe đã hết chỗ, vui lòng chọn bãi khác !',
      });
    }

    // Create a new vehicle card
    await VehicleCard.create(cardIns, (err, result) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      channel.sendToQueue(
        'FILE-IMAGE',
        Buffer.from(JSON.stringify({
          id: result._id,
          fileSave: cardIns.vehicleLicense,
          userId,
        })),
      );
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

exports.updateVehicleCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const updatedBy = req.headers.userid;
    const cardIns = req.body;
    cardIns.updatedBy = updatedBy;
    if (cardIns.registrationDate) {
      cardIns.registrationDate = new Date(cardIns.registrationDate).valueOf();
    }
    const vehicleLicense = {};

    // Check the license plate
    let checkCard;
    const check = await VehicleCard.findById(cardId);
    if (check.licensePlate !== cardIns.licensePlate) {
      checkCard = await VehicleCard.findOne({
        licensePlate: cardIns.licensePlate,
      });
    }
    if (checkCard) {
      return res.status(400).send({
        success: false,
        error: 'Biển số xe này đã có người đăng ký!',
      });
    }

    // kiểm tra trạng thái hóa đơn của thẻ xe trong tháng
    if (cardIns.status && check.status !== cardIns.status) {
      await channel.sendToQueue('CARD-CHECK-BILL-GET', Buffer.from(JSON.stringify(check.licensePlate)));
      await channel.consume('CARD-CHECK-BILL-INFO', (info) => {
        const changeTheState = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('changeTheState', changeTheState);
      });
      setTimeout(() => eventEmitter.emit('changeTheState'), 10000);
      const changeTheStateData = await new Promise((resolve) => { eventEmitter.once('changeTheState', resolve); });
      if (!changeTheStateData) {
        return res.status(400).send({
          success: false,
          error: 'Không thể đổi trạng thái của thẻ xe!',
        });
      }
    }

    if (cardIns.frontLicense) { vehicleLicense.frontLicense = cardIns.frontLicense; }
    if (cardIns.backsideLicense) { vehicleLicense.backsideLicense = cardIns.backsideLicense; }
    if (cardIns.vehicleImage) { vehicleLicense.vehicleImage = cardIns.vehicleImage; }
    if (cardIns.licensePlate) {
      cardIns.cardCode = cardIns.licensePlate;
    }
    if (Object.values(vehicleLicense).length > 0) {
      cardIns.vehicleLicense = vehicleLicense;
    }

    const card = await VehicleCard.findByIdAndUpdate(cardId, cardIns);
    // setup save file
    const fileSave = {};
    if (cardIns.frontLicense) {
      const oldFile = card.vehicleLicense.frontLicense;
      fileSave.frontLicense = {
        newFile: cardIns.frontLicense,
        oldFile,
      };
    }
    if (cardIns.backsideLicense) {
      const oldFile = card.vehicleLicense.backsideLicense;
      fileSave.backsideLicense = {
        newFile: cardIns.backsideLicense,
        oldFile,
      };
    }
    if (cardIns.vehicleImage) {
      const oldFile = card.vehicleLicense.vehicleImage;
      fileSave.vehicleImage = {
        newFile: cardIns.vehicleImage,
        oldFile,
      };
    }
    channel.sendToQueue('FILE-VEHICLE-CHANGE', Buffer.from(JSON.stringify({
      id: card._id,
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

exports.listVehicleCard = async (req, res) => {
  try {
    const {
      projectId, limit, page, keywords, status,
    } = req.query;
    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);
    const query = { projectId, status: 'DONE', isDeleted: false };

    if (status) { query.status = status; }

    if (keywords) {
      // setup search parking
      const parking = await Parking.find({ projectId, name: { $regex: keywords, $options: 'i' } }).select('_id');
      const parkingSearch = Array.from(parking, ({ _id }) => _id);

      // setup search registration date
      const date = new Date(keywords).valueOf();

      // setup search user
      await channel.sendToQueue('CARD-SEARCH-USER-GET', Buffer.from(JSON.stringify(keywords)));
      await channel.consume('CARD-SEARCH-USER-INFO', (info) => {
        const searchUser = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeSearch', searchUser);
      });
      setTimeout(() => eventEmitter.emit('consumeSearch'), 10000);
      const userSearch = await new Promise((resolve) => { eventEmitter.once('consumeSearch', resolve); });

      // setup search apartment
      await channel.sendToQueue('CARD-SEARCH-APARTMENT-GET', Buffer.from(JSON.stringify({ keywords, projectId })));
      await channel.consume('CARD-SEARCH-APARTMENT-INFO', (info) => {
        const searchApartment = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeSearch', searchApartment);
      });
      setTimeout(() => eventEmitter.emit('consumeSearch'), 10000);
      const apartmentSearch = await new Promise((resolve) => { eventEmitter.once('consumeSearch', resolve); });

      // setup search vehicle type
      const type = new RegExp(keywords, 'i');
      let vehicleType;
      if (type.test('xe máy')) { vehicleType = 'MOTOR'; }
      if (type.test('ô tô')) { vehicleType = 'CAR'; }
      if (type.test('xe đạp')) { vehicleType = 'BICYCLE'; }

      query.$or = [
        { codeCard: { $regex: keywords, $options: 'i' } },
        { licensePlate: { $regex: keywords, $options: 'i' } },
        { vehicleType },
        { vehicleName: { $regex: keywords, $options: 'i' } },
        { vehicleColor: { $regex: keywords, $options: 'i' } },
        { registrationDate: date },
        { parking: parkingSearch },
        { userId: { $in: userSearch } },
        { apartmentId: { $in: apartmentSearch } },
      ];
    }

    const card = await VehicleCard.find(query)
      .populate('parking')
      .sort({ _id: -1 })
      .select('-__v -idDeleted -createdBy -createdAt')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    // get info user
    const user = Array.from(card, ({ userId }) => userId);
    await channel.sendToQueue('CARD-USER-GET', Buffer.from(JSON.stringify(user)));
    await channel.consume('CARD-USER-INFO', (userList) => {
      const dataUser = JSON.parse(userList.content);
      channel.ack(userList);
      eventEmitter.emit('listUser', dataUser);
    });
    setTimeout(() => eventEmitter.emit('listUser'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('listUser', resolve); });

    // get info apartment
    const apartment = Array.from(card, ({ apartmentId }) => apartmentId);
    await channel.sendToQueue('CARD-APARTMENT-GET', Buffer.from(JSON.stringify(apartment)));
    await channel.consume('CARD-APARTMENT-INFO', (blockList) => {
      const dataApartment = JSON.parse(blockList.content);
      channel.ack(blockList);
      eventEmitter.emit('consumeBlockList', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('consumeBlockList'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('consumeBlockList', resolve); });
    const total = await VehicleCard.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    // format data
    card.map((item) => {
      if (apartmentData) {
        item._doc.apartment = {
          name: apartmentData[item.apartmentId].apartmentCode,
          block: apartmentData[item.apartmentId].block.name,
        };
      }
      if (userData) {
        item._doc.subscribers = {
          name: userData[item.userId].name,
          phone: userData[item.userId].phone,
        };
      }
      item._doc.parking = item.parking.name;
      delete item._doc.userId;
      delete item._doc.apartmentId;
      return item;
    });

    const data = {};
    data.info = card ?? [];
    data.totalCard = await VehicleCard.countDocuments({ projectId, status: 'DONE' });
    data.totalMotor = await VehicleCard.countDocuments({ projectId, status: 'DONE', vehicleType: 'MOTOR' });
    data.totalCar = await VehicleCard.countDocuments({ projectId, status: 'DONE', vehicleType: 'CAR' });
    data.totalBicycle = data.totalCard - (data.totalMotor + data.totalCar);

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

exports.detailVehicleCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const detail = await VehicleCard.findById(cardId)
      .select('-__v -updatedBy -createdBy')
      .populate('parking');

    if (!detail) {
      return res.status(400).send({
        success: false,
        error: 'Thẻ xe không tồn tại!',
      });
    }

    // get info user
    await channel.sendToQueue('CARD-DETAIL-USER-GET', Buffer.from(JSON.stringify(detail.userId)));
    await channel.consume('CARD-DETAIL-USER-INFO', (userDetail) => {
      const dataUser = JSON.parse(userDetail.content);
      channel.ack(userDetail);
      eventEmitter.emit('dataUser', dataUser);
    });
    setTimeout(() => eventEmitter.emit('dataUser'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('dataUser', resolve); });

    // get info apartment
    await channel.sendToQueue('CARD-DETAIL-APARTMENT-GET', Buffer.from(JSON.stringify(detail.apartmentId)));
    await channel.consume('CARD-DETAIL-APARTMENT-INFO', (apartmentDetail) => {
      const dataApartment = JSON.parse(apartmentDetail.content);
      channel.ack(apartmentDetail);
      eventEmitter.emit('dataApartment', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('dataApartment'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('dataApartment', resolve); });

    // get info fee vehicle
    let feeVehicle = 0;
    if (detail.vehicleType !== 'BICYCLE' && detail.tariff) {
      await channel.sendToQueue('CARD-DETAIL-FEE-GET', Buffer.from(JSON.stringify({ projectId: detail.projectId, vehicleType: detail.vehicleType })));
      await channel.consume('CARD-DETAIL-FEE-INFO', (apartmentDetail) => {
        const dataFee = JSON.parse(apartmentDetail.content);
        channel.ack(apartmentDetail);
        eventEmitter.emit('dataFee', dataFee);
      });
      setTimeout(() => eventEmitter.emit('dataFee'), 10000);
      const feeData = await new Promise((resolve) => { eventEmitter.once('dataFee', resolve); });
      feeVehicle = feeData;
    }

    // format data
    if (apartmentData) {
      detail._doc.apartment = {
        name: apartmentData.apartmentCode,
        block: apartmentData.block.name,
      };
      detail._doc.parking = detail.parking.name;
    }
    if (userData) {
      detail._doc.subscribers = {
        name: userData.name,
        phone: userData.phone,
      };
    }
    detail._doc.vehicleFee = feeVehicle;
    delete detail._doc.userId;
    delete detail._doc.apartmentId;

    return res.status(200).send({
      success: true,
      data: detail,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.listVehicleCardOfUser = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const { apartmentId, status } = req.query;

    const query = { userId, apartmentId };
    if (status) { query.status = status; }

    const card = await VehicleCard.find(query)
      .sort({ _id: -1 })
      .select('licensePlate vehicleBrand vehicleType vehicleColor status')
      .lean();

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
