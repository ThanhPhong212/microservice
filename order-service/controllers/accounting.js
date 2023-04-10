/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
/* eslint-disable import/order */
const EventEmitter = require('events');
const Accounting = require('../models/accounting');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');
const Order = require('../models/order');
const mongoose = require('mongoose');
const FeeType = require('../models/feeType');

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('ACCOUNTING-LIST-APARTMENT-INFO');
  await channel.assertQueue('ACCOUNTING-LIST-USER-INFO');
  await channel.assertQueue('ACCOUNTING-FILTER-BLOCK-INFO');
  await channel.assertQueue('RECEIPT-EXPORT-USER-INFO');
  await channel.assertQueue('RECEIPT-EXPORT-APARTMENT-INFO');
  await channel.assertQueue('RECEIPT-EXPORT-INFO');
  await channel.assertQueue('PAYMENT-EXPORT-USER-INFO');
};
connectRabbit();

exports.listAccounting = async (req, res) => {
  try {
    const {
      month, blockId, apartment, projectId, limit, page,
    } = req.query;
    const userId = req.headers.userid;
    const date = new Date().valueOf();
    const perPage = parseInt(limit || 5);
    const currentPage = parseInt(page || 1);
    let billDone;

    const query = { projectId };
    if (month) { query.month = month; }
    let listIdApartment = [];
    if (blockId) {
      await channel.sendToQueue('ACCOUNTING-FILTER-BLOCK-GET', Buffer.from(JSON.stringify(blockId)));
      await channel.consume('ACCOUNTING-FILTER-BLOCK-INFO', (info) => {
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

    // Check the bill
    const listBillDone = await Order.aggregate([
      { $match: { status: 'DONE', projectId: mongoose.Types.ObjectId(projectId), month } },
      {
        $lookup: {
          from: 'feetypes',
          localField: 'feeTypeId',
          foreignField: '_id',
          as: 'feeType',
        },
      },
      { $group: { _id: '$apartmentId', bill: { $push: '$$ROOT' }, sum: { $sum: '$invoiceTotal' } } },
    ]);
    if (listBillDone.length > 0) {
      let listIdApartmentOld;
      let listCreate;
      billDone = listBillDone.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
      const listIdApartmentNew = Array.from(listBillDone, ({ _id }) => _id.toString());
      const listAccountingOld = await Accounting.find({ projectId, month });

      // update accounting
      if (listAccountingOld.length > 0) {
        const ListAccountingUpdate = listAccountingOld.map((item) => ({
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: {
                invoiceTotal: item.apartmentId
                  ? billDone[item.apartmentId]
                    ? billDone[item.apartmentId].sum
                    : item.invoiceTotal
                  : item.invoiceTotal,
                updatedBy: userId,
                updatedAt: date,
              },
            },
          },
        }));
        await Accounting.bulkWrite(ListAccountingUpdate);

        const listAccountingApartment = listAccountingOld.filter((item) => item.apartmentId);
        listIdApartmentOld = Array.from(
          listAccountingApartment,
          ({ apartmentId }) => apartmentId.toString(),
        );
        listCreate = listIdApartmentNew.filter((item) => !listIdApartmentOld.includes(item));
      } else {
        listCreate = listIdApartmentNew;
      }

      // create accounting
      if (listCreate.length > 0) {
        const dataCreateAccounting = [];
        listCreate.map((item) => {
          const itemCreate = {
            projectId,
            month,
            apartmentId: item,
            invoiceTotal: billDone[item].sum,
            receiptType: true,
            createdBy: userId,
            updatedBy: userId,
            createdAt: date,
            updatedAt: date,
          };
          dataCreateAccounting.push(itemCreate);
          return item;
        });
        await Accounting.insertMany(dataCreateAccounting);
      }
    }

    // get list accounting
    const accounting = await Accounting.find(query)
      .sort({ _id: -1 })
      .select('-__v')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const total = await Accounting.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    if (accounting.length > 0) {
      // Get apartment information
      const apartmentListId = Array.from(accounting, ({ apartmentId }) => apartmentId);
      await channel.sendToQueue('ACCOUNTING-LIST-APARTMENT-GET', Buffer.from(JSON.stringify(apartmentListId)));
      await channel.consume('ACCOUNTING-LIST-APARTMENT-INFO', (info) => {
        const apartmentData = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeListApartment', apartmentData);
      });
      setTimeout(() => eventEmitter.emit('consumeListApartment'), 10000);
      const dataApartment = await new Promise((resolve) => { eventEmitter.once('consumeListApartment', resolve); });

      // Get user information
      const listUserId = Array.from(accounting, ({ createdBy }) => createdBy);
      await channel.sendToQueue('ACCOUNTING-LIST-USER-GET', Buffer.from(JSON.stringify(listUserId)));
      await channel.consume('ACCOUNTING-LIST-USER-INFO', (info) => {
        const userData = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('consumeListUser', userData);
      });
      setTimeout(() => eventEmitter.emit('consumeListUser'), 10000);
      const dataUser = await new Promise((resolve) => { eventEmitter.once('consumeListUser', resolve); });

      // format data
      accounting.map((item) => {
        if (item.apartmentId) {
          item._doc.apartment = {
            name: dataApartment[item.apartmentId].apartmentCode,
            block: dataApartment[item.apartmentId].block.name,
            floor: dataApartment[item.apartmentId].floor.name,
          };
          item._doc.bill = billDone[item.apartmentId].bill;
        }
        item._doc.createdBy = {
          name: dataUser[item.createdBy].fullName,
          phone: dataUser[item.createdBy].phone,
        };
        return item;
      });
    }

    // Total revenue and expenditure
    const totalRevenueAndExpenditure = await Accounting.aggregate([
      {
        $match: {
          projectId: mongoose.Types.ObjectId(projectId), month,
        },
      },
      {
        $group: {
          _id: { receiptType: '$receiptType' }, sum: { $sum: '$invoiceTotal' },
        },
      },
    ]);
    const calculationOfRevenueAndExpenditure = totalRevenueAndExpenditure.reduce((acc, cur) => {
      const id = cur._id.receiptType;
      return { ...acc, [id]: cur };
    }, {});
    const totalRevenue = calculationOfRevenueAndExpenditure.true ? calculationOfRevenueAndExpenditure.true.sum : 0;
    const totalExpenditure = calculationOfRevenueAndExpenditure.false ? calculationOfRevenueAndExpenditure.false.sum : 0;

    const data = {
      accounting,
      totalRevenue,
      totalExpenditure,
    };

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
      success: true,
      error: error.message,
    });
  }
};

