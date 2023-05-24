/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const Service = require('../models/service');
const connect = require('../lib/rabbitMQ');

const eventEmitter = new EventEmitter();

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('SERVICE-USER-SEARCH');
  await channel.assertQueue('SERVICE-GET-USER');
  await channel.assertQueue('PROJECT-SERVICE-GET');
};
connectRabbit().then(() => {
  channel.consume('PROJECT-SERVICE-GET', async (data) => {
    const projectId = JSON.parse(data.content);
    channel.ack(data);
    try {
      const sumService = await Service.countDocuments({ projectId });
      channel.sendToQueue('PROJECT-SERVICE-INFO', Buffer.from(JSON.stringify(sumService)));
    } catch (error) {
      const dataAvailable = 0;
      channel.sendToQueue('PROJECT-SERVICE-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });
});

const dayConfig = {
  monday: 'T2',
  tuesday: 'T3',
  wednesday: 'T4',
  thursday: 'T5',
  friday: 'T6',
  saturday: 'T7',
  sunday: 'CN',
};

const checkKeyValid = async (data) => {
  let check = true;
  Object.keys(data).map((item) => {
    if (Object.keys(dayConfig).includes(item)) {
      return item;
    }
    check = false;
    return item;
  });
  return check;
};

exports.createService = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const serviceIns = req.body;
    if (serviceIns.typeWork === 'EVERYDAY') {
      delete serviceIns.setupDayOfWeek;
      if (serviceIns.setupEveryDay.length === 0) {
        return res.status(400).send({
          success: false,
          error: 'Chưa cấu hình thời gian !',
        });
      }
    }
    if (serviceIns.typeWork === 'DAYOFWEEK') {
      const checkValid = await checkKeyValid(serviceIns.setupDayOfWeek);
      if (!checkValid) {
        return res.status(400).send({
          success: false,
          error: 'Setup day of week not valid',
        });
      }
      delete serviceIns.setupEveryDay;
      if (Object.values(serviceIns.setupDayOfWeek).length === 0) {
        return res.status(400).send({
          success: false,
          error: 'Chưa cấu hình thời gian !',
        });
      }
    }

    // Check the same place
    const seen = new Set();
    const hasDuplicates = serviceIns.slotConfig.some(
      (currentObject) => seen.size === seen.add(currentObject.slotName).size,
    );
    if (hasDuplicates) {
      return res.status(400).send({
        success: false,
        error: ' Tên chỗ không được trùng!',
      });
    }
    serviceIns.createdBy = userId;
    serviceIns.updatedBy = userId;
    const data = await Service.create(serviceIns);
    await channel.sendToQueue(
      'FILE-IMAGE',
      Buffer.from(JSON.stringify({
        id: data._id,
        fileSave: { service: serviceIns.thumbnail },
        userId,
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

exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.headers.userid;
    const serviceIns = req.body;
    if (serviceIns.typeWork === 'EVERYDAY') {
      serviceIns.setupDayOfWeek = {};
      if (serviceIns.setupEveryDay.length === 0) {
        return res.status(400).send({
          success: false,
          error: 'Chưa cấu hình thời gian !',
        });
      }
    }
    if (serviceIns.typeWork === 'DAYOFWEEK') {
      if (Object.values(serviceIns.setupDayOfWeek).length === 0) {
        return res.status(400).send({
          success: false,
          error: 'Chưa cấu hình thời gian !',
        });
      }
      const checkValid = await checkKeyValid(serviceIns.setupDayOfWeek);
      if (!checkValid) {
        return res.status(400).send({
          success: false,
          error: 'Setup day of week not valid',
        });
      }
      serviceIns.setupEveryDay = [];
    }
    serviceIns.updatedBy = userId;
    const service = await Service.findByIdAndUpdate(serviceId, serviceIns);
    let fileSave = {};
    if (serviceIns.thumbnail) {
      fileSave = {
        newFile: serviceIns.thumbnail,
        oldFile: service.thumbnail,
      };
      channel.sendToQueue('FILE-SERVICE-CHANGE', Buffer.from(JSON.stringify({
        id: service._id,
        fileSave,
        userId,
      })));
    }
    return res.status(200).send({
      success: true,
      service,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findById(serviceId);

    if (Object.values(service.setupDayOfWeek).length === 0) {
      service._doc.setupDayOfWeek = [];
    }
    return res.status(200).send({
      success: true,
      data: service,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.getListService = async (req, res) => {
  try {
    const {
      limit, page, projectId, keywords,
    } = req.query;
    const perPage = parseInt(limit || 10, 10);
    const currentPage = parseInt(page || 1, 10);
    const query = {};
    if (!projectId) {
      return res.status(400).send({
        success: false,
        error: 'Project Id is not valid!!!',
      });
    }
    query.projectId = projectId;
    if (keywords) {
      // set up field search in user
      const dataSearch = {
        keywords,
        field: [
          {
            value: 'phone',
            type: 'string',
          },
          {
            value: 'name',
            type: 'string',
          },
        ],
      };
      // get list userId match keywords
      await channel.sendToQueue('USER-SEARCH-BY-FIELD', Buffer.from(JSON.stringify(dataSearch)));
      await channel.consume('SERVICE-USER-SEARCH', (search) => {
        const result = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('csmResultSearch', result);
      });
      setTimeout(() => eventEmitter.emit('csmResultSearch'), 10000);
      const arraySearch = await new Promise((resolve) => { eventEmitter.once('csmResultSearch', resolve); });
      const arrayIdSearch = Array.from(arraySearch, ({ _id }) => _id);

      // search fee
      const fee = new RegExp(keywords, 'i');
      let feeSearch;
      if (fee.test('miễn phí')) { feeSearch = false; }
      if (fee.test('có phí')) { feeSearch = true; }

      query.$or = [
        { updatedBy: { $in: arrayIdSearch } },
        { name: { $regex: keywords, $options: 'i' } },
        { fee: feeSearch },
      ];
    }

    const service = await Service.find(query).sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    // format data return
    if (service.length > 0) {
      // array id user update
      const arrayUserId = Array.from(service, ({ updatedBy }) => updatedBy);
      // remove id duplicate
      const arrayUser = arrayUserId.filter((item, index) => arrayUserId.indexOf(item) === index);
      // get Information user
      await channel.sendToQueue('USER-SEND-SERVICE', Buffer.from(JSON.stringify(arrayUser)));
      await channel.consume('SERVICE-GET-USER', async (message) => {
        const dtum = JSON.parse(message.content);
        eventEmitter.emit('csmUserService', dtum);
        channel.ack(message);
      });

      setTimeout(() => eventEmitter.emit('csmUserService'), 10000);
      // eslint-disable-next-line no-promise-executor-return
      const dataConsume = await new Promise((resolve) => eventEmitter.once('csmUserService', resolve));

      await Promise.all(service.map(async (item) => {
        const element = item;
        const dayOfWeek = [];
        if (!element.createdBy?.name) {
          if (!dataConsume) {
            return element;
          }
          element._doc.updatedBy = dataConsume[element.updatedBy];
        }
        if (element.typeWork === 'DAYOFWEEK') {
          // eslint-disable-next-line array-callback-return
          await Promise.all(Object.keys(element.setupDayOfWeek).map((value) => {
            dayOfWeek.push({
              value: dayConfig[value],
              time: element.setupDayOfWeek[value],
            });
          }));
          element._doc.activeTimes = dayOfWeek;
          delete element._doc.setupDayOfWeek;
          delete element._doc.setupEveryDay;
        }
        if (element.typeWork === 'EVERYDAY') {
          element._doc.activeTimes = {
            value: 'T2-CN',
            time: element.setupEveryDay,
          };
          delete element._doc.setupDayOfWeek;
          delete element._doc.setupEveryDay;
        }
        return element;
      }));
    }

    const total = await Service.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);
    return res.status(200).send({
      success: true,
      data: service,
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

exports.cshGetListService = async (req, res) => {
  try {
    const {
      limit, page, projectId,
    } = req.query;
    const perPage = parseInt(limit || 10, 10);
    const currentPage = parseInt(page || 1, 10);
    const query = {
      projectId, status: true,
    };
    const service = await Service.find(query).sort({ _id: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .select('-__v -status -createdBy -updatedBy');
    service.map(async (item) => {
      const element = item;
      let timeString = '';
      if (element.typeWork === 'DAYOFWEEK') {
        // eslint-disable-next-line array-callback-return
        Object.keys(element.setupDayOfWeek).map((value) => {
          timeString += `${dayConfig[value]} `;
        });
        element._doc.activeTimes = timeString;
        delete element._doc.setupEveryDay;
      }
      if (element.typeWork === 'EVERYDAY') {
        element._doc.activeTimes = 'T2-CN';
        delete element._doc.setupDayOfWeek;
      }
      return element;
    });
    const total = await Service.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);
    return res.status(200).send({
      success: true,
      data: service,
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

exports.cshGetServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findById(serviceId)
      .select('-__v -status -createdBy -updatedBy');
    const dayOfWeek = [];
    // format data return
    if (service.typeWork === 'DAYOFWEEK') {
      // eslint-disable-next-line array-callback-return
      await Promise.all(Object.keys(service.setupDayOfWeek).map((value) => {
        dayOfWeek.push({
          value: dayConfig[value],
          time: service.setupDayOfWeek[value],
        });
      }));
      service._doc.activeTimes = dayOfWeek;
    }
    if (service.typeWork === 'EVERYDAY') {
      service._doc.activeTimes = {
        value: 'T2-CN',
        time: service.setupEveryDay,
      };
    }
    delete service._doc.setupDayOfWeek;
    delete service._doc.setupEveryDay;
    return res.status(200).send({
      success: true,
      data: service,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
