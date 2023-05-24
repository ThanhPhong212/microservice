/* eslint-disable eqeqeq */
/* eslint-disable radix */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');

const eventEmitter = new EventEmitter();
const Apartment = require('../models/apartment');
const Block = require('../models/block');
const TypeApartment = require('../models/typeApartment');
const connect = require('../lib/rabbitMQ');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('RESIDENT-INFO');
  await channel.assertQueue('OWNER-INFO');
  await channel.assertQueue('USER-SEARCH-INFO');
  await channel.assertQueue('APARTMENT-GET');
  await channel.assertQueue('APARTMENT-REGISTER-GET');
  await channel.assertQueue('APARTMENT-DETAILS-GET');
  await channel.assertQueue('APARTMENT-SEND-REQUEST');
  await channel.assertQueue('PARKING-APARTMENT-GET');
  await channel.assertQueue('CARD-APARTMENT-GET');
  await channel.assertQueue('CARD-SEARCH-APARTMENT-GET');
  await channel.assertQueue('CARD-DETAIL-APARTMENT-GET');
  await channel.assertQueue('PARKING-BLOCKID-GET');
  await channel.assertQueue('REQUEST-APARTMENT-GET');
  await channel.assertQueue('APARTMENT-DATA-USER');
  await channel.assertQueue('FEE-SEARCH-APARTMENT-GET');
  await channel.assertQueue('FEE-APARTMENT-GET');
  await channel.assertQueue('FEE-CREATE-APARTMENT-GET');
  await channel.assertQueue('FEE-CREATE-VEHICLE-APARTMENT-GET');
  await channel.assertQueue('FEE-WATER-APARTMENT-GET');
  await channel.assertQueue('ORDER-APARTMENT-GET');
  await channel.assertQueue('ORDER-LIST-APARTMENT-GET');
  await channel.assertQueue('ORDER-DETAIL-APARTMENT-GET');
  await channel.assertQueue('USER-DELETE-GET');
  await channel.assertQueue('ORDER-EXPORT-APARTMENT-GET');
  await channel.assertQueue('ACCOUNTING-LIST-APARTMENT-GET');
  await channel.assertQueue('APARTMENT-LIST-RESIDENT-INFO');
  await channel.assertQueue('ORDER-LIST-APARTMENT-OWNER-GET');
  await channel.assertQueue('ORDER-LIST-APARTMENT-USER-GET');
  await channel.assertQueue('PAYMENT-APARTMENT-GET');
  await channel.assertQueue('STATISTICS-APARTMENT-GET');
  await channel.assertQueue('USER-APARTMENT-GET');
  await channel.assertQueue('ORDER-FILTER-BLOCK-GET');
  await channel.assertQueue('ORDER-SENT-BLOCK-GET');
  await channel.assertQueue('FEE-FILTER-BLOCK-GET');
  await channel.assertQueue('ACCOUNTING-FILTER-BLOCK-GET');
  await channel.assertQueue('RECEIPT-EXPORT-APARTMENT-GET');
};

const listApartmentID = async (arrayApartmentId) => {
  try {
    const dataApartment = await Apartment.find({ _id: { $in: arrayApartmentId } })
      .populate('block')
      .lean();
    const apartmentData = dataApartment.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});
    return apartmentData;
  } catch (error) {
    return null;
  }
};

const detailApartment = async (apartmentId) => {
  try {
    const apartment = await Apartment.findById(apartmentId).populate('block');
    return apartment;
  } catch (error) {
    return null;
  }
};

const searchApartment = async (apartmentSearch) => {
  try {
    const apartment = await Apartment.find({
      $or: [
        { apartmentCode: { $regex: apartmentSearch.keywords, $options: 'i' } },
        { owner: { $in: apartmentSearch.dataUserId } },
      ],
    }).populate('block');
    const take = apartment.filter((item) => item.block.projectId == apartmentSearch.projectId);
    const listIdApartment = Array.from(take, ({ _id }) => _id);
    return listIdApartment;
  } catch (error) {
    return null;
  }
};

