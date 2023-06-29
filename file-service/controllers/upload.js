/* eslint-disable no-param-reassign */
/* eslint-disable array-callback-return */
/* eslint-disable no-console */
/* eslint-disable consistent-return */
/* eslint-disable no-use-before-define */
/* eslint-disable import/extensions */
const xlsx = require('xlsx');
const fs = require('fs');
const fsExtra = require('fs-extra');
const connect = require('../lib/rabbitMQ');
const FILE = require('../models/file');
const { moveFile, handleSaveFile } = require('../utils/index');
const logger = require('../utils/logger');

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('FILE-IMAGE');
  await channel.assertQueue('FILE');
  await channel.assertQueue('FILE-CHANGE');
  await channel.assertQueue('FILE-SERVICE-CHANGE');
  await channel.assertQueue('FILE-REQUEST-CHANGE');
  await channel.assertQueue('FILE-VEHICLE-CHANGE');
  await channel.assertQueue('FILE-LIBRARY-CHANGE');
  await channel.assertQueue('CKEDITOR-CHANGE');
  await channel.assertQueue('CKEDITOR-DELETE');
  await channel.assertQueue('ORDER-EXPORT-GET');
  await channel.assertQueue('RECEIPT-EXPORT-GET');
  await channel.assertQueue('FILE-CATEGORY-CHANGE');
  await channel.assertQueue('FILE-EVENT-CHANGE');
};

const convertExcelToJson = async (data) => {
  try {
    const month = `${new Date().getMonth()}-${new Date().getFullYear()}`;
    const path = __dirname.replace('controllers', `public/device/${data.projectId}/${month}/${data.type}/${data.file}`);
    if (!fs.existsSync(path)) {
      return [];
    }
    const wb = await xlsx.readFile(path);
    const ws = await wb.Sheets[wb.SheetNames[0]];
    const dataExcel = await xlsx.utils.sheet_to_json(ws, { raw: true });
    return dataExcel ?? [];
  } catch (error) {
    logger.error(error);
    return [];
  }
};

const convertJsonIntoExcel = (data) => {
  const date = new Date().valueOf();
  const workSheet = xlsx.utils.json_to_sheet(data.json);
  const workBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workBook, workSheet, 'bill');
  xlsx.write(workBook, { bookType: 'xlsx', type: 'buffer' });
  xlsx.write(workBook, { bookType: 'xlsx', type: 'binary' });
  xlsx.writeFile(workBook, `${data.path}/${data.type}_${date}.xlsx`);
  return `${process.env.IMAGE_URL}/${data.type}/${data.month}/${data.type}_${date}.xlsx`;
};

