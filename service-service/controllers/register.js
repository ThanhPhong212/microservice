/* eslint-disable max-len */
/* eslint-disable array-callback-return */
/* eslint-disable no-param-reassign */
/* eslint-disable eqeqeq */
/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
/* eslint-disable no-promise-executor-return */

const EventEmitter = require('events');

const eventEmitter = new EventEmitter();
const Service = require('../models/service');
const Register = require('../models/register');
const connect = require('../lib/rabbitMQ');
const { utcDay } = require('../config/index');
const RegisterCheck = require('../models/registerCheck');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('APARTMENT-INFO');
  await channel.assertQueue('USER-INFO');
  await channel.assertQueue('APARTMENT-REGISTER-INFO');
  await channel.assertQueue('APARTMENT-DETAILS-INFO');
  await channel.assertQueue('USER-DETAILS-INFO');
  await channel.assertQueue('USER-REGISTER-SEARCH-INFO');
};
connectRabbit();
const setupTime = (data) => {
  try {
    const { from, to } = data;
    const arrayTime = [];
    for (let i = from; i < to; i.setMinutes(i.getMinutes() + 30)) {
      if (i.getMinutes() + 30 >= 60) {
        arrayTime.push(`${i.getHours() < 10 ? `0${i.getHours()}` : i.getHours()}:${i.getMinutes() == 0 ? '00' : i.getMinutes()}-${i.getHours() + 1 < 10 ? `0${i.getHours() + 1}` : i.getHours() + 1}:00`);
      } else {
        arrayTime.push(`${i.getHours() < 10 ? `0${i.getHours()}` : i.getHours()}:${i.getMinutes() == 0 ? '00' : i.getMinutes()}-${i.getHours() < 10 ? `0${i.getHours()}` : i.getHours()}:${i.getMinutes() + 30}`);
      }
    }
    return arrayTime;
  } catch (error) {
    return [];
  }
};