connectRabbit().then(() => {
  channel.consume('RECEIPT-EXPORT-APARTMENT-GET', async (data) => {
    try {
      const listIdApartment = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await listApartmentID(listIdApartment);
      channel.sendToQueue('RECEIPT-EXPORT-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('RECEIPT-EXPORT-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ACCOUNTING-FILTER-BLOCK-GET', async (data) => {
    try {
      const block = JSON.parse(data.content);
      channel.ack(data);
      const listApartment = await Apartment.find({ block });
      let listApartmentId = [];
      if (listApartment.length > 0) {
        listApartmentId = Array.from(listApartment, ({ _id }) => _id);
      }
      channel.sendToQueue('ACCOUNTING-FILTER-BLOCK-INFO', Buffer.from(JSON.stringify(listApartmentId)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('ACCOUNTING-FILTER-BLOCK-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-FILTER-BLOCK-GET', async (data) => {
    try {
      const block = JSON.parse(data.content);
      channel.ack(data);
      const listApartment = await Apartment.find({ block });
      let listApartmentId = [];
      if (listApartment.length > 0) {
        listApartmentId = Array.from(listApartment, ({ _id }) => _id);
      }
      channel.sendToQueue('FEE-FILTER-BLOCK-INFO', Buffer.from(JSON.stringify(listApartmentId)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-FILTER-BLOCK-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-SENT-BLOCK-GET', async (data) => {
    try {
      const block = JSON.parse(data.content);
      channel.ack(data);
      const listApartment = await Apartment.find({ block });
      let listApartmentId = [];
      if (listApartment.length > 0) {
        listApartmentId = Array.from(listApartment, ({ _id }) => _id);
      }
      channel.sendToQueue('ORDER-SENT-BLOCK-INFO', Buffer.from(JSON.stringify(listApartmentId)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('ORDER-SENT-BLOCK-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-FILTER-BLOCK-GET', async (data) => {
    try {
      const block = JSON.parse(data.content);
      channel.ack(data);
      const listApartment = await Apartment.find({ block });
      let listApartmentId = [];
      if (listApartment.length > 0) {
        listApartmentId = Array.from(listApartment, ({ _id }) => _id);
      }
      channel.sendToQueue('ORDER-FILTER-BLOCK-INFO', Buffer.from(JSON.stringify(listApartmentId)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('ORDER-FILTER-BLOCK-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('USER-APARTMENT-GET', async (data) => {
    try {
      const { projectId, userId } = JSON.parse(data.content);
      channel.ack(data);
      const listIdBlock = await Block.find({ projectId });
      const listBlockId = Array.from(listIdBlock, ({ _id }) => _id);
      const dataApartment = await Apartment.find({
        block: { $in: listBlockId },
        $or: [
          { owner: { $in: userId } },
          { relativeOwners: { $in: userId } },
          { tenants: { $in: userId } },
          { memberTenants: { $in: userId } },
        ],
      }).populate('block');
      channel.sendToQueue('USER-APARTMENT-INFO', Buffer.from(JSON.stringify(dataApartment)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('USER-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('STATISTICS-APARTMENT-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const dataApartment = await Apartment.find({ _id: { $in: apartmentId } })
        .populate('block')
        .lean();
      channel.sendToQueue('STATISTICS-APARTMENT-INFO', Buffer.from(JSON.stringify(dataApartment)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('STATISTICS-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('PAYMENT-APARTMENT-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await detailApartment(apartmentId);
      channel.sendToQueue('PAYMENT-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('PAYMENT-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-LIST-APARTMENT-USER-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      channel.ack(data);
      const ApartmentOwner = await Apartment.find({ owner: userId })
        .select('apartmentCode');
      channel.sendToQueue('ORDER-LIST-APARTMENT-USER-INFO', Buffer.from(JSON.stringify(ApartmentOwner)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('ORDER-LIST-APARTMENT-USER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-LIST-APARTMENT-OWNER-GET', async (data) => {
    try {
      const userId = JSON.parse(data.content);
      channel.ack(data);
      const ApartmentOwner = await Apartment.find({ owner: userId })
        .populate({
          path: 'block',
          populate: {
            path: 'projectId',
            select: 'name thumbnail',
          },
          select: 'name',
        })
        .select('apartmentCode project');
      ApartmentOwner.map((item) => {
        item._doc.picture = item.block.projectId.thumbnailPath;
        delete item._doc.block;
        return item;
      });
      channel.sendToQueue('ORDER-LIST-APARTMENT-OWNER-INFO', Buffer.from(JSON.stringify(ApartmentOwner)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('ORDER-LIST-APARTMENT-OWNER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ACCOUNTING-LIST-APARTMENT-GET', async (data) => {
    try {
      const listIdApartment = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await listApartmentID(listIdApartment);
      channel.sendToQueue('ACCOUNTING-LIST-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('ACCOUNTING-LIST-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-EXPORT-APARTMENT-GET', async (data) => {
    try {
      const listIdApartment = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await listApartmentID(listIdApartment);
      channel.sendToQueue('ORDER-EXPORT-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('ORDER-EXPORT-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('USER-DELETE-GET', async (data) => {
    try {
      const info = JSON.parse(data.content);
      channel.ack(data);
      const block = await Block.find({ projectId: info.projectId });
      const blockId = Array.from(block, ({ _id }) => _id);
      const apartment = await Apartment.find({
        block: { $in: blockId },
        $or: [
          { owner: { $in: info.userId } },
          { tenants: { $in: info.userId } },
          { relativeOwners: { $in: info.userId } },
          { memberTenants: { $in: info.userId } },
        ],
      });
      channel.sendToQueue('USER-DELETE-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('USER-DELETE-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-DETAIL-APARTMENT-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await detailApartment(apartmentId);
      channel.sendToQueue('ORDER-DETAIL-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('ORDER-DETAIL-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-LIST-APARTMENT-GET', async (data) => {
    try {
      const listIdApartment = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await listApartmentID(listIdApartment);
      channel.sendToQueue('ORDER-LIST-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('ORDER-LIST-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('ORDER-APARTMENT-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await detailApartment(apartmentId);
      channel.sendToQueue('ORDER-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('ORDER-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-WATER-APARTMENT-GET', async (data) => {
    try {
      const projectId = JSON.parse(data.content);
      channel.ack(data);

      const block = await Block.find({ projectId });

      const listIdBlock = Array.from(block, ({ _id }) => _id);

      const apartment = await Apartment.find({ block: { $in: listIdBlock } }).select('_id areaApartment apartmentCode block electricId waterId');
      channel.sendToQueue('FEE-WATER-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-WATER-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-CREATE-VEHICLE-APARTMENT-GET', async (data) => {
    try {
      const projectId = JSON.parse(data.content);
      channel.ack(data);

      const block = await Block.find({ projectId });

      const listIdBlock = Array.from(block, ({ _id }) => _id);

      const apartment = await Apartment.find({ block: { $in: listIdBlock } }).select('_id block');

      const apartmentData = apartment.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      channel.sendToQueue('FEE-CREATE-VEHICLE-APARTMENT-INFO', Buffer.from(JSON.stringify(apartmentData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-CREATE-VEHICLE-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-CREATE-APARTMENT-GET', async (data) => {
    try {
      const projectId = JSON.parse(data.content);
      channel.ack(data);

      const block = await Block.find({ projectId });

      const listIdBlock = Array.from(block, ({ _id }) => _id);

      const apartment = await Apartment.find({ block: { $in: listIdBlock } }).select('_id areaApartment block');

      channel.sendToQueue('FEE-CREATE-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('FEE-CREATE-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-APARTMENT-GET', async (data) => {
    try {
      const arrayApartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await listApartmentID(arrayApartmentId);
      channel.sendToQueue('FEE-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('FEE-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('FEE-SEARCH-APARTMENT-GET', async (data) => {
    try {
      const apartmentSearch = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await searchApartment(apartmentSearch);
      channel.sendToQueue('FEE-SEARCH-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('FEE-SEARCH-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('REQUEST-APARTMENT-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await detailApartment(apartmentId);
      channel.sendToQueue('REQUEST-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('REQUEST-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CARD-DETAIL-APARTMENT-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await detailApartment(apartmentId);
      channel.sendToQueue('CARD-DETAIL-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('CARD-DETAIL-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CARD-SEARCH-APARTMENT-GET', async (data) => {
    try {
      const apartmentSearch = JSON.parse(data.content);
      const listIdApartment = await searchApartment(apartmentSearch);
      channel.sendToQueue('CARD-SEARCH-APARTMENT-INFO', Buffer.from(JSON.stringify(listIdApartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('CARD-SEARCH-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('PARKING-APARTMENT-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      const apartment = await Apartment.findById(apartmentId).populate('block');

      channel.sendToQueue('PARKING-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('PARKING-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
    channel.ack(data);
  });

  channel.consume('PARKING-BLOCKID-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await Apartment.findById(apartmentId).populate('block');
      channel.sendToQueue('PARKING-BLOCKID-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('PARKING-BLOCKID-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('CARD-APARTMENT-GET', async (data) => {
    try {
      const arrayApartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await listApartmentID(arrayApartmentId);
      channel.sendToQueue('CARD-APARTMENT-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('CARD-APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('APARTMENT-DETAILS-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await Apartment.findById(apartmentId).populate('block');

      channel.sendToQueue('APARTMENT-DETAILS-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('APARTMENT-DETAILS-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('APARTMENT-REGISTER-GET', async (data) => {
    try {
      const apartmentId = JSON.parse(data.content);
      channel.ack(data);
      const apartment = await Apartment.findById(apartmentId).populate('block');

      channel.sendToQueue('APARTMENT-REGISTER-INFO', Buffer.from(JSON.stringify(apartment)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('APARTMENT-REGISTER-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('APARTMENT-GET', async (data) => {
    try {
      const apartment = JSON.parse(data.content);
      channel.ack(data);
      const dataApartment = await Apartment.find({ _id: { $in: apartment } })
        .select('apartmentCode block')
        .populate({
          path: 'block',
          select: 'name',
        })
        .lean();
      const apartmentData = dataApartment.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      channel.sendToQueue('APARTMENT-INFO', Buffer.from(JSON.stringify(apartmentData)));
    } catch (error) {
      const dataAvailable = [];
      channel.sendToQueue('APARTMENT-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('APARTMENT-SEND-REQUEST', async (data) => {
    try {
      const id = JSON.parse(data.content);
      channel.ack(data);
      const dataApartment = await Apartment.findById(id).populate('block');
      if (dataApartment) {
        channel.sendToQueue('REQUEST-GET-INFO-APARTMENT', Buffer.from(JSON.stringify(dataApartment)));
      }
    } catch (error) {
      channel.sendToQueue('REQUEST-GET-INFO-APARTMENT', Buffer.from(JSON.stringify(null)));
    }
  });
});

const createApartment = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const apartmentIns = req.body;

    apartmentIns.createdBy = userId;

    // kiểm tra sô lượng căn hộ trong block
    const countApartmentInBlock = await Apartment.countDocuments({ block: apartmentIns.block });
    const block = await Block.findById(apartmentIns.block);
    if (countApartmentInBlock >= block.numberApartment) {
      return res.status(400).send({
        success: false,
        error: 'Vượt quá số lượng căn hộ cho phép của block!',
      });
    }

    // kiểm tra căn hộ đã tồn tại hay chưa
    const apartmentCode = await Apartment.findOne({ block: apartmentIns.block, apartmentCode: apartmentIns.apartmentCode }).select('apartmentCode');
    if (apartmentCode) {
      return res.status(400).send({
        success: false,
        error: 'Căn hộ đã tồn tại!',
      });
    }
    const getProjectId = await Block.findById(apartmentIns.block);
    await channel.sendToQueue('USER-CREATE-APARTMENT-GET', Buffer.from(JSON.stringify({ owner: apartmentIns.owner, projectId: getProjectId.projectId })));
    apartmentIns.project = getProjectId.projectId;
    const apartment = await Apartment.create(apartmentIns);
    return res.status(200).send({
      success: true,
      data: apartment,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const listApartment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      limit, page, keywords, block, typeApartment,
    } = req.query;
    const perPage = parseInt(limit || 10);
    const currentPage = parseInt(page || 1);
    const query = {};

    const blockProject = await Block.find({ projectId }).select('_id name');
    const arrBlock = Array.from(blockProject, ({ _id }) => _id);
    query.block = { $in: arrBlock };

    // Filter by block
    if (block) { query.block = block; }

    // Filter by type of apartment
    if (typeApartment) { query.typeApartment = typeApartment; }

    // Search by keywords
    if (keywords) {
      // setup search by block
      const blockSearch = blockProject.filter((item) => item.name.match(new RegExp(keywords, 'i')));
      const blockIdSearch = Array.from(blockSearch, ({ _id }) => _id);

      // setup search by type of apartment
      const typeSearch = await TypeApartment.find({ projectId, name: { $regex: keywords, $options: 'i' } }).select('_id');
      const typeIdSearch = Array.from(typeSearch, ({ _id }) => _id);

      // setup search by owner
      await channel.sendToQueue('USER-SEARCH', Buffer.from(JSON.stringify(keywords)));
      await channel.consume('USER-SEARCH-INFO', (search) => {
        const dataSearch = JSON.parse(search.content);
        channel.ack(search);
        eventEmitter.emit('consumeDone', dataSearch);
      });
      setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
      const searchOwner = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });
      const ownerSearch = Array.from(searchOwner, ({ _id }) => _id);

      // setup search by status
      const status = new RegExp(keywords, 'i');
      let statusSearch;
      if (status.test('đang hoạt động')) {
        statusSearch = true;
      }
      if (status.test('bảo trì')) {
        statusSearch = false;
      }
      query.$or = [
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$areaApartment' },
              regex: keywords,
            },
          },
        },
        { apartmentCode: { $regex: keywords, $options: 'i' } },
        { block: { $in: blockIdSearch } },
        { typeApartment: { $in: typeIdSearch } },
        { owner: { $in: ownerSearch } },
        { status: statusSearch },
      ];
    }

    const total = await Apartment.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    // enforcement
    const data1 = await Apartment.find(query).sort({ _id: -1 })
      .select('-__v -tenant -member -description -createdBy -updatedBy')
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .populate('typeApartment block', 'name');

    // rabbitMQ
    await channel.sendToQueue('OWNER-GET', Buffer.from(JSON.stringify(data1)));
    await channel.consume('OWNER-INFO', (info) => {
      const dtum = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consume', dtum);
    });
    setTimeout(() => eventEmitter.emit('consume'), 10000);
    const info = await new Promise((resolve) => { eventEmitter.once('consume', resolve); });

    // format data
    const data = {};
    data.info = info ?? [];
    data.active = await Apartment.countDocuments({ block: { $in: arrBlock }, status: true });
    data.totalApartment = await Apartment.countDocuments({ block: { $in: arrBlock } });
    data.maintenance = data.totalApartment - data.active;

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

const getApartmentById = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const apartment = await Apartment.findById(apartmentId)
      .select('-__v')
      .populate(
        'typeApartment block project',
        '-__v -numberApartment -quantity -isDeleted -projectId -createdAt -createdBy -updatedAt -updatedBy',
      );

    // Count the number of residents
    let owner = 0;
    let relativeOwners = 0;
    let tenants = 0;
    let memberTenants = 0;
    if (apartment && apartment.owner) owner = 1;
    if (apartment && apartment.relativeOwners) relativeOwners = apartment.relativeOwners.length;
    if (apartment && apartment.tenants) tenants = apartment.tenants.length;
    if (apartment && apartment.memberTenants) memberTenants = apartment.memberTenants.length;

    // rabbitMQ
    channel.sendToQueue('RESIDENT-GET', Buffer.from(JSON.stringify(apartment)));
    channel.consume('RESIDENT-INFO', async (info) => {
      const dtum = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeDone', dtum);
    });
    setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
    const data = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });

    // attach the Role at the request of FE
    if (data.owner) { data.owner.role = 'owner'; }

    if (data.relativeOwners && data.relativeOwners.length > 0) {
      data.relativeOwners.map((item) => { item.role = 'relativeOwners'; return item; });
    }
    if (data.tenants && data.tenants.length > 0) {
      data.tenants.map((item) => { item.role = 'tenants'; return item; });
    }

    if (data.memberTenants && data.memberTenants.length > 0) {
      data.memberTenants.map((item) => { item.role = 'memberTenants'; return item; });
    }
    // format data
    if (Object.values(data).length !== 0) {
      data.resident = [data.owner];
      data.resident = data.resident.concat(data.tenants, data.memberTenants, data.relativeOwners);

      data.amountResident = {
        owner,
        relativeOwners,
        tenants,
        memberTenants,
        total: owner + relativeOwners + tenants + memberTenants,
      };
    }

    return res.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};

const editApartmentById = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const apartmentIns = req.body;
    const infoApartment = await Apartment.findById(apartmentId)
      .populate({
        path: 'block',
        populate: {
          path: 'projectId',
          select: 'name thumbnail',
        },
        select: 'name',
      });
    let apartmentCode;
    if (infoApartment.block._id.toString() !== apartmentIns.block
    || infoApartment.apartmentCode !== apartmentIns.apartmentCode) {
      apartmentCode = await Apartment.findOne({
        block: apartmentIns.block,
        apartmentCode: apartmentIns.apartmentCode,
      }).select('apartmentCode');
    }
    if (apartmentCode) {
      return res.status(400).send({
        success: false,
        error: 'Căn hộ đã tồn tại!',
      });
    }

    // kiểm tra sô lượng căn hộ trong block
    let countApartmentInBlock;
    let block;
    if (infoApartment.block._id.toString() !== apartmentIns.block) {
      countApartmentInBlock = await Apartment.countDocuments({ block: apartmentIns.block });
      block = await Block.findById(apartmentIns.block);
    }
    if (block && countApartmentInBlock && countApartmentInBlock >= block.numberApartment) {
      return res.status(400).send({
        success: false,
        error: 'Vượt quá số lượng căn hộ cho phép của block!',
      });
    }

    // check deviceId
    let apartmentWaterId;
    if (apartmentIns.waterId) {
      apartmentWaterId = await Apartment.findOne({
        waterId: apartmentIns.waterId,
      });
    }
    let apartmentElectricId;
    if (apartmentIns.electricId) {
      apartmentElectricId = await Apartment.findOne({
        electricId: apartmentIns.electricId,
      });
    }
    if (apartmentWaterId || apartmentElectricId) {
      return res.status(400).send({
        success: false,
        error: 'Mã thiết bị không được trùng !',
      });
    }

    const listResidents = apartmentIns.relativeOwners.concat(
      apartmentIns.tenants,
      apartmentIns.memberTenants,
    );
    const projectId = infoApartment.block.projectId._id;
    const listPhone = Array.from(listResidents, ({ phone }) => phone);

    await channel.sendToQueue('APARTMENT-CREATE-USER', Buffer.from(JSON.stringify({
      projectId, listPhone, listResidents,
    })));
    await channel.consume('APARTMENT-DATA-USER', (info) => {
      const user = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeDataUser', user);
    });
    setTimeout(() => eventEmitter.emit('consumeDataUser'), 10000);
    const dataUser = await new Promise((resolve) => { eventEmitter.once('consumeDataUser', resolve); });

    const userData = dataUser.reduce((acc, cur) => {
      const id = cur.phone;
      return { ...acc, [id]: cur };
    }, {});

    const relativeOwner = apartmentIns.relativeOwners;
    const tenant = apartmentIns.tenants;
    const memberTenant = apartmentIns.memberTenants;

    apartmentIns.relativeOwners = [];
    apartmentIns.tenants = [];
    apartmentIns.memberTenants = [];

    relativeOwner.map((item) => {
      apartmentIns.relativeOwners.push(userData[item.phone]._id);
      return item;
    });

    tenant.map((item) => {
      apartmentIns.tenants.push(userData[item.phone]._id);
      return item;
    });

    memberTenant.map((item) => {
      apartmentIns.memberTenants.push(userData[item.phone]._id);
      return item;
    });

    const apartment = await Apartment.findByIdAndUpdate(apartmentId, apartmentIns);
    return res.status(200).send({
      success: true,
      data: apartment,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const listApartmentByUserId = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const apartment = await Apartment.find({ owner: userId })
      .populate({
        path: 'block typeApartment',
        populate: {
          path: 'projectId',
          select: 'name thumbnail',
        },
        select: 'name',
      })
      .select('apartmentCode typeApartment blockName project');
    apartment.map((item) => {
      const element = item;
      element._doc.project = element.block.projectId;
      element._doc.block = {
        _id: element.block._id,
        name: element.block.name,
      };
      element._doc.typeApartment = {
        _id: element.typeApartment._id,
        name: element.typeApartment.name,
      };
      return item;
    });
    return res.status(200).send({
      success: true,
      data: apartment,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const userGetApartmentById = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const apartment = await Apartment.findById(apartmentId)
      .select('-__v -owner -tenant -member -status')
      .populate({
        path: 'block',
        populate: {
          path: 'projectId',
          select: 'name -_id description',
        },
        select: 'name -_id',
      })
      .populate({
        path: 'typeApartment',
        select: 'name -_id',
      });
    if (apartment) {
      /* eslint-disable*/
      apartment._doc.blockName = apartment.block.name;
      apartment._doc.projectName = apartment.block.projectId.name;
      apartment._doc.projectDescription = apartment.block.projectId.description;
      apartment._doc.thumbnailPath = apartment.block.projectId.thumbnailPath;
      apartment._doc.typeApartment = apartment.typeApartment.name;
      delete apartment._doc.block;
      /* eslint-disable*/
    }

    return res.status(200).send({
      success: true,
      data: apartment,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};


const getApartmentByBlock = async (req, res) => {
  try {
    const { blockId } = req.params;
    const apartment = await Apartment.find({ block: blockId })
      .select('apartmentCode')
    return res.status(200).send({
      success: true,
      data: apartment,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};

const listResidentInApartment= async(req,res)=>{
  try {
    const {apartmentId}=req.params
    const apartment = await Apartment.findById(apartmentId)
    let listResidentId=[]
     listResidentId= listResidentId.concat( 
      apartment.relativeOwners, apartment.tenants,
      apartment.memberTenants
    )
    listResidentId.push(apartment.owner)
    await channel.sendToQueue('APARTMENT-LIST-RESIDENT-GET', Buffer.from(JSON.stringify(listResidentId)));
    await channel.consume('APARTMENT-LIST-RESIDENT-INFO', (info) => {
      const user = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeDataUser', user);
    });
    setTimeout(() => eventEmitter.emit('consumeDataUser'), 10000);
    const dataUser = await new Promise((resolve) => { eventEmitter.once('consumeDataUser', resolve); });

    const data=[]
    listResidentId.map(item=>{
      const listResident={
        _id: dataUser[item]._id,
        name: dataUser[item].name,
        phone: dataUser[item].phone,
        role: item == apartment.owner? 'Chủ sở hữu':
         apartment.relativeOwners.includes(item)?'Người thân chủ sở hữu' :
         apartment.tenants.includes(item)?'Khách thuê':'Thành viên khách thuê'
      }
      data.push(listResident)
    })
    return res.status(200).send({
      success: true,
      data
    })
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message
    })
  }
}

module.exports = {
  createApartment,
  listApartment,
  getApartmentById,
  editApartmentById,
  listApartmentByUserId,
  userGetApartmentById,
  getApartmentByBlock,
  listResidentInApartment
};
