/* eslint-disable no-unused-expressions */
/* eslint-disable no-param-reassign */
/* eslint-disable eqeqeq */
/* eslint-disable array-callback-return */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const Request = require('../models/request');
const Type = require('../models/type');
const connect = require('../lib/rabbitMQ');
const { convertArrayField, convertJsonKey } = require('../utils/index');

const eventEmitter = new EventEmitter();

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('REQUEST-SEARCH-USER');
  await channel.assertQueue('REQUEST-SEARCH-PROJECT');
  await channel.assertQueue('REQUEST-GET-USER');
  await channel.assertQueue('REQUESTID-GET-USER');
  await channel.assertQueue('REQUEST-GET-PROJECT');
  await channel.assertQueue('REQUEST-GET-INFO-APARTMENT');
  await channel.assertQueue('REQUEST-APARTMENT-INFO');
  await channel.assertQueue('REQUEST-USER-ROLE-INFO');
};
connectRabbit();

exports.createRequest = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const requestIns = req.body;
    const date = new Date().valueOf();
    requestIns.code = `RQ${date}`;
    requestIns.createdBy = userId;
    requestIns.updatedBy = userId;
    const data = await Request.create(requestIns);
    await channel.sendToQueue(
      'FILE-IMAGE',
      Buffer.from(JSON.stringify({
        id: data.code,
        fileSave: { request: requestIns.descriptionFile },
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

exports.createRequestMobile = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const requestIns = req.body;
    const date = new Date().valueOf();
    requestIns.code = `RQ${date}`;
    requestIns.createdBy = userId;
    requestIns.updatedBy = userId;
    await channel.sendToQueue('APARTMENT-SEND-REQUEST', Buffer.from(JSON.stringify(requestIns.apartmentId)));
    await channel.consume('REQUEST-GET-INFO-APARTMENT', (search) => {
      const result = JSON.parse(search.content);
      channel.ack(search);
      eventEmitter.emit('csmInfoApartment', result);
    });
    setTimeout(() => eventEmitter.emit('csmInfoApartment'), 10000);
    // eslint-disable-next-line no-promise-executor-return
    const result = await new Promise((resolve) => eventEmitter.once('csmInfoApartment', resolve));
    requestIns.blockId = result.block._id;
    requestIns.projectId = result.block.projectId;
    const data = await Request.create(requestIns);
    await channel.sendToQueue(
      'FILE-IMAGE',
      Buffer.from(JSON.stringify({
        id: data.code,
        fileSave: { request: requestIns.descriptionFile },
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

exports.getListType = async (req, res) => {
  try {
    const { projectId } = req.query;
    const type = await Type.find();
    type.map((item) => {
      if (item.assign.length > 0) {
        const { assign } = item;
        const assignList = assign.filter((info) => info._id == projectId);
        if (assignList.length > 0 && assignList[0].staff) {
          item._doc.staff = assignList[0].staff;
        } else {
          item._doc.staff = null;
        }
      } else {
        item._doc.staff = null;
      }
      delete item._doc.assign;
    });

    return res.status(200).send({
      success: true,
      data: type,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.headers.userid;
    const requestIns = req.body;
    if (requestIns.rate) {
      requestIns.evaluate = {
        rate: requestIns.rate,
        explain: requestIns.explain ? requestIns.explain : null,
      };
    }
    requestIns.updatedBy = userId;
    const getProjectId = await Request.findById(requestId);
    if (requestIns.assign) {
      const type = await Type.findById(requestIns.assign);
      if (type && type.assign.length > 0) {
        const assign = type.assign.filter((item) => item._id == getProjectId.projectId.toString());
        if (assign[0] && assign[0].staff) {
          requestIns.staff = assign[0].staff;
        } else {
          return res.status(400).send({
            success: false,
            error: 'Chưa có nhân viên xử lý !',
          });
        }
      } else {
        return res.status(400).send({
          success: false,
          error: 'Chưa có nhân viên xử lý !',
        });
      }
    }
    const request = await Request.findByIdAndUpdate(requestId, requestIns);
    let fileSave = {};
    if (requestIns.descriptionFile) {
      fileSave = {
        newFile: requestIns.descriptionFile,
        oldFile: request.descriptionFile,
      };
      channel.sendToQueue('FILE-REQUEST-CHANGE', Buffer.from(JSON.stringify({
        id: request.code,
        fileSave,
        userId,
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

exports.getRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await Request.findById(requestId).select('-__v').populate('type', '-__v');
    const arrayUser = [request.createdBy];
    if (request.staff) {
      arrayUser.push(request.staff);
    }
    // get Information user
    await channel.sendToQueue('USER-SEND-REQUESTID', Buffer.from(JSON.stringify(arrayUser)));
    await channel.consume('REQUESTID-GET-USER', async (message) => {
      const dtum = JSON.parse(message.content);
      eventEmitter.emit('csmUserRequest', dtum);
      channel.ack(message);
    });
    setTimeout(() => eventEmitter.emit('csmUserRequest'), 10000);
    // eslint-disable-next-line no-promise-executor-return
    const dataConsume = await new Promise((resolve) => eventEmitter.once('csmUserRequest', resolve));

    // get info apartment, block
    if (request.apartmentId) {
      await channel.sendToQueue('REQUEST-APARTMENT-GET', Buffer.from(JSON.stringify(request.apartmentId)));
      await channel.consume('REQUEST-APARTMENT-INFO', (info) => {
        const dataApartment = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeRequest', dataApartment);
      });
      setTimeout(() => eventEmitter.emit('consumeRequest'), 10000);
      const apartmentData = await new Promise((resolve) => { eventEmitter.once('consumeRequest', resolve); });

      if (apartmentData) {
        request._doc.apartment = {
          _id: apartmentData._id,
          name: apartmentData.apartmentCode,
        };
        request._doc.block = {
          _id: apartmentData.block._id,
          name: apartmentData.block.name,
        };
        delete request._doc.blockId;
        delete request._doc.apartmentId;
      }
    }
    request._doc.createdBy = dataConsume[request.createdBy];
    if (request.staff) {
      request._doc.staff = dataConsume[request.staff];
    }

    return res.status(200).send({
      success: true,
      data: request,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.getListRequest = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const {
      limit, page, projectId, keywords, status,
    } = req.query;
    const perPage = parseInt(limit || 10, 10);
    const currentPage = parseInt(page || 1, 10);
    const query = { projectId };
    if (status) {
      query.status = status;
    }
    if (!projectId) {
      return res.status(400).send({
        success: false,
        error: 'Project Id is not valid!!!',
      });
    }

    // check role user
    await channel.sendToQueue('REQUEST-USER-ROLE-GET', Buffer.from(JSON.stringify(userId)));
    await channel.consume('REQUEST-USER-ROLE-INFO', (userDetail) => {
      const dataUser = JSON.parse(userDetail.content);
      channel.ack(userDetail);
      eventEmitter.emit('dataUser', dataUser);
    });
    setTimeout(() => eventEmitter.emit('dataUser'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('dataUser', resolve); });

    if (userData && userData.role.value === 'CUSTOMER') {
      query.createdBy = userId;
    }

    if (keywords) {
      query.$or = [
        { content: { $regex: keywords, $options: 'i' } },
        { code: { $regex: keywords, $options: 'i' } },
      ];
      // set up field search in user
      const dataSearch = {
        keywords,
        field: [{ value: 'phone', type: 'string' }, { value: 'name', type: 'string' }],
      };
      // get list userId match keywords
      await channel.sendToQueue('USER-SEARCH-REQUEST', Buffer.from(JSON.stringify(dataSearch)));
      await channel.consume('REQUEST-SEARCH-USER', (search) => {
        const result = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('csmResultSearch', result);
      });
      setTimeout(() => eventEmitter.emit('csmResultSearch'), 10000);
      const arraySearch = await new Promise((resolve) => { eventEmitter.once('csmResultSearch', resolve); });
      const arrayUserIdSearch = convertArrayField({ array: arraySearch, field: '_id' });
      if (arrayUserIdSearch.length > 0) {
        query.$or.push(
          { createdBy: { $in: arrayUserIdSearch } },
          { staff: { $in: arrayUserIdSearch } },
        );
      }
      // get list info project match keywords
      await channel.sendToQueue('PROJECT-SEARCH-REQUEST', Buffer.from(JSON.stringify({ projectId, keywords })));
      await channel.consume('REQUEST-SEARCH-PROJECT', (search) => {
        const result = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('csmProjectSearch', result);
      });
      setTimeout(() => eventEmitter.emit('csmProjectSearch'), 10000);
      // eslint-disable-next-line no-promise-executor-return
      const resultProject = await new Promise((resolve) => eventEmitter.once('csmProjectSearch', resolve));
      const { block, apartment } = resultProject;
      if (block.length > 0) {
        query.$or.push({ blockId: { $in: block } });
      }
      if (apartment.length > 0) {
        query.$or.push({ apartmentId: { $in: apartment } });
      }

      // search by keywords type
      const type = await Type.find({ text: { $regex: keywords, $options: 'i' } });
      const arrayTypeId = convertArrayField({ array: type, field: '_id' });
      if (arrayTypeId.length > 0) {
        query.$or.push({ createdBy: { $in: arrayTypeId } });
      }
    }

    const request = await Request.find(query).sort({ _id: -1 })
      .select('-__v')
      .populate('type', '-__v -assign')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    // Get staff id list
    if (request.type) {
      request.map((item) => {
        const { assign } = item.type;
        if (assign.length > 0) {
          const assignList = assign.filter((info) => info._id == projectId);
          if (assignList.length > 0 && assignList[0].staff) {
            item.type._doc.staff = assignList[0].staff;
          } else {
            item.type._doc.staff = null;
          }
        } else {
          item.type._doc.staff = null;
        }
        delete item.type._doc.assign;
      });
    }

    // format data return
    if (request.length > 0) {
      // array id user update
      const arrayCreatedBy = convertArrayField({ array: request, field: 'createdBy' });
      const arrayStaff = convertArrayField({ array: request, field: 'staff' });
      const mergeArray = [...arrayCreatedBy, ...arrayStaff];

      // remove id duplicate
      const arrayUser = mergeArray.filter((item, index) => mergeArray.indexOf(item) === index);

      // get Information user
      await channel.sendToQueue('USER-SEND-REQUEST', Buffer.from(JSON.stringify(arrayUser)));
      await channel.consume('REQUEST-GET-USER', async (message) => {
        const dtum = JSON.parse(message.content);
        eventEmitter.emit('csmUserRequest', dtum);
        channel.ack(message);
      });
      setTimeout(() => eventEmitter.emit('csmUserRequest'), 10000);
      const dataConsume = await new Promise((resolve) => { eventEmitter.once('csmUserRequest', resolve); });

      // get Information project
      const arrayApartment = convertArrayField({ array: request, field: 'apartmentId' });
      await channel.sendToQueue(
        'PROJECT-SEND-REQUEST',
        Buffer.from(JSON.stringify(arrayApartment)),
      );
      await channel.consume('REQUEST-GET-PROJECT', async (message) => {
        const dtum = JSON.parse(message.content);
        eventEmitter.emit('csmProjectRequest', dtum);
        channel.ack(message);
      });
      setTimeout(() => eventEmitter.emit('csmProjectRequest'), 10000);
      const projectConsume = await new Promise((resolve) => { eventEmitter.once('csmProjectRequest', resolve); });
      const projectJson = convertJsonKey({ array: projectConsume, key: '_id' });

      // format data return
      request.map(async (item) => {
        const element = item;

        if (projectConsume.length > 0) {
          element._doc.apartment = projectJson[element.apartmentId];
          delete element._doc.apartmentId;
        }
        if (dataConsume) {
          element._doc.createdBy = dataConsume[element.createdBy];
          if (element.staff) {
            element._doc.staff = dataConsume[element.staff];
          }
        }
        return element;
      });
    }
    const total = await Request.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);
    return res.status(200).send({
      success: true,
      data: request,
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

exports.assignStaffType = async (req, res) => {
  try {
    const dataIns = req.body;
    const listId = Array.from(dataIns, ({ _id }) => _id);
    const insData = dataIns.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});
    const assign = await Type.find({ _id: { $in: listId } });

    // format data save
    assign.map(async (info) => {
      // No staff and no project
      if (info.assign.length == 0) {
        info.assign.push({
          _id: insData[info._id].projectId, staff: insData[info._id].staff,
        });
      }

      // There is no handling staff in the project
      const project = info.assign.find((item) => item._id == insData[info._id].projectId);
      if (!project) {
        info.assign.push({
          _id: insData[info._id].projectId, staff: insData[info._id].staff,
        });
      }

      // Change the processing staff
      const dataAssign = [{ _id: insData[info._id].projectId, staff: insData[info._id].staff }];
      const assignData = info.assign.map((obj) => dataAssign.find((o) => o._id == obj._id) || obj);
      info.assign = assignData;
    });

    // Update processing staff for each type of request according to the project
    const listUpdatenameAndProjectId = assign.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { assign: item.assign } },
      },
    }));
    await Type.bulkWrite(listUpdatenameAndProjectId);

    return res.status(200).send({
      success: true,
      data: assign,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