connectRabbit().then(() => {
  channel.consume('RECEIPT-EXPORT-GET', async (info) => {
    try {
      const data = JSON.parse(info.content);
      channel.ack(info);
      const { receipt, month } = data;
      const path = __dirname.replace('controllers', `public/receipt/${month}`);
      if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
      const filePath = convertJsonIntoExcel({
        path, json: receipt, type: 'receipt', month,
      });
      await channel.sendToQueue('RECEIPT-EXPORT-INFO', Buffer.from(JSON.stringify(filePath)));
    } catch (error) {
      logger.error(error);
      await channel.sendToQueue('RECEIPT-EXPORT-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  channel.consume('ORDER-EXPORT-GET', async (info) => {
    try {
      const data = JSON.parse(info.content);
      channel.ack(info);
      const { bill, month } = data;
      const path = __dirname.replace('controllers', `public/bill/${month}`);
      if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
      const filePath = convertJsonIntoExcel({
        path, json: bill, type: 'bill', month,
      });
      await channel.sendToQueue('ORDER-EXPORT-INFO', Buffer.from(JSON.stringify(filePath)));
    } catch (error) {
      logger.error(error);
      await channel.sendToQueue('ORDER-EXPORT-INFO', Buffer.from(JSON.stringify(null)));
    }
  });

  // file image
  channel.consume('FILE-IMAGE', (data) => {
    const dtum = JSON.parse(data.content);
    channel.ack(data);
    let path = `user/${dtum.id}`;
    let type;
    Object.keys(dtum.fileSave).forEach(async (value) => {
      try {
        if (value === 'avatar') {
          path = `user/${dtum.id}/${value}`;
          type = 'AVATAR';
        }
        if (value === 'front' || value === 'backside') {
          path = `user/${dtum.id}/card`;
          type = 'CARD';
        }
        if (value === 'notify') {
          path = `notify/${dtum.id}`;
          type = 'NOTIFY';
        }
        if (value === 'category') {
          path = `category/${dtum.id}`;
          type = 'CATEGORY';
        }
        if (value === 'service') {
          path = `service/${dtum.id}`;
          type = 'SERVICE';
        }
        if (value === 'request') {
          path = `request/${dtum.id}`;
          type = 'REQUEST';
        }
        if (value === 'event') {
          path = `event/${dtum.id}`;
          type = 'EVENT';
        }
        if (value === 'residentialCard') {
          path = `residentialCard/${dtum.id}`;
          type = 'RESIDENTIAL_CARD';
        }
        if (value === 'backsideLicense' || value === 'frontLicense' || value === 'vehicleImage') {
          path = `vehicleCard/${dtum.id}`;
          type = 'VEHICLE';
        }
        const dir = __dirname.replace('controllers', `public/${path}`);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (dtum.fileSave[value]) {
          const wait = moveFile(dtum.fileSave[value], null, path);
          if (wait) {
            await FILE.create({ fileName: dtum.fileSave[value], type, userId: dtum.userId });
          }
        }
        return true;
      } catch (error) {
        logger.error(error.message);
        return false;
      }
    });
  });

  // file
  channel.consume('FILE', (data) => {
    const dtum = JSON.parse(data.content);
    channel.ack(data);
    let path = `user/${dtum.id}`;
    let type;
    Object.keys(dtum.fileSave).forEach(async (value) => {
      try {
        if (value === 'library') {
          path = `library/${dtum.id}`;
          type = 'LIBRARY';
        }
        if (value === 'device') {
          const month = `${new Date().getMonth()}-${new Date().getFullYear()}`;
          path = `device/${dtum.projectId}/${month}/${dtum.type}`;
          type = 'DEVICE';
        }
        const dir = __dirname.replace('controllers', `public/${path}`);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (dtum.fileSave[value]) {
          if (value === 'device') {
            fsExtra.emptyDirSync(dir);
          }
          const wait = await moveFile(dtum.fileSave[value], null, path);
          setTimeout(async () => {
            if (wait) {
              await FILE.create({ fileName: dtum.fileSave[value], type, userId: dtum.userId });
              if (value === 'device') {
                const convert = await convertExcelToJson({
                  file: dtum.fileSave[value], type: dtum.type, projectId: dtum.projectId,
                });
                channel.sendToQueue('FILE-DATA-EXCEL', Buffer.from(JSON.stringify(convert)));
              }
            } else if (value === 'device') {
              channel.sendToQueue('FILE-DATA-EXCEL', Buffer.from(JSON.stringify([])));
            }
          }, 250);
        }
        return true;
      } catch (error) {
        logger.error(error.message);
        return false;
      }
    });
  });

  // Change image file
  channel.consume('FILE-CHANGE', (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);
      let path = `user/${dtum.id}`;
      Object.keys(dtum.fileSave).forEach(async (value) => {
        try {
          if (value === 'avatar') {
            path = `user/${dtum.id}/${value}`;
          }
          if (value !== 'avatar') {
            path = `user/${dtum.id}/card`;
          }
          const dataHandle = {
            type: value === 'avatar' ? 'AVATAR' : 'CARD',
            path,
            newFile: dtum.fileSave[value].newFile,
            oldFile: dtum.fileSave[value].oldFile,
            dtum,
          };
          handleSaveFile(dataHandle);
          return true;
        } catch (e) {
          return false;
        }
      });
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });

  // Change vehicle papers
  channel.consume('FILE-VEHICLE-CHANGE', (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);
      const path = `vehicleCard/${dtum.id}`;
      Object.keys(dtum.fileSave).forEach(async (value) => {
        try {
          const dataHandle = {
            type: 'VEHICLE',
            path,
            newFile: dtum.fileSave[value].newFile,
            oldFile: dtum.fileSave[value].oldFile,
            dtum,
          };
          handleSaveFile(dataHandle);
          return true;
        } catch (e) {
          return false;
        }
      });
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });

  // Change of utility image
  channel.consume('FILE-SERVICE-CHANGE', async (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);
      const path = `service/${dtum.id}`;
      handleSaveFile({
        type: 'SERVICE',
        path,
        newFile: dtum.fileSave.newFile,
        oldFile: dtum.fileSave.oldFile,
        dtum,
      });
      return true;
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });

  channel.consume('FILE-EVENT-CHANGE', async (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);
      const path = `event/${dtum.id}`;
      handleSaveFile({
        type: 'EVENT',
        path,
        newFile: dtum.fileSave.newFile,
        oldFile: dtum.fileSave.oldFile,
        dtum,
      });
      return true;
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });

  // Change the required image
  channel.consume('FILE-REQUEST-CHANGE', async (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);
      const path = `request/${dtum.id}`;
      handleSaveFile({
        type: 'REQUEST',
        path,
        newFile: dtum.fileSave.newFile,
        oldFile: dtum.fileSave.oldFile,
        dtum,
      });
      return true;
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });

  // Change file
  channel.consume('FILE-LIBRARY-CHANGE', async (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);
      const path = `library/${dtum.id}`;
      handleSaveFile({
        type: 'LIBRARY',
        path,
        newFile: dtum.fileSave.newFile,
        oldFile: dtum.fileSave.oldFile,
        dtum,
      });
      return true;
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });

  // change file editor
  channel.consume('CKEDITOR-CHANGE', async (data) => {
    try {
      const dataIns = [];
      const dtum = JSON.parse(data.content);
      channel.ack(data);

      // Delete old photos
      if (dtum.imageOld && dtum.imageOld.length > 0) {
        await FILE.deleteMany({ fileName: { $in: dtum.imageOld } });
        if (dtum.imageAdd.length > 0) {
          const listDelete = dtum.imageOld.filter((item) => !dtum.imageAdd.includes(item));
          if (listDelete.length > 0) {
            listDelete.map((item) => {
              const deleteFile = __dirname.replace('controllers', `public/${dtum.type}/ckEditor/${item}`);
              if (fs.existsSync(deleteFile)) {
                fs.unlinkSync(deleteFile);
              }
            });
          }
        } else {
          dtum.imageOld.map((item) => {
            const deleteFile = __dirname.replace('controllers', `public/${dtum.type}/ckEditor/${item}`);
            if (fs.existsSync(deleteFile)) {
              fs.unlinkSync(deleteFile);
            }
          });
        }
      }

      // Add new photos
      if (dtum.imageAdd.length > 0) {
        if (dtum.imageOld && dtum.imageOld.length > 0) {
          const listMove = dtum.imageAdd.filter((item) => !dtum.imageOld.includes(item));
          dtum.imageAdd = listMove;
        }
        const dir = __dirname.replace('controllers', `public/${dtum.type}/ckEditor`);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        dtum.imageAdd.map((item) => {
          moveFile(item, null, `${dtum.type}/ckEditor`);
          dataIns.push({ fileName: item, type: 'CKEDITOR' });
          return item;
        });
        await FILE.insertMany(dataIns);
      }
      return true;
    } catch (error) {
      logger.error(error.message);
    }
  });

  // xóa file editor
  channel.consume('CKEDITOR-DELETE', async (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);

      // Delete the IMG Editor file
      if (dtum.deleteImgEditor.length > 0) {
        await FILE.deleteMany({ fileName: { $in: dtum.deleteImgEditor } });
        dtum.deleteImgEditor.map((item) => {
          const deleteFile = __dirname.replace('controllers', `public/${dtum.type}/ckEditor/${item}`);
          fs.unlinkSync(deleteFile);
        });
      }

      // Delete attachment
      if (dtum.deleteFile) {
        await FILE.deleteOne({ fileName: dtum.deleteFile.fileName });
        const deleteFile = __dirname.replace('controllers', `public/library/${dtum.deleteFile.id}/${dtum.deleteFile.fileName}`);
        const deleteFolder = __dirname.replace('controllers', `public/library/${dtum.deleteFile.id}`);
        fs.unlinkSync(deleteFile);
        fs.rmdir(deleteFolder, (err) => {
          if (err) {
            logger.error(err);
          }
        });
      }
      return true;
    } catch (error) {
      logger.error(error.message);
    }
  });

  // Change vehicle papers
  channel.consume('FILE-CATEGORY-CHANGE', (data) => {
    try {
      const dtum = JSON.parse(data.content);
      channel.ack(data);
      const path = `category/${dtum.id}`;
      Object.keys(dtum.fileSave).forEach(async (value) => {
        try {
          const dataHandle = {
            type: 'CATEGORY',
            path,
            newFile: dtum.fileSave[value].newFile,
            oldFile: dtum.fileSave[value].oldFile,
            dtum,
          };
          handleSaveFile(dataHandle);
          return true;
        } catch (e) {
          return false;
        }
      });
    } catch (error) {
      logger.error(error.message);
      return false;
    }
  });
});

