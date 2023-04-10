/* eslint-disable max-len */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-mixed-operators */
/* eslint-disable array-callback-return */
/* eslint-disable no-unused-expressions */
/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
const EventEmitter = require('events');
const logger = require('../utils/logger');
const Fee = require('../models/fee');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');
const FeeType = require('../models/feeType');
const FeeConfig = require('../models/feeConfig');
const Order = require('../models/order');

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('FEE-SEARCH-APARTMENT-INFO');
  await channel.assertQueue('FEE-SEARCH-USER-INFO');
  await channel.assertQueue('FEE-APARTMENT-INFO');
  await channel.assertQueue('FEE-CREATE-APARTMENT-INFO');
  await channel.assertQueue('FEE-USER-INFO');
  await channel.assertQueue('FEE-CREATE-VEHICLE-APARTMENT-INFO');
  await channel.assertQueue('FEE-CARD-VEHICLE-INFO');
  await channel.assertQueue('FEE-DETAIL-VEHICLE-INFO');
  await channel.assertQueue('FEE-DETAIL-VEHICLE-GET');
  await channel.assertQueue('FEE-WATER-APARTMENT-INFO');
  await channel.assertQueue('FILE-DATA-EXCEL');
  await channel.assertQueue('FEE-FILTER-BLOCK-INFO');
};
connectRabbit();

const surchargeFile = (data) => {
  try {
    const { file } = data;
    const surcharge = [
      {
        isPercent: true,
        name: 'VAT',
        value: file['% VAT'],
      },
      {
        isPercent: true,
        name: 'BVMT',
        value: file['% BVMT'],
      },
      {
        isPercent: true,
        name: 'Phí hao hụt',
        value: file['% Phí hao hụt'],
      },
    ];
    return surcharge;
  } catch (error) {
    logger.error(error);
    return [];
  }
};

const levelFile = (data) => {
  try {
    const { file, feeType } = data;
    let level;
    if (feeType === 'WATER') {
      level = [
        {
          name: 'Bậc 1',
          from: 0,
          to: file.SH1,
          price: file['Đơn giá SH1'],
        },
        {
          name: 'Bậc 2',
          from: file.SH1 + 1,
          to: file.SH1 + file.SH2,
          price: file['Đơn giá SH2'],
        },
        {
          name: 'Bậc 3',
          from: file.SH1 + file.SH2 + 1,
          to: file.SH1 + file.SH2 + file.SH3,
          price: file['Đơn giá SH3'],
        },
        {
          name: 'Bậc 4',
          from: file.SH1 + file.SH2 + file.SH3 + 1,
          to: null,
          price: file['Đơn giá SH4'],
        },
      ];
    }
    if (feeType === 'ELECTRIC') {
      level = [
        {
          name: 'Bậc 1',
          from: 0,
          to: file.SH1,
          price: file['Đơn giá SH1'],
        },
        {
          name: 'Bậc 2',
          from: file.SH1 + 1,
          to: file.SH1 + file.SH2,
          price: file['Đơn giá SH2'],
        },
        {
          name: 'Bậc 3',
          from: file.SH1 + file.SH2 + 1,
          to: file.SH1 + file.SH2 + file.SH3,
          price: file['Đơn giá SH3'],
        },
        {
          name: 'Bậc 4',
          from: file.SH1 + file.SH2 + file.SH3 + 1,
          to: file.SH1 + file.SH2 + file.SH3 + file.SH4,
          price: file['Đơn giá SH4'],
        },
        {
          name: 'Bậc 5',
          from: file.SH1 + file.SH2 + file.SH3 + file.SH4 + 1,
          to: file.SH1 + file.SH2 + file.SH3 + file.SH4 + file.SH5,
          price: file['Đơn giá SH5'],
        },
        {
          name: 'Bậc 6',
          from: file.SH1 + file.SH2 + file.SH3 + file.SH4 + file.SH5 + 1,
          to: null,
          price: file['Đơn giá SH6'],
        },
      ];
    }
    return level;
  } catch (error) {
    logger.error(error);
    return [];
  }
};

const checkDataFeeMonth = async (data) => {
  try {
    const check = await Fee.find({
      month: data.month,
      projectId: data.projectId,
      feeTypeId: data.feeTypeId,
    });
    if (check.length > 0) {
      return check;
    }
    return [];
  } catch (error) {
    logger.error(error);
    return [];
  }
};

const prepareTheBill = (data) => {
  try {
    const { consumption, feeConfig } = data;
    if (feeConfig.surcharge.length > 0) {
      let price = consumption * feeConfig.price;
      feeConfig.surcharge.map((element) => {
        if (element.isPercent) {
          price = (price / 100).toFixed(1) * element.value + price;
        } else {
          price += element.value;
        }
      });
      return price;
    }
    return consumption * feeConfig.price;
  } catch (error) {
    logger.error(error);
    return 0;
  }
};

const prepareTheBillVehicle = (data) => {
  try {
    let price = 0;
    let invoiceTotal = 0;
    const {
      vehicleMotor, apartmentId, vehicleCar, dataFeeConfig,
    } = data;
    if (vehicleMotor && vehicleMotor[apartmentId]) {
      price += dataFeeConfig.MOTOR.price * vehicleMotor[apartmentId].count;
    }
    if (vehicleCar && vehicleCar[apartmentId]) {
      price += dataFeeConfig.CAR.price * vehicleCar[apartmentId].count;
    }
    invoiceTotal = price;
    if (
      vehicleMotor
    && vehicleMotor[apartmentId]
    && dataFeeConfig.MOTOR.surcharge.length > 0
    ) {
      dataFeeConfig.MOTOR.surcharge.map((element) => {
        if (element.isPercent) {
          invoiceTotal = ((dataFeeConfig.MOTOR.price / 100).toFixed(1) * element.value) * vehicleMotor[apartmentId].count + invoiceTotal;
        } else {
          invoiceTotal += (element.value) * vehicleMotor[apartmentId].count;
        }
      });
    }
    if (
      vehicleCar
    && vehicleCar[apartmentId]
    && dataFeeConfig.CAR.surcharge.length > 0
    ) {
      dataFeeConfig.CAR.surcharge.map((element) => {
        if (element.isPercent) {
          invoiceTotal = ((dataFeeConfig.CAR.price / 100).toFixed(1) * element.value) * vehicleCar[apartmentId].count + invoiceTotal;
        } else {
          invoiceTotal += (element.value) * vehicleCar[apartmentId].count;
        }
      });
    }
    return { invoiceTotal, price };
  } catch (error) {
    logger.error(error);
    return { invoiceTotal: 0, price: 0 };
  }
};

