/* eslint-disable eqeqeq */
/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const Block = require('../models/block');
const Project = require('../models/project');
const Apartment = require('../models/apartment');
const connect = require('../lib/rabbitMQ');

let channel;
const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('PARKING-SEARCH-BLOCK-GET');
  await channel.assertQueue('PARKING-BLOCK-GET');
  await channel.assertQueue('PARKING-DETAILS-BLOCK-GET');
  await channel.assertQueue('PARKING-DETAILS-BLOCK-GET');
};

const listBlock = async (listIdBlock) => {
  try {
    const block = await Block.find({ _id: { $in: listIdBlock } });
    const blockData = block.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});
    return blockData;
  } catch (error) {
    return null;
  }
};

const detailBlock = async (blockId) => {
  try {
    const block = await Block.findOne({ _id: blockId });
    return block;
  } catch (error) {
    return null;
  }
};

const searchBlock = async (search) => {
  try {
    const block = await Block.find({
      name: { $regex: search.keywords, $options: 'i' },
      idProject: search.projectId,
    }).select('_id');
    return block;
  } catch (error) {
    return null;
  }
};

connectRabbit().then(() => {
  channel.consume('PARKING-DETAILS-BLOCK-GET', async (data) => {
    try {
      const block = JSON.parse(data.content);
      channel.ack(data);
      const blockData = await detailBlock(block.blockId);
      channel.sendToQueue('PARKING-DETAILS-BLOCK-INFO', Buffer.from(JSON.stringify(blockData)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('PARKING-DETAILS-BLOCK-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('PARKING-BLOCK-GET', async (data) => {
    try {
      const arrayBlockId = JSON.parse(data.content);
      channel.ack(data);
      const blockData = await listBlock(arrayBlockId);

      channel.sendToQueue('PARKING-BLOCK-INFO', Buffer.from(JSON.stringify(blockData)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('PARKING-BLOCK-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });

  channel.consume('PARKING-SEARCH-BLOCK-GET', async (data) => {
    try {
      const search = JSON.parse(data.content);
      channel.ack(data);
      const dataSearch = await searchBlock(search);
      channel.sendToQueue('PARKING-SEARCH-BLOCK-INFO', Buffer.from(JSON.stringify(dataSearch)));
    } catch (error) {
      const dataAvailable = {};
      channel.sendToQueue('PARKING-SEARCH-BLOCK-INFO', Buffer.from(JSON.stringify(dataAvailable)));
    }
  });
});

exports.createBlock = async (req, res) => {
  try {
    const blockIns = req.body;
    const userId = req.headers.userid;
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    blockIns.updatedBy = userId;
    blockIns.createdBy = userId;
    blockIns.idProject = projectId;
    if (blockIns.numberFloor > 0) {
      const floor = Array.from({ length: blockIns.numberFloor }, (_, index) => ({ name: `Tầng ${index + 1}` }));
      blockIns.floor = floor;
    }
    await Block.create(blockIns, async (err, block) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      project.block.push(block.id);
      await project.save();
      return res.status(200).send({
        success: true,
        data: block,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.updateBlock = async (req, res) => {
  try {
    const blockIns = req.body;
    const userId = req.headers.userid;
    const { blockId, projectId } = req.params;
    const project = await Project.findById(projectId);
    blockIns.updatedBy = userId;

    // kiểm tra căn hộ trong block
    const apartmentInBlock = await Apartment.findOne({ block: blockId });
    if (blockIns.isDeleted && apartmentInBlock) {
      return res.status(400).send({
        success: false,
        error: 'Không thể xóa block có căn hộ !',
      });
    }

    // kiểm tra số lượng căn hộ hiện có khi cập nhật số lượng căn hộ trong block
    const countApartmentInBlock = await Apartment.countDocuments({ block: blockId });
    if (blockIns.numberApartment < countApartmentInBlock) {
      return res.status(400).send({
        success: false,
        error: 'Số lượng căn hộ của block phải lơn hơn số lượng căn hộ hiện có của block!',
      });
    }

    const block = await Block.findOne({ _id: blockId, idProject: projectId, isDeleted: false });
    if (blockIns.numberFloor > 0) {
      if (blockIns.numberFloor > block.floor.length) {
        const floor = Array.from(
          { length: blockIns.numberFloor - block.floor.length },
          (_, index) => ({ name: `Tầng ${block.floor.length + index + 1}` }),
        );
        blockIns.floor = [...block.floor, ...floor];
      }
      if (blockIns.numberFloor < block.floor.length) {
        const arrayRemove = block.floor.filter((item, index) => index >= blockIns.numberFloor);
        const arrayIdFloor = Array.from(arrayRemove, ({ _id }) => _id);
        const apartment = await Apartment.count({ 'floor._id': { $in: arrayIdFloor } });
        if (apartment > 0) {
          return res.status(400).send({
            success: false,
            error: 'Tầng có chứa căn hộ',
          });
        }
        const floor = block.floor.filter((item, index) => index < blockIns.numberFloor);
        blockIns.floor = floor;
      }
    }
    await Block.updateOne({ _id: blockId }, blockIns);
    if (blockIns.isDeleted) {
      const index = project.block.indexOf(blockId);
      if (index > -1) {
        project.block.splice(index, 1);
      }
    }
    await project.save();
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

exports.listBlockByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;
    const data = await Project.findById(projectId, 'block -_id').populate('block', '-__v');
    return res.status(200).send({
      success: true,
      data: data.block,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