const uploadImage = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(404).send({
        success: false,
        error: 'file not exist',
      });
    }
    const { file } = req.files;

    // nếu là nhiều file
    if (Array.isArray(file)) {
      const listFile = [];
      await Promise.all(file.map(async (item) => {
        const date = new Date();
        item.name = `${item.md5}-${date.valueOf()}.${item.name.split('.').pop()}`;
        const path = __dirname.replace('controllers', `tmp/${item.name}`);
        await item.mv(path, (err) => {
          if (err) { throw err; }
        });

        listFile.push({ fileName: item.name, fullPath: `${process.env.IMAGE_URL}/${item.name}` });
      }));
      return res.status(200).send({
        success: true,
        data: listFile,
      });
    }

    // nếu chỉ có 1 file
    const date = new Date();
    file.name = `${file.md5}-${date.valueOf()}.${file.name.split('.').pop()}`;
    const path = __dirname.replace('controllers', `tmp/${file.name}`);
    // eslint-disable-next-line consistent-return
    await file.mv(path, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      return res.status(200).send({
        success: true,
        data: { fileName: file.name, fullPath: `${process.env.IMAGE_URL}/${file.name}` },
      });
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(404).send({
        success: false,
        error: 'file not exist',
      });
    }
    const { file } = req.files;
    const date = new Date();
    file.name = `${file.md5}-${date.valueOf()}.${file.name.split('.').pop()}`;
    const path = __dirname.replace('controllers', `tmp/${file.name}`);
    await file.mv(path, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      return res.status(200).send({
        success: true,
        data: { fileName: file.name, fullPath: `${process.env.IMAGE_URL}/${file.name}` },
      });
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};