// register Service
exports.registration = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const registerIns = req.body;
    registerIns.userId = userId;

    // // Get the project ID through the apartment
    await channel.sendToQueue('APARTMENT-REGISTER-GET', Buffer.from(JSON.stringify(registerIns.apartmentId)));
    await channel.consume('APARTMENT-REGISTER-INFO', (info) => {
      const apartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeCreate', apartment);
    });
    setTimeout(() => eventEmitter.emit('consumeCreate'), 10000);
    const dataApartment = await new Promise(
      (resolve) => eventEmitter.once('consumeCreate', resolve),
    );
    registerIns.projectId = dataApartment.block.projectId;

    const service = await Service.findById(registerIns.serviceId);
    if (service.projectId != registerIns.projectId) {
      return res.status(400).send({
        success: false,
        error: 'Tiện ích này không tồn tại trong dự án !',
      });
    }

    const checkDate = service.dayOff.find((item) => item == registerIns.registrationDate);
    if (checkDate) {
      return res.status(400).send({
        success: false,
        error: 'Tiện ích không hoạt động vào ngày bạn chọn, vui lòng chọn ngày khác!',
      });
    }
    const registrationDate = new Date(registerIns.registrationDate);
    const numberDayRegister = registrationDate.getUTCDay();
    const dayRegister = utcDay[numberDayRegister];
    let configDayRegister = service.setupEveryDay;

    // kiểm tra ngày đăng ký
    if (!configDayRegister.length) {
      configDayRegister = service.setupDayOfWeek[dayRegister];
      if (!configDayRegister || !configDayRegister.length) {
        return res.status(400).send({
          success: false,
          error: 'Thời gian đăng ký không hợp lệ!',
        });
      }
    }
    // convert data to check condition
    const configDayRegisterConvert = configDayRegister.map((item) => ({
      from: parseFloat(item.from.replace(':', '.')),
      to: parseFloat(item.to.replace(':', '.')),
      slot: item.slot,
    }));
    const dataTimeConvert = registerIns.time.map((item) => ({
      from: parseFloat(item.from.replace(':', '.')),
      to: parseFloat(item.to.replace(':', '.')),
    }));

    // checking time allow
    let isNumberAllow = 0;
    configDayRegisterConvert.forEach((c) => {
      dataTimeConvert.forEach((p) => {
        isNumberAllow += c.from <= p.from && p.from < p.to && p.to <= c.to ? 1 : 0;
      });
    });

    if (isNumberAllow !== dataTimeConvert.length) {
      return res.status(400).send({
        success: false,
        error: 'Thời gian đăng ký không hợp lệ',
      });
    }
    const slotInTime = [];
    if (registerIns.slotId) {
      // tạo bảng registerCheck nếu chưa có
      let registerCheck = await RegisterCheck.findOne({
        registerDate: registerIns.registrationDate,
        slotId: registerIns.slotId,
      });
      if (!registerCheck) {
        const dataCreateRegisterService = {};
        dataCreateRegisterService.registerDate = registerIns.registrationDate;
        dataCreateRegisterService.serviceId = registerIns.serviceId;
        if (registerIns.slotId) { dataCreateRegisterService.slotId = registerIns.slotId; }
        const dataTime = {};
        let arrayTime = [];
        if (service.setupEveryDay.length > 0) {
          service.setupEveryDay.map((item) => {
            const from = new Date(`${registerIns.registrationDate} ${item.from}`);
            const to = new Date(`${registerIns.registrationDate} ${item.to}`);
            arrayTime = arrayTime.concat(setupTime({ from, to }));
          });
        } else {
          service.setupDayOfWeek[utcDay[numberDayRegister]].map((item) => {
            const from = new Date(`${registerIns.registrationDate} ${item.from}`);
            const to = new Date(`${registerIns.registrationDate} ${item.to}`);
            arrayTime = arrayTime.concat(setupTime({ from, to }));
          });
        }
        if (arrayTime.length > 0) {
          arrayTime.map((item) => {
            dataTime[item] = {
              sizeTotal: 0,
              sizeDetail: [],
            };
          });
        }
        dataCreateRegisterService.data = dataTime;
        registerCheck = await RegisterCheck.create(dataCreateRegisterService);
      }
      // khung giờ của tiện ích
      const listTime = registerCheck.data;

      const slotConfigName = service.slotConfig.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});

      // danh sách slot theo khung giờ của tiện ích
      const slotConfigTime = {};
      let slotTime = [];
      if (service.typeWork === 'DAYOFWEEK') {
        slotTime = service.setupDayOfWeek[dayRegister];
      } else {
        slotTime = service.setupEveryDay;
      }
      if (slotTime.length > 0) {
        slotTime.map((item) => {
          item.slot = item.slot.reduce((acc, cur) => {
            const id = cur.slotName;
            return { ...acc, [id]: cur };
          }, {});
        });
        slotTime.map((item) => {
          const from = new Date(`${registerIns.registrationDate} ${item.from}`);
          const to = new Date(`${registerIns.registrationDate} ${item.to}`);
          const arrayTimeConfig = setupTime({ from, to });
          if (arrayTimeConfig.length > 0) {
            arrayTimeConfig.map((element) => {
              slotConfigTime[element] = item.slot[slotConfigName[registerIns.slotId].slotName].slotCapacity;
            });
          }
        });
      }

      // kiểm tra sô lượng chổ trong từng khung giờ
      let registerTime = [];
      registerIns.time.map((item) => {
        const from = new Date(`${registerIns.registrationDate} ${item.from}`);
        const to = new Date(`${registerIns.registrationDate} ${item.to}`);
        registerTime = registerTime.concat(setupTime({ from, to }));
      });
      if (registerTime.length > 0) {
        const size = parseInt(registerIns.adult) + parseInt(registerIns.child);
        registerTime.map((item) => {
          if (listTime[item].sizeTotal >= slotConfigTime[item] || listTime[item].sizeTotal + size > slotConfigTime[item]) {
            slotInTime.push(item);
          } else {
            const { sizeTotal } = listTime[item];
            listTime[item].sizeTotal = sizeTotal + size;
            listTime[item].sizeDetail.push({ userId, size });
          }
        });
      }
      if (slotInTime.length > 0) {
        return res.status(400).send({
          success: false,
          error: 'Vượt quá số lượng đăng ký!',
        });
      }
      await RegisterCheck.findByIdAndUpdate(registerCheck._id, { data: listTime });
    }

    // format data register
    if (service.typeAccept === 'AUTO') {
      registerIns.status = 'DONE';
    }
    registerIns.registrationDate = new Date(registerIns.registrationDate).valueOf();
    registerIns.amount = {
      adult: registerIns.adult,
      child: registerIns.child,
    };
    registerIns.createdBy = userId;
    registerIns.service = registerIns.serviceId;

    await Register.create(registerIns);
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

exports.editRegistration = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const { registerId } = req.params;
    const serviceIns = req.body;
    const date = new Date().valueOf();
    serviceIns.updatedAt = date;
    serviceIns.updatedBy = userId;
    await Register.findByIdAndUpdate(registerId, serviceIns);
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