const prepareTheBillVehicleOrder = (data) => {
  try {
    let price = 0;
    let invoiceTotal = 0;
    const { dataFeeConfig, vehicle } = data;
    if (vehicle === 'CAR') {
      price = dataFeeConfig.CAR.price;
      invoiceTotal = price;
      if (dataFeeConfig.CAR.surcharge.length > 0) {
        dataFeeConfig.CAR.surcharge.map((x) => {
          if (x.isPercent) {
            invoiceTotal = (price / 100).toFixed(1) * x.value + invoiceTotal;
          } else {
            invoiceTotal += x.value;
          }
        });
      }
    }
    if (vehicle === 'MOTOR') {
      price = dataFeeConfig.MOTOR.price;
      invoiceTotal = price;
      if (dataFeeConfig.MOTOR.surcharge.length > 0) {
        dataFeeConfig.MOTOR.surcharge.map((x) => {
          if (x.isPercent) {
            invoiceTotal = (price / 100).toFixed(1) * x.value + invoiceTotal;
          } else {
            invoiceTotal += x.value;
          }
        });
      }
    }
    return { invoiceTotal: invoiceTotal !== 0 ? invoiceTotal : price, price };
  } catch (error) {
    logger.error(error);
    return { invoiceTotal: 0, price: 0 };
  }
};

const paymentOfElectricityAndWater = (data) => {
  try {
    let countPrice = 0;
    let invoiceTotal = 0;
    const { feeConfig, consumption } = data;
    feeConfig.level.map((element) => {
      if (consumption > element.from) {
        if (!element.to) {
          countPrice += (consumption - element.from + 1) * element.price;
        } else if (consumption <= element.to) {
          countPrice += (consumption - element.from + 1) * element.price;
        } else if (element.from === 0) {
          countPrice += (element.to - element.from) * element.price;
        } else {
          countPrice += (element.to - element.from + 1) * element.price;
        }
      }
    });
    if (feeConfig.surcharge.length > 0) {
      invoiceTotal = countPrice;
      feeConfig.surcharge.map((x) => {
        if (x.isPercent) {
          invoiceTotal = (countPrice / 100).toFixed(1) * x.value + invoiceTotal;
        } else {
          invoiceTotal += x.value;
        }
      });
    } else { invoiceTotal = countPrice; }
    return { countPrice, invoiceTotal };
  } catch (error) {
    logger.error(error);
    return { countPrice: 0, invoiceTotal: 0 };
  }
};