const uploadVideo = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(404).send({
        success: false,
        error: 'file not exist',
      });
    }
    const { file } = req.files;
    if (file.mimetype !== 'video/mp4') {
      return res.status(400).send({
        success: false,
        error: 'file not valid',
      });
    }
    const date = new Date();
    file.name = `${file.md5}-${date.valueOf()}.${file.name.split('.').pop()}`;
    const path = __dirname.replace('controllers', `tmp/${file.name}`);
    // eslint-disable-next-line consistent-return
    await file.mv(path, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      return res.status(200).send({
        success: true,
        data: { fileName: file.name, fullPath: `${process.env.IMAGE_URL}/${file.name}` },
      });
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};

const uploadProject = async (req, res) => {
  try {
    const date = new Date();
    if (!req.files) {
      return res.status(404).send({
        success: false,
        error: 'file not exist',
      });
    }
    const { file } = req.files;
    const { id } = req.params;
    const { thumbnail } = req.body;
    file.name = `${file.md5}-${date.valueOf()}.${file.name.split('.').pop()}`;
    const type = 'PROJECT';
    const path = `project/${id}`;
    const dir = __dirname.replace('controllers', `public/${path}/${file.name}`);
    // eslint-disable-next-line consistent-return
    await file.mv(dir, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      if (thumbnail !== file.name && thumbnail !== 'image_default.jpg') {
        const unPath = __dirname.replace('controllers', `public/${path}/${thumbnail}`);
        if (fs.existsSync(unPath)) {
          fs.unlinkSync(unPath);
        }
      }
      const fileData = await FILE.findOne({ fileName: thumbnail });
      channel.sendToQueue(
        'FILE-PROJECT',
        Buffer.from(JSON.stringify({
          id,
          thumbnail: file.name,
        })),
      );
      if (!fileData) {
        // eslint-disable-next-line no-underscore-dangle
        await FILE.create({ fileName: file.name, userId: req.headers.userid, type });
      }
      if (fileData) {
        fileData.fileName = file.name;
        await fileData.save();
      }
      return res.status(200).send({
        success: true,
        fileName: file.name,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

const uploadFileEditor = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(404).send({
        success: false,
        error: 'file not exist',
      });
    }
    const { upload } = req.files;
    const date = new Date();
    upload.name = `${upload.md5}-${date.valueOf()}.${upload.name.split('.').pop()}`;
    const path = __dirname.replace('controllers', `tmp/${upload.name}`);
    const dir = __dirname.replace('controllers', 'tmp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await upload.mv(path, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      await channel.sendToQueue('CKEDITOR-LIBRARY', Buffer.from(JSON.stringify(upload.name)));
      await channel.sendToQueue('CKEDITOR-NOTIFY', Buffer.from(JSON.stringify(upload.name)));
      return res.status(200).send({ url: `${process.env.IMAGE_URL}/${upload.name}` });
    });
  } catch (error) {
    return res.status(200).send({
      success: true,
      error: error.message,
    });
  }
};

const uploadImagePPA = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(404).send({
        success: false,
        error: 'file not exist',
      });
    }
    const { file } = req.files;
    const { repairId } = req.params;
    // nếu là nhiều file
    if (Array.isArray(file)) {
      const listFile = [];
      await Promise.all(file.map(async (item) => {
        const date = new Date();
        item.name = `${item.md5}-${date.valueOf()}.${item.name.split('.').pop()}`;
        const path = __dirname.replace('controllers', `public/repair/${repairId}/${item.name}`);
        await item.mv(path, (err) => {
          if (err) { throw err; }
        });

        listFile.push({ fileName: item.name, fullPath: `${process.env.IMAGE_URL}/repair/${repairId}/${item.name}` });
      }));
      return res.status(200).send({
        success: true,
        data: listFile,
      });
    }

    // nếu chỉ có 1 file
    const date = new Date();
    file.name = `${file.md5}-${date.valueOf()}.${file.name.split('.').pop()}`;
    const path = __dirname.replace('controllers', `public/repair/${repairId}/${file.name}`);
    // eslint-disable-next-line consistent-return
    await file.mv(path, async (err) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      return res.status(200).send({
        success: true,
        data: { fileName: file.name, fullPath: `${process.env.IMAGE_URL}/repair/${repairId}/${file.name}` },
      });
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  uploadImage,
  uploadProject,
  uploadVideo,
  uploadFile,
  uploadFileEditor,
  uploadImagePPA,
};