exports.listRegistration = async (req, res) => {
  try {
    const { projectId } = req.query;
    const {
      limit, page, keywords, status,
    } = req.query;
    const perPage = parseInt(limit || 7);
    const currentPage = parseInt(page || 1);
    const query = { projectId };
    if (status) { query.status = status; }

    if (keywords) {
      // setup search service
      const service = await Service.find({ projectId, name: { $regex: keywords, $options: 'i' } }).select('_id');
      const serviceSearch = Array.from(service, ({ _id }) => _id);

      // setup search by user
      await channel.sendToQueue('USER-REGISTER-SEARCH-GET', Buffer.from(JSON.stringify(keywords)));
      await channel.consume('USER-REGISTER-SEARCH-INFO', (search) => {
        const dataSearch = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('consumeUser', dataSearch);
      });
      setTimeout(() => eventEmitter.emit('consumeUser'), 10000);
      const searchUser = await new Promise((resolve) => eventEmitter.once('consumeUser', resolve));
      const userSearch = Array.from(searchUser, ({ _id }) => _id);

      query.$or = [
        { service: { $in: serviceSearch } },
        { 'place.slotName': { $regex: keywords, $options: 'i' } },
        { userId: userSearch },
      ];
    }
    const total = await Register.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    const dataRegister = await Register.find(query).sort({ _id: -1 })
      .select('-__v -createdBy -updatedBy')
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .populate('service');

    const user = Array.from(dataRegister, ({ userId }) => userId);
    const apartment = Array.from(dataRegister, ({ apartmentId }) => apartmentId);

    // rabbitMQ
    await channel.sendToQueue('USER-GET', Buffer.from(JSON.stringify(user)));
    await channel.consume('USER-INFO', (info) => {
      const userData = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeInfoUser', userData);
    });
    setTimeout(() => eventEmitter.emit('consumeInfoUser'), 10000);
    const dataUser = await new Promise((resolve) => eventEmitter.once('consumeInfoUser', resolve));

    await channel.sendToQueue('APARTMENT-GET', Buffer.from(JSON.stringify(apartment)));
    await channel.consume('APARTMENT-INFO', (info) => {
      const apartmentData = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeAPM', apartmentData);
    });
    setTimeout(() => eventEmitter.emit('consumeAPM'), 10000);
    const dataApartment = await new Promise((resolve) => eventEmitter.once('consumeAPM', resolve));

    // format data
    dataRegister.map((item) => {
      if (item.service.slotConfig.length > 0) {
        const slotConfig = item.service.slotConfig.reduce((acc, cur) => {
          const id = cur._id;
          return { ...acc, [id]: cur };
        }, {});
        item._doc.service._doc.slotConfig = slotConfig;
      }
      item._doc.slot = item.service.slotConfig && item.service.slotConfig[item.slotId] ? item.service.slotConfig[item.slotId].slotName : null;
      item._doc.service = item.service.name;
      item._doc.subscribers = {
        name: dataUser[item.userId].name,
        phone: dataUser[item.userId].phone,
        block: dataApartment[item.apartmentId].block.name,
        apartment: dataApartment[item.apartmentId].apartmentCode,
      };
      delete item._doc.userId;
      delete item._doc.apartmentId;
      return item;
    });

    return res.status(200).send({
      success: true,
      data: dataRegister,
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

exports.userRegistrationHistory = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const {
      limit, page, apartmentId, service, status,
    } = req.query;
    const perPage = parseInt(limit || 5);
    const currentPage = parseInt(page || 1);
    const query = { userId, apartmentId };
    if (service) { query.service = service; }
    if (status) { query.status = status; }
    const history = await Register.find(query)
      .sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .select('-__v')
      .populate('service', 'name thumbnail');

    // format data
    history.map((item) => {
      item._doc.imageService = item.service.thumbnail;
      item._doc.imageServicePath = item.service.thumbnailPath;
      item._doc.serviceName = item.service.name;
      return item;
    });

    const total = await Register.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    return res.status(200).send({
      success: true,
      data: history,
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

exports.registrationDetails = async (req, res) => {
  try {
    const { registerId } = req.params;

    // Get registration details
    const register = await Register.findById(registerId)
      .select('-createdBy -updatedBy -updatedAt -projectId -place -__v')
      .populate('service')
      .lean();

    // Get user information
    await channel.sendToQueue('USER-DETAILS-GET', Buffer.from(JSON.stringify(register.userId)));
    await channel.consume('USER-DETAILS-INFO', (info) => {
      const user = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeInfoUser', user);
    });
    setTimeout(() => eventEmitter.emit('consumeInfoUser'), 10000);
    const dataUser = await new Promise((resolve) => eventEmitter.once('consumeInfoUser', resolve));

    // Get apartment information
    await channel.sendToQueue('APARTMENT-DETAILS-GET', Buffer.from(JSON.stringify(register.apartmentId)));
    await channel.consume('APARTMENT-DETAILS-INFO', (info) => {
      const apartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeAPM', apartment);
    });
    setTimeout(() => eventEmitter.emit('consumeAPM'), 10000);
    const dataApartment = await new Promise((resolve) => eventEmitter.once('consumeAPM', resolve));

    // format data
    if (register.service.slotConfig.length > 0) {
      const slotConfig = register.service.slotConfig.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      register.service.slotConfig = slotConfig;
    }
    register.slot = register.service.slotConfig && register.service.slotConfig[register.slotId] ? register.service.slotConfig[register.slotId].slotName : null;
    register.createdBy = dataUser.name;
    register.phone = dataUser.phone;
    register.apartment = {
      name: dataApartment ? dataApartment.apartmentCode : null,
      block: dataApartment ? dataApartment.block.name : null,
    };
    register.service = register.service.name;
    register.date = register.time.date;
    delete register.userId;
    delete register.apartmentId;

    return res.status(200).send({
      success: true,
      data: register,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