exports.listFee = async (req, res) => {
  try {
    const {
      projectId, feeTypeId, blockId, apartment, keywords, limit, page, month,
    } = req.query;
    const perPage = parseInt(limit || 7);
    const currentPage = parseInt(page || 1);
    const query = { projectId };
    let vehicleCard;
    let listUserId = [];
    let orderVehicle;
    const feeType = await FeeType.findById(feeTypeId);
    if (feeTypeId) {
      query.feeTypeId = feeTypeId;
      if (feeType.name === 'VEHICLE') {
        await channel.sendToQueue('FEE-DETAIL-VEHICLE-GET', Buffer.from(JSON.stringify(projectId)));
        await channel.consume('FEE-DETAIL-VEHICLE-INFO', (info) => {
          const dataVehicle = JSON.parse(info.content);
          channel.ack(info);
          eventEmitter.emit('consumeCardVehicleDone', dataVehicle);
        });
        setTimeout(() => eventEmitter.emit('consumeCardVehicleDone'), 10000);
        vehicleCard = await new Promise((resolve) => { eventEmitter.once('consumeCardVehicleDone', resolve); });

        const vehicleOrder = await Order.find({
          projectId,
          feeTypeId,
        });
        orderVehicle = Array.from(vehicleOrder, ({ vehicleId }) => vehicleId);
      }
    }
    let listIdApartment = [];
    if (blockId) {
      await channel.sendToQueue('FEE-FILTER-BLOCK-GET', Buffer.from(JSON.stringify(blockId)));
      await channel.consume('FEE-FILTER-BLOCK-INFO', (info) => {
        const listApartmentId = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('blockDone', listApartmentId);
      });
      setTimeout(() => eventEmitter.emit('blockDone'), 10000);
      listIdApartment = await new Promise((resolve) => { eventEmitter.once('blockDone', resolve); });
      if (listIdApartment.length > 0) {
        query.apartmentId = { $in: listIdApartment };
      }
      if (apartment) {
        query.apartmentId = apartment;
      }
    }
    if (blockId && listIdApartment.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'Block này không có căn hộ!',
      });
    }
    if (month) {
      query.month = month;
    }
    if (keywords) {
      // setup search user
      await channel.sendToQueue('FEE-SEARCH-USER-GET', Buffer.from(JSON.stringify(keywords)));
      await channel.consume('FEE-SEARCH-USER-INFO', (searchUser) => {
        const userIdList = JSON.parse(searchUser.content);
        channel.ack(searchUser);
        eventEmitter.emit('consumeUser', userIdList);
      });
      setTimeout(() => eventEmitter.emit('consumeUser'), 10000);
      const idListUser = await new Promise((resolve) => { eventEmitter.once('consumeUser', resolve); });
      const dataUserId = Array.from(idListUser, ({ _id }) => _id);

      // setup search apartment
      await channel.sendToQueue('FEE-SEARCH-APARTMENT-GET', Buffer.from(JSON.stringify({ dataUserId, keywords, projectId })));
      await channel.consume('FEE-SEARCH-APARTMENT-INFO', (searchApartment) => {
        const apartmentIdList = JSON.parse(searchApartment.content);
        channel.ack(searchApartment);
        eventEmitter.emit('consumeDone', apartmentIdList);
      });
      setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
      const ListIdApartment = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });

      query.$or = [
        { $expr: { $regexMatch: { input: { $toString: '$consumption' }, regex: keywords } } },
        { apartmentId: { $in: ListIdApartment } },
        { createdBy: { $in: dataUserId } },
      ];
    }

    let listFee = await Fee.find(query)
      .sort({ deviceId: 1, _id: -1 })
      .select('-__v -updatedBy -projectId -month')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const total = await Fee.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);
    if (listFee.length > 0) {
      // Get apartment information
      const apartmentListId = Array.from(listFee, ({ apartmentId }) => apartmentId);
      await channel.sendToQueue('FEE-APARTMENT-GET', Buffer.from(JSON.stringify(apartmentListId)));
      await channel.consume('FEE-APARTMENT-INFO', (info) => {
        const apartmentData = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeDoneApartment', apartmentData);
      });
      setTimeout(() => eventEmitter.emit('consumeDoneApartment'), 10000);
      const dataApartment = await new Promise((resolve) => { eventEmitter.once('consumeDoneApartment', resolve); });
      const listApartmentId = Array.from(listFee, ({ apartmentId }) => apartmentId);
      listApartmentId.map((item) => {
        // Get a list of car owners
        if (vehicleCard && vehicleCard[item] && vehicleCard[item].vehicles) {
          const vehicle = vehicleCard[item].vehicles;
          listUserId = listUserId.concat(Array.from(vehicle, ({ userId }) => userId));
        }
        // Get the list of owner ID
        if (dataApartment[item] && dataApartment[item].owner) {
          const { owner } = dataApartment[item];
          listUserId.push(owner);
        }
        return item;
      });

      // Get user information
      listUserId = listUserId.concat(Array.from(listFee, ({ createdBy }) => createdBy));
      await channel.sendToQueue('FEE-USER-GET', Buffer.from(JSON.stringify(listUserId)));
      await channel.consume('FEE-USER-INFO', (info) => {
        const userData = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeDoneUser', userData);
      });
      setTimeout(() => eventEmitter.emit('consumeDoneUser'), 10000);
      const dataUser = await new Promise((resolve) => { eventEmitter.once('consumeDoneUser', resolve); });

      // format data
      if (Object.values(dataApartment).length > 0) {
        if (feeType.name === 'VEHICLE') {
          listFee = listFee.filter((item) => item.consumption > 0 || item.deviceId);
        }
        listFee.map((item) => {
          item._doc.apartment = {
            name: dataApartment[item.apartmentId].apartmentCode,
            owner: {
              name: dataUser[dataApartment[item.apartmentId].owner].fullName,
              phone: dataUser[dataApartment[item.apartmentId].owner].phone,
            },
            block: dataApartment[item.apartmentId].block.name,
            floor: dataApartment[item.apartmentId].floor.name,
          };
          item._doc.createdBy = {
            name: dataUser[item.createdBy].fullName,
            phone: dataUser[item.createdBy].phone,
          };
          if (vehicleCard && vehicleCard[item.apartmentId] && vehicleCard[item.apartmentId].vehicles) {
            vehicleCard[item.apartmentId].vehicles.map((element) => {
              element.userId = {
                name: dataUser[element.userId].fullName,
                phone: dataUser[element.userId].phone,
              };
              delete element.vehicleLicense;
              delete element.projectId;
              delete element.__v;
              delete element.tariff;
              delete element.status;
              delete element.isDeleted;
              delete element.apartmentId;
              return element;
            });
            item._doc.vehicleCard = vehicleCard[item.apartmentId].vehicles.filter((x) => orderVehicle.includes(x.cardCode));
            delete item._doc.apartmentId;
          }
          return item;
        });
      }
    }

    return res.status(200).send({
      success: true,
      data: listFee,
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

exports.createFeeApartment = async (req, res) => {
  try {
    const feeApartmentIns = req.body;
    const month = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
    const userId = req.headers.userid;

    // Check fee config
    const feeConfig = await FeeConfig.findOne({
      feeTypeId: feeApartmentIns.feeTypeId, projectId: feeApartmentIns.projectId,
    });
    if (!feeConfig) {
      return res.status(400).send({
        success: false,
        error: 'Chưa cấu hình biểu phí cho phí quản lý!',
      });
    }

    // Get apartment information
    await channel.sendToQueue('FEE-CREATE-APARTMENT-GET', Buffer.from(JSON.stringify(feeApartmentIns.projectId)));
    await channel.consume('FEE-CREATE-APARTMENT-INFO', (info) => {
      const dataApartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeCreateFee', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('consumeCreateFee'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('consumeCreateFee', resolve); });
    const apartmentDataKey = apartmentData.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});

    if (apartmentData.length === 0) {
      return res.status(400).send({
        success: true,
        error: 'Dự án này chưa có căn hộ nào!',
      });
    }
    const listApartmentIdPresent = Array.from(apartmentData, ({ _id }) => _id.toString());

    // Check fee
    const checkDataFeeApartmentMonth = await checkDataFeeMonth({
      month,
      projectId: feeApartmentIns.projectId,
      feeTypeId: feeApartmentIns.feeTypeId,
    });

    let listApartmentIdCreate;
    if (checkDataFeeApartmentMonth === 0) {
      listApartmentIdCreate = listApartmentIdPresent;
    } else {
      const listApartmentIdInFeeOld = Array.from(checkDataFeeApartmentMonth, ({ apartmentId }) => apartmentId.toString());
      listApartmentIdCreate = listApartmentIdPresent.filter((item) => !listApartmentIdInFeeOld.includes(item));

      // update fee
      const ListFeeUpdate = checkDataFeeApartmentMonth.map((item) => ({
        updateOne: {
          filter: { _id: item._id, sent: false },
          update: {
            $set: {
              consumption: apartmentDataKey[item.apartmentId] ? apartmentDataKey[item.apartmentId].areaApartment : item.consumption,
              price: prepareTheBill({ consumption: apartmentDataKey[item.apartmentId] ? apartmentDataKey[item.apartmentId].areaApartment : item.consumptions, feeConfig }),
              updatedBy: userId,
              updatedAt: new Date().valueOf(),
              blockId: apartmentDataKey[item.apartmentId] ? apartmentDataKey[item.apartmentId].block : item.blockId,
            },
          },
        },
      }));
      await Fee.bulkWrite(ListFeeUpdate);

      // Update Order
      const order = await Order.find({
        status: 'UNSENT',
        month,
        projectId: feeApartmentIns.projectId,
        feeTypeId: feeApartmentIns.feeTypeId,
      });
      const ListOrderUpdate = order.map((item) => ({
        updateOne: {
          filter: { _id: item._id },
          update: {
            $set: {
              invoiceTotal: prepareTheBill({
                consumption: apartmentDataKey[item.apartmentId] ? apartmentDataKey[item.apartmentId].areaApartment : item.consumption, feeConfig,
              }),
              consumption: apartmentDataKey[item.apartmentId] ? apartmentDataKey[item.apartmentId].areaApartment : item.consumption,
              subTotal: feeConfig.price * (apartmentDataKey[item.apartmentId] ? apartmentDataKey[item.apartmentId].areaApartment : item.consumption),
              surcharge: feeConfig.surcharge.length > 0 ? feeConfig.surcharge : [],
              price: feeConfig.price,
              confirm: true,
              updatedBy: userId,
              updatedAt: new Date().valueOf(),
              blockId: apartmentDataKey[item.apartmentId] ? apartmentDataKey[item.apartmentId].block : item.blockId,
            },
          },
        },
      }));
      await Order.bulkWrite(ListOrderUpdate);
    }

    if (listApartmentIdCreate.length > 0) {
      const listFeeCreate = apartmentData.filter((item) => listApartmentIdCreate.includes(item._id.toString()));
      // create fee
      listFeeCreate.map((item) => {
        item.projectId = feeApartmentIns.projectId;
        item.feeTypeId = feeApartmentIns.feeTypeId;
        item.apartmentId = item._id;
        item.blockId = item.block;
        item.consumption = item.areaApartment;
        item.month = month;
        item.createdBy = userId;
        item.updatedBy = userId;
        item.createdAt = new Date().valueOf();
        item.updatedAt = new Date().valueOf();
        if (feeConfig.surcharge.length > 0) {
          let price = item.areaApartment * feeConfig.price;
          feeConfig.surcharge.map((element) => {
            if (element.isPercent) {
              price = (price / 100).toFixed(1) * element.value + price;
            } else {
              price += element.value;
            }
          });
          item.price = price;
        } else {
          item.price = item.areaApartment * feeConfig.price;
        }
        delete item._id;
        delete item.areaApartment;
        return item;
      });
      const dataFee = await Fee.insertMany(listFeeCreate);

      // create order
      dataFee.map((item) => {
        item._doc.feeId = item._id;
        item._doc.invoiceTotal = item.price;
        item._doc.price = feeConfig.price;
        item._doc.subTotal = feeConfig.price * item.consumption;
        item._doc.confirm = true;
        if (feeConfig.surcharge.length > 0) {
          item._doc.surcharge = feeConfig.surcharge;
        }
      });
      await Order.insertMany(dataFee);
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

exports.createFeeVehicle = async (req, res) => {
  try {
    const feeVehicleIns = req.body;
    const month = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
    const createdBy = req.headers.userid;

    // kiểm tra đã cấu hình phí này hay chưa
    const feeConfig = await FeeConfig.find({
      feeTypeId: feeVehicleIns.feeTypeId, projectId: feeVehicleIns.projectId,
    });
    if (feeConfig.length !== 2) {
      return res.status(400).send({
        success: false,
        error: 'Chưa cấu hình biểu phí cho phương tiện !',
      });
    }

    // Get apartment information
    await channel.sendToQueue('FEE-CREATE-VEHICLE-APARTMENT-GET', Buffer.from(JSON.stringify(feeVehicleIns.projectId)));
    await channel.consume('FEE-CREATE-VEHICLE-APARTMENT-INFO', (info) => {
      const dataApartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeCreateFeeVehicle', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('consumeCreateFeeVehicleIns'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('consumeCreateFeeVehicle', resolve); });

    // Get car card information
    await channel.sendToQueue('FEE-CARD-VEHICLE-GET', Buffer.from(JSON.stringify(feeVehicleIns.projectId)));
    await channel.consume('FEE-CARD-VEHICLE-INFO', (info) => {
      const dataVehicle = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeCardVehicle', dataVehicle);
    });
    setTimeout(() => eventEmitter.emit('consumeCardVehicle'), 10000);
    const vehicleCard = await new Promise((resolve) => { eventEmitter.once('consumeCardVehicle', resolve); });

    // data config motor
    let vehicleMotor;
    if (vehicleCard.vehicleMotor.length > 0) {
      vehicleMotor = vehicleCard.vehicleMotor.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
    }

    // data config car
    let vehicleCar;
    if (vehicleCard.vehicleCar.length > 0) {
      vehicleCar = vehicleCard.vehicleCar.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
    }

    // data config car
    let listVehicle;
    if (vehicleCard.vehicleData.length > 0) {
      listVehicle = vehicleCard.vehicleData.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
    }

    // data config
    const dataFeeConfig = feeConfig.reduce((acc, cur) => {
      const id = cur.vehicle;
      return { ...acc, [id]: cur };
    }, {});

    if (vehicleCard.vehicle.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'Chưa có căn hộ nào trong dự án này đăng ký thẻ xe!',
      });
    }
    const vehicle = vehicleCard.vehicle.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});
    const listApartmentIdPresent = Object.keys(apartmentData);

    // Check fee
    const checkDataFeeVehicleMonth = await checkDataFeeMonth({
      month,
      projectId: feeVehicleIns.projectId,
      feeTypeId: feeVehicleIns.feeTypeId,
    });
    const dataVehicleInFeeMonth = checkDataFeeVehicleMonth.reduce((acc, cur) => {
      const id = cur.apartmentId;
      return { ...acc, [id]: cur };
    }, {});

    let listApartmentIdCreate;
    if (checkDataFeeVehicleMonth.length === 0) {
      listApartmentIdCreate = listApartmentIdPresent;
    } else {
      const listApartmentIdInFeeOld = Array.from(checkDataFeeVehicleMonth, ({ apartmentId }) => apartmentId.toString());
      listApartmentIdCreate = listApartmentIdPresent.filter((item) => !listApartmentIdInFeeOld.includes(item));

      // update fee
      const ListFeeUpdate = checkDataFeeVehicleMonth.map((item) => ({
        updateOne: {
          filter: { _id: item._id, sent: false },
          update: {
            $set: {
              price: prepareTheBillVehicle({
                apartmentId: item.apartmentId,
                vehicleMotor: vehicleMotor || null,
                vehicleCar: vehicleCar || null,
                dataFeeConfig,
              }).invoiceTotal,
              consumption: vehicle[item.apartmentId] ? vehicle[item.apartmentId].count : 0,
              updatedAt: new Date().valueOf(),
              updatedBy: createdBy,
              blockId: apartmentData[item.apartmentId] ? apartmentData[item.apartmentId].block : item.blockId,
            },
          },
        },
      }));
      await Fee.bulkWrite(ListFeeUpdate);

      // update order
      const order = await Order.find({
        status: 'UNSENT',
        month,
        projectId: feeVehicleIns.projectId,
        feeTypeId: feeVehicleIns.feeTypeId,
      });
      // create order
      const listApartmentIdUpdate = listApartmentIdPresent.filter((item) => listApartmentIdInFeeOld.includes(item) && dataVehicleInFeeMonth[item].sent === false);
      const listVehicleId = Array.from(order, ({ vehicleId }) => vehicleId);
      let listOrderVehicleCreate = [];
      listApartmentIdUpdate.map((item) => {
        if (listVehicle[item] && listVehicle[item].vehicles) {
          const listVehicleNew = listVehicle[item].vehicles.filter((element) => !listVehicleId.includes(element.cardCode));
          listOrderVehicleCreate = listOrderVehicleCreate.concat(listVehicleNew);
        }
      });
      if (listOrderVehicleCreate.length > 0) {
        const listVehicleCreate = [];
        listOrderVehicleCreate.map((item) => {
          if (dataVehicleInFeeMonth[item.apartmentId]) {
            const vehicleCreate = {
              feeId: dataVehicleInFeeMonth[item.apartmentId]._id,
              projectId: feeVehicleIns.projectId,
              feeTypeId: feeVehicleIns.feeTypeId,
              apartmentId: item.apartmentId,
              blockId: apartmentData[item.apartmentId].block,
              month,
              confirm: true,

            };
            vehicleCreate.vehicleId = item.cardCode;
            let price = 0;
            let invoiceTotal = 0;
            if (item.vehicleType === 'CAR') {
              price = dataFeeConfig.CAR.price;
              invoiceTotal = price;
              vehicleCreate.vehicle = 'CAR';
              if (dataFeeConfig.CAR.surcharge.length > 0) {
                vehicleCreate.surcharge = dataFeeConfig.CAR.surcharge;
                dataFeeConfig.CAR.surcharge.map((x) => {
                  if (x.isPercent) {
                    invoiceTotal = (price / 100).toFixed(1) * x.value + invoiceTotal;
                  } else {
                    invoiceTotal += x.value;
                  }
                });
              }
            }
            if (item.vehicleType === 'MOTOR') {
              vehicleCreate.vehicle = 'MOTOR';
              price = dataFeeConfig.MOTOR.price;
              invoiceTotal = price;
              if (dataFeeConfig.MOTOR.surcharge.length > 0) {
                vehicleCreate.surcharge = dataFeeConfig.MOTOR.surcharge;
                dataFeeConfig.MOTOR.surcharge.map((x) => {
                  if (x.isPercent) {
                    invoiceTotal = (price / 100).toFixed(1) * x.value + invoiceTotal;
                  } else {
                    invoiceTotal += x.value;
                  }
                });
              }
            }
            vehicleCreate.price = price;
            vehicleCreate.subTotal = price;
            vehicleCreate.consumption = 1;
            vehicleCreate.invoiceTotal = invoiceTotal !== 0 ? invoiceTotal : price;
            vehicleCreate.createdAt = new Date().valueOf();
            vehicleCreate.createdBy = createdBy;
            listVehicleCreate.push(vehicleCreate);
          }
        });
        if (listVehicleCreate.length > 0) {
          await Order.insertMany(listVehicleCreate);
        }
      }

      const ListOrderUpdate = order.map((item) => ({
        updateOne: {
          filter: { _id: item._id },
          update: {
            $set: {
              invoiceTotal: prepareTheBillVehicleOrder({
                vehicle: item.vehicle,
                dataFeeConfig,
              }).invoiceTotal,
              subTotal: prepareTheBillVehicleOrder({
                vehicle: item.vehicle,
                dataFeeConfig,
              }).price,
              blockId: apartmentData[item.apartmentId] ? apartmentData[item.apartmentId].block : item.blockId,
              surcharge:
              item.vehicle === 'MOTOR'
                ? dataFeeConfig.MOTOR.surcharge.length > 0 ? dataFeeConfig.MOTOR.surcharge : []
                : dataFeeConfig.CAR.surcharge.length > 0 ? dataFeeConfig.CAR.surcharge : [],
              priceCar: dataFeeConfig.CAR.price,
              confirm: true,
              updatedAt: new Date().valueOf(),
              updatedBy: createdBy,
            },
          },
        },
      }));
      await Order.bulkWrite(ListOrderUpdate);
    }

    if (listApartmentIdCreate.length > 0) {
      const listFeeCreate = vehicleCard.vehicle.filter((item) => listApartmentIdCreate.includes(item._id.toString()));
      // format data and create fee
      if (listFeeCreate.length > 0) {
        listFeeCreate.map((item) => {
          item.projectId = feeVehicleIns.projectId;
          item.feeTypeId = feeVehicleIns.feeTypeId;
          item.apartmentId = item._id;
          item.blockId = apartmentData[item._id].block;
          item.consumption = item.count;
          item.month = month;

          let price = 0;
          let invoiceTotal = 0;
          if (vehicleMotor && vehicleMotor[item._id]) {
            price += dataFeeConfig.MOTOR.price * vehicleMotor[item._id].count;
          }
          if (vehicleCar && vehicleCar[item._id]) {
            price += dataFeeConfig.CAR.price * vehicleCar[item._id].count;
          }
          invoiceTotal = price;
          if (vehicleMotor && vehicleMotor[item._id] && dataFeeConfig.MOTOR.surcharge.length > 0) {
            dataFeeConfig.MOTOR.surcharge.map((element) => {
              if (element.isPercent) {
                invoiceTotal = ((dataFeeConfig.MOTOR.price / 100).toFixed(1) * element.value) * vehicleMotor[item._id].count + invoiceTotal;
              } else {
                invoiceTotal += (element.value) * vehicleMotor[item._id].count;
              }
            });
          }
          if (vehicleCar && vehicleCar[item._id] && dataFeeConfig.CAR.surcharge.length > 0) {
            dataFeeConfig.CAR.surcharge.map((element) => {
              if (element.isPercent) {
                invoiceTotal = ((dataFeeConfig.CAR.price / 100).toFixed(1) * element.value) * vehicleCar[item._id].count + invoiceTotal;
              } else {
                invoiceTotal += (element.value) * vehicleCar[item._id].count;
              }
            });
          }

          item.price = invoiceTotal;
          item.createdBy = createdBy;
          item.createdAt = new Date().valueOf();
          item.updatedAt = new Date().valueOf();
          delete item._id;
          delete item.count;
          return item;
        });
        const dataFee = await Fee.insertMany(listFeeCreate);

        // create order
        const listVehicleCreate = [];
        dataFee.map((item) => {
          listVehicle[item.apartmentId].vehicles.map((element) => {
            const vehicleCreate = {
              feeId: item._id,
              projectId: item.projectId,
              feeTypeId: item.feeTypeId,
              apartmentId: item.apartmentId,
              blockId: item.blockId,
              month,
              confirm: true,

            };
            vehicleCreate.vehicleId = element.cardCode;
            let price = 0;
            let invoiceTotal = 0;
            if (element.vehicleType === 'CAR') {
              price = dataFeeConfig.CAR.price;
              invoiceTotal = price;
              vehicleCreate.vehicle = 'CAR';
              if (dataFeeConfig.CAR.surcharge.length > 0) {
                vehicleCreate.surcharge = dataFeeConfig.CAR.surcharge;
                dataFeeConfig.CAR.surcharge.map((x) => {
                  if (x.isPercent) {
                    invoiceTotal = (price / 100).toFixed(1) * x.value + invoiceTotal;
                  } else {
                    invoiceTotal += x.value;
                  }
                });
              }
            }
            if (element.vehicleType === 'MOTOR') {
              vehicleCreate.vehicle = 'MOTOR';
              price = dataFeeConfig.MOTOR.price;
              invoiceTotal = price;
              if (dataFeeConfig.MOTOR.surcharge.length > 0) {
                vehicleCreate.surcharge = dataFeeConfig.MOTOR.surcharge;
                dataFeeConfig.MOTOR.surcharge.map((x) => {
                  if (x.isPercent) {
                    invoiceTotal = (price / 100).toFixed(1) * x.value + invoiceTotal;
                  } else {
                    invoiceTotal += x.value;
                  }
                });
              }
            }
            vehicleCreate.price = price;
            vehicleCreate.subTotal = price;
            vehicleCreate.consumption = 1;
            vehicleCreate.invoiceTotal = invoiceTotal !== 0 ? invoiceTotal : price;
            vehicleCreate.createdAt = new Date().valueOf();
            vehicleCreate.createdBy = createdBy;
            listVehicleCreate.push(vehicleCreate);
          });
        });
        await Order.insertMany(listVehicleCreate);
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

exports.createFeeDevice = async (req, res) => {
  const feeWaterIns = req.body;
  try {
    const month = `${new Date().getMonth()}-${new Date().getFullYear()}`;
    const userId = req.headers.userid;
    const feeType = await FeeType.findById(feeWaterIns.feeTypeId);

    // kiểm tra đã cấu hình phí này hay chưa
    const feeConfig = await FeeConfig.findOne({
      feeTypeId: feeWaterIns.feeTypeId, projectId: feeWaterIns.projectId,
    }).populate('feeTypeId');
    if (feeWaterIns.useFeeConfig && !feeConfig) {
      return res.status(400).send({
        success: false,
        error: 'Chưa cấu hình biểu phí cho loại phí này!',
      });
    }

    // Check if there is a fee this month or not
    const findFeeWaterInMonth = await Fee.find({
      feeTypeId: feeWaterIns.feeTypeId,
      month,
      projectId: feeWaterIns.projectId,
    });

    // file excel
    await channel.sendToQueue('FILE', Buffer.from(JSON.stringify({
      id: null,
      fileSave: { device: feeWaterIns.fileName },
      userId,
      projectId: feeWaterIns.projectId,
      type: feeType.name,
    })));
    await channel.consume('FILE-DATA-EXCEL', (info) => {
      const dataFileExcel = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeFee', dataFileExcel);
    });
    setTimeout(() => eventEmitter.emit('consumeFee'), 10000);
    const fileExcelData = await new Promise((resolve) => { eventEmitter.once('consumeFee', resolve); });
    if (fileExcelData.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'Tải file thất bại !',
      });
    }
    const fileData = fileExcelData.reduce((acc, cur) => {
      const id = cur['Mã thiết bị'];
      return { ...acc, [id]: cur };
    }, {});

    // Data of the apartment board
    await channel.sendToQueue('FEE-WATER-APARTMENT-GET', Buffer.from(JSON.stringify(feeWaterIns.projectId)));
    await channel.consume('FEE-WATER-APARTMENT-INFO', (info) => {
      const dataApartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeFeeWater', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('consumeFeeWater'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('consumeFeeWater', resolve); });
    const dataApartment = apartmentData.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});

    if (apartmentData.length === 0) {
      return res.status(200).send({
        success: false,
        error: 'Không có căn hộ nào trong dự án!',
      });
    }
    const listApartmentIdPresent = Array.from(apartmentData, ({ _id }) => _id.toString());
    let listApartmentIdCreate;
    if (findFeeWaterInMonth === 0) {
      listApartmentIdCreate = listApartmentIdPresent;
    } else {
      const listApartmentIdInFeeOld = Array.from(findFeeWaterInMonth, ({ apartmentId }) => apartmentId.toString());
      listApartmentIdCreate = listApartmentIdPresent.filter((item) => !listApartmentIdInFeeOld.includes(item));
      const confirmFalse = findFeeWaterInMonth.filter((item) => !item.confirm);
      if (confirmFalse.length > 0) {
        const ListFeeUpdate = findFeeWaterInMonth.map((item) => ({
          updateOne: {
            filter: { _id: item._id, confirm: false },
            update: {
              $set: {
                blockId: dataApartment[item.apartmentId] ? dataApartment[item.apartmentId].block : item.blockId,
                deviceId: feeType.name === 'ELECTRIC'
                  ? dataApartment[item.apartmentId].electricId
                    ? dataApartment[item.apartmentId].electricId
                    : item.deviceId
                  : dataApartment[item.apartmentId].waterId
                    ? dataApartment[item.apartmentId].waterId
                    : item.deviceId,
                firstNumber: feeType.name === 'ELECTRIC'
                  ? dataApartment[item.apartmentId].electricId
                    ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Chỉ số cũ'] : item.firstNumber
                    : item.firstNumber
                  : dataApartment[item.apartmentId].waterId
                    ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Chỉ số cũ'] : item.firstNumber
                    : item.firstNumber,
                lastNumber: feeType.name === 'ELECTRIC'
                  ? dataApartment[item.apartmentId].electricId
                    ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Chỉ số mới'] : item.lastNumber
                    : item.lastNumber
                  : dataApartment[item.apartmentId].waterId
                    ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Chỉ số mới'] : item.lastNumber
                    : item.lastNumber,
                consumption: feeType.name === 'ELECTRIC'
                  ? dataApartment[item.apartmentId].electricId
                    ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Tổng khối sử dụng'] : item.consumption
                    : item.consumption
                  : dataApartment[item.apartmentId].waterId
                    ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Tổng khối sử dụng'] : item.consumption
                    : item.consumption,
                updatedAt: new Date().valueOf(),
                updatedBy: userId,
                price: feeWaterIns.useFeeConfig
                  ? feeType.name === 'ELECTRIC'
                    ? dataApartment[item.apartmentId].electricId
                      ? fileData[dataApartment[item.apartmentId].electricId] ? paymentOfElectricityAndWater({ consumption: fileData[dataApartment[item.apartmentId].electricId]['Tổng khối sử dụng'], feeConfig }).invoiceTotal : item.price
                      : item.price
                    : dataApartment[item.apartmentId].waterId
                      ? fileData[dataApartment[item.apartmentId].waterId] ? paymentOfElectricityAndWater({ consumption: fileData[dataApartment[item.apartmentId].waterId]['Tổng khối sử dụng'], feeConfig }).invoiceTotal : item.price
                      : item.price
                  : feeType.name === 'ELECTRIC'
                    ? dataApartment[item.apartmentId].electricId
                      ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Phí cần thanh toán'] : item.price
                      : item.price
                    : dataApartment[item.apartmentId].waterId
                      ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Phí cần thanh toán'] : item.price
                      : item.price,
              },
            },
          },
        }));
        await Fee.bulkWrite(ListFeeUpdate);

        const order = await Order.find({
          confirm: false,
          month: `${new Date().getMonth() + 1}-${new Date().getFullYear()}`,
          projectId: feeWaterIns.projectId,
          feeTypeId: feeWaterIns.feeTypeId,
        });

        if (order.length > 0) {
          if (!feeWaterIns.useFeeConfig) {
            const ListOrderUpdate = order.map((item) => ({
              updateOne: {
                filter: { _id: item._id },
                update: {
                  $set: {
                    blockId: dataApartment[item.apartmentId] ? dataApartment[item.apartmentId].block : item.blockId,
                    deviceId: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? dataApartment[item.apartmentId].electricId
                        : item.deviceId
                      : dataApartment[item.apartmentId].waterId
                        ? dataApartment[item.apartmentId].waterId
                        : item.deviceId,
                    invoiceTotal: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Phí cần thanh toán'] : item.invoiceTotal
                        : item.invoiceTotal
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Phí cần thanh toán'] : item.invoiceTotal
                        : item.invoiceTotal,
                    consumption: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Tổng khối sử dụng'] : item.consumption
                        : item.consumption
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Tổng khối sử dụng'] : item.consumption
                        : item.consumption,
                    subTotal: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Thành tiền'] : item.subTotal
                        : item.subTotal
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Thành tiền'] : item.subTotal
                        : item.subTotal,
                    level: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId]
                          ? levelFile({
                            file: fileData[dataApartment[item.apartmentId].electricId],
                            feeType: feeType.name,
                          }) : item.level
                        : item.level
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId]
                          ? levelFile({
                            file: fileData[dataApartment[item.apartmentId].waterId],
                            feeType: feeType.name,
                          }) : item.level
                        : item.level,
                    firstNumber: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Chỉ số cũ'] : item.firstNumber
                        : item.firstNumber
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Chỉ số cũ'] : item.firstNumber
                        : item.firstNumber,
                    lastNumber: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Chỉ số mới'] : item.lastNumber
                        : item.lastNumber
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Chỉ số mới'] : item.lastNumber
                        : item.lastNumber,
                    surcharge: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? surchargeFile({ file: fileData[dataApartment[item.apartmentId].electricId] }) : item.surcharge
                        : item.surcharge
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? surchargeFile({ file: fileData[dataApartment[item.apartmentId].waterId] }) : item.surcharge
                        : item.surcharge,
                    updatedAt: new Date().valueOf(),
                    updatedBy: userId,
                  },
                },
              },
            }));
            await Order.bulkWrite(ListOrderUpdate);
          } else {
            const ListOrderUpdate = order.map((item) => ({
              updateOne: {
                filter: { _id: item._id },
                update: {
                  $set: {
                    blockId: dataApartment[item.apartmentId] ? dataApartment[item.apartmentId].block : item.blockId,
                    firstNumber: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Chỉ số cũ'] : item.firstNumber
                        : item.firstNumber
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Chỉ số cũ'] : item.firstNumber
                        : item.firstNumber,
                    lastNumber: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Chỉ số mới'] : item.lastNumber
                        : item.lastNumber
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Chỉ số mới'] : item.lastNumber
                        : item.lastNumber,
                    invoiceTotal: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? paymentOfElectricityAndWater({ consumption: fileData[dataApartment[item.apartmentId].electricId]['Tổng khối sử dụng'], feeConfig }).invoiceTotal : item.invoiceTotal
                        : item.invoiceTotal
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? paymentOfElectricityAndWater({ consumption: fileData[dataApartment[item.apartmentId].waterId]['Tổng khối sử dụng'], feeConfig }).invoiceTotal : item.invoiceTotal
                        : item.invoiceTotal,
                    subTotal: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? paymentOfElectricityAndWater({ consumption: fileData[dataApartment[item.apartmentId].electricId]['Tổng khối sử dụng'], feeConfig }).countPrice : item.subTotal
                        : item.subTotal
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? paymentOfElectricityAndWater({ consumption: fileData[dataApartment[item.apartmentId].waterId]['Tổng khối sử dụng'], feeConfig }).countPrice : item.subTotal
                        : item.subTotal,
                    consumption: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? fileData[dataApartment[item.apartmentId].electricId]['Tổng khối sử dụng'] : item.consumption
                        : item.consumption
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? fileData[dataApartment[item.apartmentId].waterId]['Tổng khối sử dụng'] : item.consumption
                        : item.consumption,
                    level: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? fileData[dataApartment[item.apartmentId].electricId] ? feeConfig.level : item.level
                        : item.level
                      : dataApartment[item.apartmentId].waterId
                        ? fileData[dataApartment[item.apartmentId].waterId] ? feeConfig.level : item.level
                        : item.level,
                    surcharge: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? feeConfig.surcharge
                        : item.surcharge
                      : dataApartment[item.apartmentId].waterId
                        ? feeConfig.surcharge
                        : item.surcharge,
                    deviceId: feeType.name === 'ELECTRIC'
                      ? dataApartment[item.apartmentId].electricId
                        ? dataApartment[item.apartmentId].electricId
                        : null
                      : dataApartment[item.apartmentId].waterId
                        ? dataApartment[item.apartmentId].waterId
                        : null,
                    updatedAt: new Date().valueOf(),
                    updatedBy: userId,
                  },
                },
              },
            }));
            await Order.bulkWrite(ListOrderUpdate);
          }
        }
      }
    }
    if (listApartmentIdCreate.length > 0) {
      const listFeeCreate = apartmentData.filter((item) => listApartmentIdCreate.includes(item._id.toString()));

      listFeeCreate.map((item) => {
        let element;
        if (item.electricId && feeType.name === 'ELECTRIC') {
          element = item.electricId;
        }
        if (item.waterId && feeType.name === 'WATER') {
          element = item.waterId;
        }
        if (fileData[element]) {
          item.projectId = feeWaterIns.projectId;
          item.feeTypeId = feeWaterIns.feeTypeId;
          item.apartmentId = item._id;
          item.blockId = item.block;
          item.deviceId = element;
          item.firstNumber = fileData[element]['Chỉ số cũ'];
          item.lastNumber = fileData[element]['Chỉ số mới'];
          item.consumption = fileData[element]['Tổng khối sử dụng'] ? fileData[element]['Tổng khối sử dụng'] : fileData[element]['Tổng khối sử dụng'];

          item.price = feeWaterIns.useFeeConfig ? paymentOfElectricityAndWater({ consumption: fileData[item.deviceId]['Tổng khối sử dụng'] ?? fileData[item.deviceId]['Tổng khối sử dụng'], feeConfig }).invoiceTotal : fileData[element]['Phí cần thanh toán'];
          item.month = month;
          item.createdBy = userId;
          item.updatedBy = userId;
          item.createdAt = new Date().valueOf();
          item.updatedAt = new Date().valueOf();
          delete item._id;
        } else {
          item.projectId = feeWaterIns.projectId;
          item.feeTypeId = feeWaterIns.feeTypeId;
          item.apartmentId = item._id;
          item.blockId = item.block;
          item.month = month;
          item.createdBy = userId;
          item.updatedBy = userId;
          item.createdAt = new Date().valueOf();
          item.updatedAt = new Date().valueOf();
          delete item._id;
        }
      });
      const dataFee = await Fee.insertMany(listFeeCreate);

      if (!feeWaterIns.useFeeConfig) {
        dataFee.map((item) => {
          item._doc.confirm = false;
          item._doc.feeId = item._id;
          item._doc.month = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
          item._doc.invoiceTotal = item.deviceId && fileData[item.deviceId] ? fileData[item.deviceId]['Phí cần thanh toán'] : 0;
          item._doc.level = item.deviceId && fileData[item.deviceId] ? levelFile({
            file: fileData[item.deviceId],
            feeType: feeType.name,
          }) : [];
          item._doc.subTotal = item.deviceId && fileData[item.deviceId] ? fileData[item.deviceId]['Thành tiền'] : 0;
          delete item._doc.price;
          item.createdBy = userId;
          item.updatedBy = userId;
          item.createdAt = new Date().valueOf();
          item.updatedAt = new Date().valueOf();
          item._doc.surcharge = item.deviceId && fileData[item.deviceId] ? surchargeFile({
            file: fileData[item.deviceId],
          }) : [];
        });
        await Order.insertMany(dataFee);
      } else {
        dataFee.map((item) => {
          let countPrice = 0;
          item._doc.feeId = item._id;
          item._doc.confirm = false;
          item._doc.month = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
          if (item.consumption !== 0) {
            feeConfig.level.map((element) => {
              if (item.consumption > element.from) {
                if (!element.to) {
                  countPrice += (item.consumption - element.from + 1) * element.price;
                } else if (item.consumption <= element.to) {
                  countPrice += (item.consumption - element.from + 1) * element.price;
                } else if (element.from === 0) {
                  countPrice += (element.to - element.from) * element.price;
                } else {
                  countPrice += (element.to - element.from + 1) * element.price;
                }
              }
            });
            item._doc.level = feeConfig.level;
            item._doc.subTotal = countPrice;
            if (feeConfig.surcharge.length > 0) {
              let invoiceTotal = countPrice;
              item._doc.surcharge = feeConfig.surcharge;
              feeConfig.surcharge.map((x) => {
                if (x.isPercent) {
                  invoiceTotal = (countPrice / 100).toFixed(1) * x.value + invoiceTotal;
                } else {
                  invoiceTotal += x.value;
                }
              });
              item._doc.invoiceTotal = invoiceTotal;
            } else { item._doc.invoiceTotal = countPrice; }
          } else {
            item._doc.level = [];
            item._doc.subTotal = 0;
            item._doc.invoiceTotal = 0;
            item._doc.surcharge = [];
          }
          delete item._doc.price;
        });
        await Order.insertMany(dataFee);
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

exports.confirmFee = async (req, res) => {
  try {
    const { confirm } = req.body;
    const ListFeeUpdate = confirm.map((item) => ({
      updateOne: {
        filter: { _id: item },
        update: {
          $set: {
            confirm: true,
          },
        },
      },
    }));
    await Fee.bulkWrite(ListFeeUpdate);
    await Order.updateMany(
      { feeId: { $in: confirm } },
      { $set: { confirm: true } },
    );
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

exports.apartmentBillList = async (req, res) => {
  try {
    const { apartmentId, month } = req.query;
    const feeType = await FeeType.findOne({ name: 'OTHER' }).select('_id');
    if (apartmentId && month) {
      const data = await Order.find({
        apartmentId, month, status: 'SENT', feeTypeId: feeType._id,
      });
      return res.status(200).send({
        success: true,
        data,
      });
    }
    return res.status(200).send({
      success: true,
      data: [],
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
