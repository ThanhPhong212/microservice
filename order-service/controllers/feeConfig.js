/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const FeeConfig = require('../models/feeConfig');
const FeeType = require('../models/feeType');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('FEE-CONFIG-USER-INFO');
  await channel.assertQueue('FEE-CONFIG-USERID-INFO');
  await channel.assertQueue('CARD-DETAIL-FEE-GET');
};

connectRabbit().then(() => {
  channel.consume('CARD-DETAIL-FEE-GET', async (data) => {
    try {
      const {
        projectId,
        vehicleType,
      } = JSON.parse(data.content);
      channel.ack(data);

      const fee = await FeeConfig.findOne({ vehicle: vehicleType, projectId });
      let valueFee = 0;
      if (!fee) {
        valueFee = `Chưa cập nhật phí xe ${vehicleType === 'MOTOR' ? 'máy!' : 'ô tô!'}`;
      } else {
        let { price } = fee;
        if (fee.surcharge.length) {
          const priceVehicle = price;
          fee.surcharge.map((item) => {
            if (item.isPercent) {
              price += (priceVehicle / 100).toFixed(1) * item.value;
            } else {
              price += item.value;
            }
            return item;
          });
        }
        valueFee = price;
      }

      channel.sendToQueue('CARD-DETAIL-FEE-INFO', Buffer.from(JSON.stringify(valueFee)));
    } catch (error) {
      const dataAvailable = 0;
      channel.sendToQueue('CARD-DETAIL-FEE-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });
});

exports.createFeeConfig = async (req, res) => {
  try {
    const feeConfigIns = req.body;
    feeConfigIns.createdBy = req.headers.userid;

    // check fee config
    const query = { feeTypeId: feeConfigIns.feeTypeId, projectId: feeConfigIns.projectId };
    if (feeConfigIns.vehicle) {
      query.vehicle = feeConfigIns.vehicle;
    }
    const feeType = await FeeConfig.findOne(query);
    if (feeType) {
      return res.status(400).send({
        success: false,
        error: 'Cấu hình phí này đã tồn tại !',
      });
    }

    await FeeConfig.create(feeConfigIns);
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

exports.editFeeConfig = async (req, res) => {
  try {
    const { feeConfigId } = req.params;
    const feeConfigIns = req.body;
    if (!feeConfigIns.surcharge) {
      feeConfigIns.surcharge = [];
    }
    feeConfigIns.updatedBy = req.headers.userid;
    await FeeConfig.findByIdAndUpdate(feeConfigId, feeConfigIns);
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

exports.getListFeeConfig = async (req, res) => {
  try {
    const { projectId } = req.query;

    const listFeeConfig = await FeeConfig.find({ projectId })
      .select('name description createdBy  createdAt');

    // Get user information
    const userId = Array.from(listFeeConfig, ({ createdBy }) => createdBy);
    await channel.sendToQueue('FEE-CONFIG-USER-GET', Buffer.from(JSON.stringify(userId)));
    await channel.consume('FEE-CONFIG-USER-INFO', (info) => {
      const userData = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeUser', userData);
    });
    setTimeout(() => eventEmitter.emit('consumeUser'), 10000);
    const dataUser = await new Promise((resolve) => { eventEmitter.once('consumeUser', resolve); });

    // format data
    listFeeConfig.map((item) => {
      const element = item;
      element._doc.createdBy = {
        name: dataUser[item.createdBy].name,
        phone: dataUser[item.createdBy].phone,
      };
      return element;
    });

    return res.status(200).send({
      success: true,
      data: listFeeConfig,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.getFeeConfigById = async (req, res) => {
  try {
    const { feeConfigId } = req.params;
    const feeConfig = await FeeConfig.findById(feeConfigId);

    // Get user information
    await channel.sendToQueue('FEE-CONFIG-USERID-GET', Buffer.from(JSON.stringify(feeConfig.createdBy)));
    await channel.consume('FEE-CONFIG-USERID-INFO', (info) => {
      const userData = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeUserId', userData);
    });
    setTimeout(() => eventEmitter.emit('consumeUserId'), 10000);
    const dataUser = await new Promise((resolve) => { eventEmitter.once('consumeUserId', resolve); });

    // format data
    feeConfig._doc.createdBy = {
      name: dataUser.name,
      phone: dataUser.phone,
    };

    return res.status(200).send({
      success: true,
      data: feeConfig,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.getFeeType = async (req, res) => {
  try {
    const { isExpand } = req.query;
    let query = {};
    if (isExpand === 'ALL') {
      query = {};
    } else {
      query.isExpand = isExpand;
    }
    const feeType = await FeeType.find(query).select('-__v');
    return res.status(200).send({
      success: true,
      data: feeType,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
