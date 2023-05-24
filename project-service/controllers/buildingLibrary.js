/* eslint-disable array-callback-return */
/* eslint-disable radix */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const BuildingLibrary = require('../models/buildingLibrary');
const logger = require('../utils/logger');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');

let channel;
let imageCKEditor = [];

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('LIBRARY-USER-INFO');
  await channel.assertQueue('LIBRARY-DETAIL-USER-INFO');
  await channel.assertQueue('CKEDITOR-LIBRARY');
};

connectRabbit().then(() => {
  channel.consume('CKEDITOR-LIBRARY', async (data) => {
    try {
      const image = JSON.parse(data.content);
      channel.ack(data);
      imageCKEditor.push(image);
    } catch (error) {
      logger.error(error.message);
    }
  });
});

// eslint-disable-next-line consistent-return
exports.createBuildingLibrary = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const libraryIns = req.body;
    const imageAdd = [];
    libraryIns.createdBy = userId;
    libraryIns.updatedBy = userId;

    // check image
    imageCKEditor.map((item) => {
      const checkImage = libraryIns.description.includes(item);
      if (checkImage) {
        libraryIns.description = libraryIns.description.replace(item, `library/ckEditor/${item}`);
        imageAdd.push(item);
      }
    });
    imageCKEditor = [];
    libraryIns.imageCKEditor = imageAdd;
    await channel.sendToQueue('CKEDITOR-CHANGE', Buffer.from(JSON.stringify({ imageAdd, type: 'library' })));

    const data = await BuildingLibrary.create(libraryIns);
    await channel.sendToQueue(
      'FILE',
      Buffer.from(JSON.stringify({
        id: data._id,
        fileSave: { library: libraryIns.file },
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

// eslint-disable-next-line consistent-return
exports.editBuildingLibrary = async (req, res) => {
  try {
    const { libraryId } = req.params;
    const libraryIns = req.body;
    const userId = req.headers.userid;
    let imageAdd = [];

    // check file
    const libraryOld = await BuildingLibrary.findById(libraryId);
    const checkImage = imageCKEditor.concat(libraryOld.imageCKEditor);
    checkImage.map((item) => {
      const check = libraryIns.description.includes(item);
      if (check) {
        libraryIns.description = libraryIns.description.replace(
          `${process.env.IMAGE_URL}/${item}`,
          `${process.env.IMAGE_URL}/library/ckEditor/${item}`,
        );
        imageAdd.push(item);
      }
    });

    libraryIns.updatedBy = userId;
    libraryIns.imageCKEditor = imageAdd;

    // Delete overlapping elements
    imageAdd = [...new Set(imageAdd)];
    imageCKEditor = [];

    // File change
    channel.sendToQueue('CKEDITOR-CHANGE', Buffer.from(JSON.stringify({
      imageAdd, imageOld: libraryOld.imageCKEditor, type: 'library',
    })));
    const library = await BuildingLibrary.findByIdAndUpdate(libraryId, libraryIns);

    let fileSave = {};
    if (libraryIns.file) {
      fileSave = {
        newFile: libraryIns.file,
        oldFile: library.file,
      };
      channel.sendToQueue('FILE-LIBRARY-CHANGE', Buffer.from(JSON.stringify({
        id: library._id,
        fileSave,
        userId,
      })));
    } else {
      const deleteImgEditor = [];
      if (library.file) {
        const deleteFile = { id: library._id, fileName: library.file };
        channel.sendToQueue('CKEDITOR-DELETE', Buffer.from(JSON.stringify({ deleteImgEditor, deleteFile, type: 'library' })));
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

exports.getBuildingLibrary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      limit, page,
    } = req.query;
    const perPage = parseInt(limit || 7);
    const currentPage = parseInt(page || 1);

    const library = await BuildingLibrary.find({ projectId })
      .sort({ _id: -1 })
      .select('-__v -projectId -description')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    // get list userID
    const listUserId = Array
      .from(library, ({ createdBy }) => createdBy)
      .concat(Array.from(library, ({ updatedBy }) => updatedBy));

    // rabbit MQ
    await channel.sendToQueue('LIBRARY-USER-GET', Buffer.from(JSON.stringify(listUserId)));
    await channel.consume('LIBRARY-USER-INFO', (info) => {
      const dataUSer = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeDone', dataUSer);
    });
    setTimeout(() => eventEmitter.emit('consumeDone'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('consumeDone', resolve); });

    // format data
    library.map((item) => {
      const element = item;
      element._doc.createdBy = {
        name: userData[element.createdBy] ? userData[element.createdBy].name : null,
        phone: userData[element.createdBy] ? userData[element.createdBy].phone : null,
      };
      element._doc.updatedBy = {
        name: userData[element.updatedBy] ? userData[element.updatedBy].name : null,
        phone: userData[element.updatedBy] ? userData[element.updatedBy].phone : null,
      };
      return element;
    });

    // Calculate the total page and page number
    const total = await BuildingLibrary.countDocuments({ projectId });
    const totalPage = Math.ceil(total / perPage);

    return res.status(200).send({
      success: true,
      data: library,
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

exports.getBuildingLibraryById = async (req, res) => {
  try {
    const { libraryId } = req.params;
    const library = await BuildingLibrary.findById(libraryId, '-__v -projectId').populate('project');

    // Get user information
    await channel.sendToQueue('LIBRARY-DETAIL-USER-GET', Buffer.from(JSON.stringify([library.createdBy, library.updatedBy])));
    await channel.consume('LIBRARY-DETAIL-USER-INFO', (info) => {
      const dataUSer = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeUser', dataUSer);
    });
    setTimeout(() => eventEmitter.emit('consumeUser'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('consumeUser', resolve); });

    // format data
    library._doc.createdBy = {
      name: userData[library.createdBy].name,
      phone: userData[library.createdBy].phone,
    };

    library._doc.updatedBy = {
      name: userData[library.updatedBy].name,
      phone: userData[library.updatedBy].phone,
    };

    return res.status(200).send({
      success: true,
      data: library,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.deleteBuildingLibrary = async (req, res) => {
  try {
    const { libraryId } = req.params;

    const library = await BuildingLibrary.findByIdAndRemove(libraryId);

    // delete file
    let deleteImgEditor = [];
    let deleteFile;
    if (library.imageCKEditor.length > 0) {
      deleteImgEditor = deleteImgEditor.concat(library.imageCKEditor);
    }
    if (library.file) {
      deleteFile = { id: library._id, fileName: library.file };
    }
    channel.sendToQueue('CKEDITOR-DELETE', Buffer.from(JSON.stringify({ deleteImgEditor, deleteFile, type: 'library' })));

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