exports.createExpenses = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const accountingIns = req.body;
    accountingIns.createdBy = userId;
    accountingIns.receiptType = false;
    accountingIns.updatedBy = userId;
    await Accounting.create(accountingIns);
    return res.status(200).send({
      success: true,
    });
  } catch (error) {
    return res.status(400).send({
      success: true,
      error: error.message,
    });
  }
};

exports.editExpenses = async (req, res) => {
  try {
    const { accountingId } = req.params;
    const userId = req.headers.userid;
    const accountingIns = req.body;
    accountingIns.updatedBy = userId;
    await Accounting.findByIdAndUpdate(accountingId, accountingIns);
    return res.status(200).send({
      success: true,
    });
  } catch (error) {
    return res.status(400).send({
      success: true,
      error: error.message,
    });
  }
};

exports.exportReceipt = async (req, res) => {
  try {
    const receiptIns = req.body;
    const query = {
      projectId: receiptIns.projectId,
      month: receiptIns.month,
    };
    let receipt = [];
    if (receiptIns.apartmentId) {
      query.apartmentId = receiptIns.apartmentId;
    }
    if (receiptIns.receiptType) {
      query.status = 'DONE';
      receipt = await Order.find(query)
        .select('feeTypeId apartmentId invoiceTotal sentDate createdBy payer createdAt updatedAt')
        .sort({ apartmentId: -1 });

      if (receipt.length > 0) {
        // Get apartment information
        const listIdApartment = Array.from(receipt, ({ apartmentId }) => apartmentId);
        await channel.sendToQueue('RECEIPT-EXPORT-APARTMENT-GET', Buffer.from(JSON.stringify(listIdApartment)));
        await channel.consume('RECEIPT-EXPORT-APARTMENT-INFO', (info) => {
          const dataApartment = JSON.parse(info.content);
          channel.ack(info);
          eventEmitter.emit('apartmentDone', dataApartment);
        });
        setTimeout(() => eventEmitter.emit('apartmentDone'), 10000);
        const apartmentData = await new Promise((resolve) => { eventEmitter.once('apartmentDone', resolve); });

        // Get user information
        const listPayer = (Array.from(receipt, ({ payer }) => payer)).filter((item) => item !== null);
        const listIdUser = listPayer.concat(Array.from(receipt, ({ createdBy }) => createdBy));
        await channel.sendToQueue('RECEIPT-EXPORT-USER-GET', Buffer.from(JSON.stringify(listIdUser)));
        await channel.consume('RECEIPT-EXPORT-USER-INFO', (info) => {
          const dataUser = JSON.parse(info.content);
          channel.ack(info);
          eventEmitter.emit('userDone', dataUser);
        });
        setTimeout(() => eventEmitter.emit('userDone'), 10000);
        const userData = await new Promise((resolve) => { eventEmitter.once('userDone', resolve); });

        // Information fee type
        const feeType = await FeeType.find();
        const dataFeeType = feeType.reduce((acc, cur) => {
          const id = cur._id;
          return { ...acc, [id]: cur };
        }, {});

        // format data
        receipt.map((item) => {
          item._doc['Mã hóa đơn'] = item._id;
          delete item._doc._id;
          item._doc['Loại phí'] = dataFeeType[item.feeTypeId] ? dataFeeType[item.feeTypeId].text : 'Không có dữ liệu';
          delete item._doc.feeTypeId;
          item._doc['Căn hộ'] = apartmentData[item.apartmentId] ? apartmentData[item.apartmentId].apartmentCode : 'Không có dữ liệu';
          item._doc.Block = apartmentData[item.apartmentId] ? apartmentData[item.apartmentId].block.name : 'Không có dữ liệu';
          delete item._doc.blockId;
          delete item._doc.apartmentId;
          item._doc['Tổng tiền'] = item.invoiceTotal;
          delete item._doc.invoiceTotal;
          if (item.sentDate) {
            const sentDate = new Date(item.sentDate * 1);
            item._doc.sentDate = `${sentDate.toLocaleDateString('vi-VN')} ${sentDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
          }
          item._doc['Ngày gửi hóa đơn'] = item.sentDate;
          delete item._doc.sentDate;
          item._doc['Tạo bởi'] = userData[item.createdBy] ? userData[item.createdBy].fullName : 'Không có dữ liệu';
          delete item._doc.createdBy;
          item._doc['Người thanh toán'] = userData[item.payer] ? userData[item.payer].fullName : 'Thanh toán tại quầy';
          delete item._doc.createdBy;
          const createdAt = new Date(item.createdAt * 1);
          item._doc['Ngày tạo'] = `${createdAt.toLocaleDateString('vi-VN')} ${createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
          delete item._doc.createdAt;
          const updatedAt = new Date(item.updatedAt * 1);
          item._doc['Ngày cập nhật'] = `${updatedAt.toLocaleDateString('vi-VN')} ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
          delete item._doc.updatedAt;
          return item;
        });
      }
    } else {
      query.receiptType = false;
      receipt = await Accounting.find(query).select('description to invoiceTotal createdBy createdAt updatedAt');

      // Get user information
      const listIdUser = Array.from(receipt, ({ createdBy }) => createdBy);
      await channel.sendToQueue('PAYMENT-EXPORT-USER-GET', Buffer.from(JSON.stringify(listIdUser)));
      await channel.consume('PAYMENT-EXPORT-USER-INFO', (info) => {
        const dataUser = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('userInfoDone', dataUser);
      });
      setTimeout(() => eventEmitter.emit('userInfoDone'), 10000);
      const userData = await new Promise((resolve) => { eventEmitter.once('userInfoDone', resolve); });

      // format data
      receipt.map((item) => {
        item._doc['Mã phiếu chi'] = 'PC'.concat(item._id.toString().slice(-6).toUpperCase());
        delete item._doc._id;
        item._doc['Đối tượng'] = item.to;
        delete item._doc.to;
        item._doc['Mô tả'] = item.description;
        delete item._doc.description;
        item._doc['Tổng tiền'] = item.invoiceTotal;
        delete item._doc.invoiceTotal;
        item._doc['Tạo bởi'] = userData[item.createdBy] ? userData[item.createdBy].fullName : 'Không có dữ liệu';
        const createdAt = new Date(item.createdAt * 1);
        delete item._doc.createdAt;
        delete item._doc.createdBy;
        item._doc['Ngày tạo'] = `${createdAt.toLocaleDateString('vi-VN')} ${createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        delete item._doc.createdAt;
        const updatedAt = new Date(item.updatedAt * 1);
        item._doc['Ngày cập nhật'] = `${updatedAt.toLocaleDateString('vi-VN')} ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        delete item._doc.updatedAt;
        return item;
      });
    }

    if (receipt.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'Tháng này chưa có biên nhận mới!',
      });
    }

    await channel.sendToQueue('RECEIPT-EXPORT-GET', Buffer.from(JSON.stringify({ receipt, month: receiptIns.month })));
    await channel.consume('RECEIPT-EXPORT-INFO', (info) => {
      const filePath = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('exportDone', filePath);
    });
    setTimeout(() => eventEmitter.emit('exportDone'), 10000);
    const url = await new Promise((resolve) => { eventEmitter.once('exportDone', resolve); });

    return res.status(200).send({
      success: true,
      url,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
