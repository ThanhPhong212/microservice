const fs = require('fs');
const FILE = require('../models/file');
const logger = require('./logger/index');

// eslint-disable-next-line default-param-last
const moveFile = (fileName, oldFileName = null, path) => {
  try {
    // move avatar from tmp folder to upload
    if (oldFileName) {
      try {
        if (oldFileName !== fileName) {
          const unPath = __dirname.replace('utils', `public/${path}/${oldFileName}`);
          fs.unlinkSync(unPath);
        }
        // eslint-disable-next-line no-empty
      } catch (error) {
      }
    }
    const tmpPath = __dirname.replace('utils', `tmp/${fileName}`);
    const uploadPath = __dirname.replace('utils', `public/${path}/${fileName}`);
    fs.rename(tmpPath, uploadPath, async (err) => {
      if (!err) {
        return false;
      }
      return true;
    });
    return true;
  } catch (error) {
    return false;
  }
};

const handleSaveFile = async (data) => {
  try {
    const {
      type, path, newFile, oldFile, dtum,
    } = data;
    const dir = __dirname.replace('utils', `public/${path}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // handle file
    moveFile(newFile, oldFile, path);
    // handle save file to db
    if (!newFile && oldFile) {
      await FILE.find({ fileName: oldFile }).remove().exec();
    }
    if (newFile && !oldFile) {
      await FILE.create({
        fileName: dtum.newFile,
        type,
        userId: dtum.userId,
      });
    }
    if (newFile && oldFile) {
      const file = await FILE.findOne({ fileName: oldFile });
      if (!file) {
        await FILE.create({
          fileName: newFile,
          type,
          userId: dtum.userId,
        });
        return false;
      }
      if (newFile !== oldFile) {
        file.fileName = newFile;
        file.userId = dtum.userId;
        file.type = type;
        await file.save();
      }
    }
    return true;
  } catch (error) {
    logger.error(error.message);
    return false;
  }
};

module.exports = {
  moveFile,
  handleSaveFile,
};
