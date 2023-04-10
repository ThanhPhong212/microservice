/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-constant-condition */
/* eslint-disable no-param-reassign */
/* eslint-disable radix */
/* eslint-disable no-underscore-dangle */
const EventEmitter = require('events');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Order = require('../models/order');
// const logger = require('../utils/logger');

const eventEmitter = new EventEmitter();
const connect = require('../lib/rabbitMQ');
const FeeType = require('../models/feeType');
const Fee = require('../models/fee');
const { payment, logger } = require('../utils/logger/index');

let channel;

const connectRabbit = async () => {
  const conn = await connect;
  channel = await conn.createChannel();
  await channel.assertQueue('ORDER-APARTMENT-INFO');
  await channel.assertQueue('ORDER-USER-INFO');
  await channel.assertQueue('ORDER-LIST-APARTMENT-INFO');
  await channel.assertQueue('ORDER-DETAIL-USER-INFO');
  await channel.assertQueue('ORDER-DETAIL-APARTMENT-INFO');
  await channel.assertQueue('ORDER-EXPORT-INFO');
  await channel.assertQueue('ORDER-EXPORT-APARTMENT-INFO');
  await channel.assertQueue('ORDER-EXPORT-USER-INFO');
  await channel.assertQueue('ORDER-LIST-APARTMENT-OWNER-INFO');
  await channel.assertQueue('ORDER-LIST-APARTMENT-USER-INFO');
  await channel.assertQueue('ORDER-LIST-DETAIL-USER-INFO');
  await channel.assertQueue('PAYMENT-APARTMENT-INFO');
  await channel.assertQueue('PAYMENT-USER-INFO');
  await channel.assertQueue('STATISTICS-USER-INFO');
  await channel.assertQueue('STATISTICS-APARTMENT-INFO');
  await channel.assertQueue('ORDER-FILTER-BLOCK-INFO');
  await channel.assertQueue('ORDER-SENT-BLOCK-INFO');
  await channel.assertQueue('CARD-CHECK-BILL-GET');
};
connectRabbit().then(() => {
  channel.consume('CARD-CHECK-BILL-GET', async (data) => {
    try {
      const vehicleId = JSON.parse(data.content);
      channel.ack(data);
      let changeTheState = true;
      const month = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
      const bill = await Order.findOne({ vehicleId, month });
      if (bill) {
        if (!bill.sentDate) {
          await Order.findOneAndUpdate({ vehicleId, month }, { confirm: false });
        } else {
          changeTheState = false;
        }
      } else {
        changeTheState = true;
      }
      channel.sendToQueue('CARD-CHECK-BILL-INFO', Buffer.from(JSON.stringify(changeTheState)));
    } catch (error) {
      logger.error(error);
      channel.sendToQueue('CARD-CHECK-BILL-INFO', Buffer.from(JSON.stringify(false)));
    }
  });
});
exports.getAllOrder = async (req, res) => {
  try {
    const {
      month, blockId, apartment, status, projectId, limit, page, feeTypeId,
    } = req.query;
    const perPage = parseInt(limit || 5);
    const currentPage = parseInt(page || 1);
    const query = { projectId, confirm: true };
    if (month) {
      query.month = month;
    }
    let listIdApartment = [];
    if (blockId) {
      await channel.sendToQueue('ORDER-FILTER-BLOCK-GET', Buffer.from(JSON.stringify(blockId)));
      await channel.consume('ORDER-FILTER-BLOCK-INFO', (info) => {
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

    if (status) {
      query.status = status;
    }
    if (feeTypeId) {
      query.feeTypeId = feeTypeId;
    }
    // overdue update
    const listOrder = await Order.find({ projectId, status: 'SENT' });
    const listOverdue = [];

    listOrder.map((item) => {
      if (item.sentDate) {
        const monthSent = new Date(item.sentDate * 1).getMonth();
        const yearSent = new Date(item.sentDate * 1).getFullYear();
        const presentMonth = new Date().getMonth();
        const presentYear = new Date().getFullYear();
        if (presentYear > yearSent) {
          listOverdue.push(item);
        } else if (presentMonth > monthSent) {
          listOverdue.push(item);
        }
      }
      return item;
    });

    const listOverdueUpdate = listOverdue.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            status: 'OVERDUE',
          },
        },
      },
    }));
    await Order.bulkWrite(listOverdueUpdate);

    const order = await Order.find(query)
      .sort({ _id: -1 })
      .select('-__v -updatedBy -projectId -updatedAt')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const total = await Order.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    // Total bill
    const totalPrice = await Order.aggregate([
      {
        $match: {
          projectId: mongoose.Types.ObjectId(projectId), confirm: true,
        },
      },
      {
        $group: {
          _id: { status: '$status' }, sum: { $sum: '$invoiceTotal' }, count: { $sum: 1 },
        },
      },
    ]);
    const totalBill = totalPrice.reduce((acc, cur) => {
      const id = cur._id.status;
      return { ...acc, [id]: cur };
    }, {});

    const totalUnpaid = totalBill.SENT ? totalBill.SENT.sum : 0;
    const totalPaid = (totalBill.PAID ? totalBill.PAID.sum : 0) + (totalBill.DONE ? totalBill.DONE.sum : 0);
    const totalOverdue = totalBill.OVERDUE ? totalBill.OVERDUE.sum : 0;

    const unPaid = totalBill.SENT ? totalBill.SENT.count : 0;
    const paid = (totalBill.PAID ? totalBill.PAID.count : 0) + (totalBill.DONE ? totalBill.DONE.count : 0);
    const overdue = totalBill.OVERDUE ? totalBill.OVERDUE.count : 0;

    const feeType = await FeeType.find();
    const dataFeeType = feeType.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});
    // Get apartment information
    const apartmentListId = Array.from(order, ({ apartmentId }) => apartmentId);
    await channel.sendToQueue('ORDER-LIST-APARTMENT-GET', Buffer.from(JSON.stringify(apartmentListId)));
    await channel.consume('ORDER-LIST-APARTMENT-INFO', (info) => {
      const apartmentData = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('consumeListApartment', apartmentData);
    });
    setTimeout(() => eventEmitter.emit('consumeListApartment'), 10000);
    const dataApartment = await new Promise((resolve) => { eventEmitter.once('consumeListApartment', resolve); });

    // format data
    order.map((item) => {
      item._doc.apartment = {
        name: dataApartment[item.apartmentId].apartmentCode,
        block: dataApartment[item.apartmentId].block.name,
        floor: dataApartment[item.apartmentId].floor.name,
      };
      item._doc.feeType = {
        _id: item.feeTypeId,
        text: dataFeeType[item.feeTypeId].text,
        isExpand: dataFeeType[item.feeTypeId].isExpand,
        name: dataFeeType[item.feeTypeId].name,
      };
      delete item._doc.apartmentId;
      delete item._doc.feeTypeId;
      return item;
    });
    const data = {
      listOrder: order,
      unPaid,
      paid,
      overdue,
      totalUnpaid,
      totalPaid,
      totalOverdue,
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

exports.getOderByFeeId = async (req, res) => {
  try {
    const { feeId, month, vehicleId } = req.query;
    const query = { month };
    if (feeId) {
      query.feeId = feeId;
    }
    if (vehicleId) {
      query.vehicleId = vehicleId;
    }
    const data = await Order.findOne(query);
    if (data) {
      await channel.sendToQueue('ORDER-APARTMENT-GET', Buffer.from(JSON.stringify(data.apartmentId)));
      await channel.consume('ORDER-APARTMENT-INFO', (info) => {
        const dataApartment = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('done', dataApartment);
      });
      setTimeout(() => eventEmitter.emit('done'), 10000);
      const apartmentData = await new Promise((resolve) => { eventEmitter.once('done', resolve); });

      await channel.sendToQueue('ORDER-USER-GET', Buffer.from(JSON.stringify(data.createdBy)));
      await channel.consume('ORDER-USER-INFO', (info) => {
        const dataUser = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('doneUser', dataUser);
      });
      setTimeout(() => eventEmitter.emit('doneUser'), 10000);
      const userData = await new Promise((resolve) => { eventEmitter.once('doneUser', resolve); });

      // format data
      data._doc.apartment = {
        name: apartmentData.apartmentCode,
        floor: apartmentData.floor.name,
        block: apartmentData.block.name,
      };
      data._doc.createdBy = {
        name: userData.fullName,
        phone: userData.phone,
      };
      delete data._doc.apartmentId;
    }

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

exports.getOderById = async (req, res) => {
  try {
    const { billId } = req.params;
    const data = await Order.findById(billId);

    await channel.sendToQueue('ORDER-DETAIL-APARTMENT-GET', Buffer.from(JSON.stringify(data.apartmentId)));
    await channel.consume('ORDER-DETAIL-APARTMENT-INFO', (info) => {
      const dataApartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('done', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('done'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('done', resolve); });

    await channel.sendToQueue('ORDER-DETAIL-USER-GET', Buffer.from(JSON.stringify(data.createdBy)));
    await channel.consume('ORDER-DETAIL-USER-INFO', (info) => {
      const dataUser = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('doneUser', dataUser);
    });
    setTimeout(() => eventEmitter.emit('doneUser'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('doneUser', resolve); });

    // format data
    data._doc.apartment = {
      name: apartmentData.apartmentCode,
      floor: apartmentData.floor.name,
      block: apartmentData.block.name,
    };
    data._doc.createdBy = {
      name: userData.fullName,
      phone: userData.phone,
    };
    delete data._doc.apartmentId;

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

exports.createBill = async (req, res) => {
  try {
    const billIns = req.body;
    const createdBy = req.headers.userid;
    billIns.createdBy = createdBy;
    billIns.confirm = true;
    await Order.create(billIns);
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

exports.sentBill = async (req, res) => {
  try {
    const date = new Date().valueOf();
    const billIns = req.body;
    billIns.updatedBy = req.headers.userid;
    const query = {
      projectId: billIns.projectId, month: billIns.month, confirm: true, status: 'UNSENT',
    };
    if (billIns.blockId) {
      await channel.sendToQueue('ORDER-SENT-BLOCK-GET', Buffer.from(JSON.stringify(billIns.blockId)));
      await channel.consume('ORDER-SENT-BLOCK-INFO', (info) => {
        const listApartmentId = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('blockSent', listApartmentId);
      });
      setTimeout(() => eventEmitter.emit('blockSent'), 10000);
      const listIdApartment = await new Promise((resolve) => { eventEmitter.once('blockSent', resolve); });
      if (listIdApartment.length > 0) {
        query.apartmentId = { $in: listIdApartment };
      }
      if (billIns.apartmentId) {
        query.apartmentId = billIns.apartmentId;
      }
    }
    if (billIns.feeTypeId) {
      query.feeTypeId = billIns.feeTypeId;
    }
    const dataSentBill = await Order.find(query);
    if (dataSentBill.length > 0) {
      const listSentBill = dataSentBill.map((item) => ({
        updateOne: {
          filter: { _id: item._id, confirm: true },
          update: {
            $set: {
              status: 'SENT',
              sentDate: date,
            },
          },
        },
      }));
      await Order.bulkWrite(listSentBill);
      const updateFee = Array.from(dataSentBill, ({ feeId }) => feeId);
      await Fee.updateMany(
        { _id: { $in: updateFee } },
        { $set: { sent: true } },
      );
      return res.status(200).send({
        success: true,
      });
    }
    return res.status(400).send({
      success: false,
      error: 'Không có hóa đơn nào để gửi !',
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const billIns = req.body;
    const userId = req.headers.userid;
    billIns.updatedBy = userId;
    const order = await Order.findByIdAndUpdate(billId, billIns);
    if (req.body.confirm === false) {
      await Fee.findByIdAndUpdate(order.feeId, { confirm: false });
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

exports.deleteBill = async (req, res) => {
  try {
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

exports.exportBill = async (req, res) => {
  try {
    const billIns = req.body;
    const query = {
      projectId: billIns.projectId,
      month: billIns.month,
      confirm: true,
    };
    if (billIns.feeTypeId) {
      query.feeTypeId = billIns.feeTypeId;
    }
    if (billIns.status) {
      query.status = billIns.status;
    }

    const bill = await Order.find(query).select('-surcharge -vehicle -confirm -updatedBy -projectId -__v -feeId -level').sort({ apartmentId: -1 });

    if (bill.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'Tháng đã chọn không có hóa đơn!',
      });
    }

    // Get apartment information
    const listIdApartment = Array.from(bill, ({ apartmentId }) => apartmentId);
    await channel.sendToQueue('ORDER-EXPORT-APARTMENT-GET', Buffer.from(JSON.stringify(listIdApartment)));
    await channel.consume('ORDER-EXPORT-APARTMENT-INFO', (info) => {
      const dataApartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('apartmentDone', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('apartmentDone'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('apartmentDone', resolve); });

    // Get user information
    const listIdUser = Array.from(bill, ({ createdBy }) => createdBy);
    await channel.sendToQueue('ORDER-EXPORT-USER-GET', Buffer.from(JSON.stringify(listIdUser)));
    await channel.consume('ORDER-EXPORT-USER-INFO', (info) => {
      const dataUser = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('userDone', dataUser);
    });
    setTimeout(() => eventEmitter.emit('userDone'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('userDone', resolve); });

    // Information fee type
    const listFeeTypeId = Array.from(bill, ({ feeTypeId }) => feeTypeId);
    const feeType = await FeeType.find({ _id: { $in: listFeeTypeId } });
    const dataFeeType = feeType.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});

    bill.map((item) => {
      item._doc['Mã hóa đơn'] = item._id;
      delete item._doc._id;
      item._doc['Mã thiết bị'] = item.deviceId;
      delete item._doc.deviceId;
      item._doc['Loại phí'] = dataFeeType[item.feeTypeId].text;
      delete item._doc.feeTypeId;
      item._doc['Căn hộ'] = apartmentData[item.apartmentId].apartmentCode;
      item._doc.Block = apartmentData[item.apartmentId].block.name;
      delete item._doc.blockId;
      delete item._doc.apartmentId;
      item._doc['Chỉ số đầu'] = item.firstNumber;
      delete item._doc.firstNumber;
      item._doc['Chỉ số cuối'] = item.lastNumber;
      delete item._doc.lastNumber;
      item._doc['Số sử dụng'] = item.consumption;
      delete item._doc.consumption;
      item._doc['Đơn giá'] = item.price;
      delete item._doc.price;
      item._doc['Thành tiền'] = item.subTotal;
      delete item._doc.subTotal;
      item._doc['Tổng tiền'] = item.invoiceTotal;
      delete item._doc.invoiceTotal;
      if (item.status === 'UNSENT') {
        item.status = 'Chưa gửi hóa đơn';
      }
      if (item.status === 'SENT') {
        item._doc.status = 'Đã gửi hóa đơn';
      }
      if (item.status === 'SENT') {
        item._doc.status = 'Đã gửi hóa đơn';
      }
      if (item.status === 'PAID') {
        item._doc.status = 'Đã thanh toán';
      }
      if (item.status === 'OVERDUE') {
        item._doc.status = 'Trễ hạn';
      }
      if (item.status === 'DONE') {
        item._doc.status = 'Hoàn thành';
      }
      item._doc['Trạng thái thanh toán'] = item.status;
      delete item._doc.status;
      item._doc['Mô tả'] = item.description;
      delete item._doc.description;
      if (item.sentDate) {
        const sentDate = new Date(item.sentDate * 1);
        item._doc.sentDate = `${sentDate.toLocaleDateString('vi-VN')} ${sentDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      }
      item._doc['Ngày gửi hóa đơn'] = item.sentDate;
      delete item._doc.sentDate;
      item._doc['Mã phương tiện'] = item.vehicleId;
      delete item._doc.vehicleId;
      item._doc['Tạo bởi'] = userData[item.createdBy].fullName;
      delete item._doc.createdBy;
      item._doc['Kỳ thanh toán'] = item.month;
      delete item._doc.month;
      const createdAt = new Date(item.createdAt * 1);
      item._doc['Ngày tạo'] = `${createdAt.toLocaleDateString('vi-VN')} ${createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      delete item._doc.createdAt;
      const updatedAt = new Date(item.updatedAt * 1);
      item._doc['Ngày cập nhật'] = `${updatedAt.toLocaleDateString('vi-VN')} ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      delete item._doc.updatedAt;

      return item;
    });

    await channel.sendToQueue('ORDER-EXPORT-GET', Buffer.from(JSON.stringify({ bill, month: billIns.month })));
    await channel.consume('ORDER-EXPORT-INFO', (info) => {
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

exports.listBillApartmentOwner = async (req, res) => {
  try {
    const userId = req.headers.userid;
    await channel.sendToQueue('ORDER-LIST-APARTMENT-OWNER-GET', Buffer.from(JSON.stringify(userId)));
    await channel.consume('ORDER-LIST-APARTMENT-OWNER-INFO', (info) => {
      const dataApartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('doneOwner', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('doneOwner'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('doneOwner', resolve); });

    const totalInvoiceOfEachApartment = await Order.aggregate([
      {
        $match: {
          status: 'SENT', confirm: true,
        },
      },
      {
        $group: {
          _id: { apartmentId: '$apartmentId' }, sum: { $sum: '$invoiceTotal' },
        },
      },
    ]);
    const listOrderApartment = totalInvoiceOfEachApartment.reduce((acc, cur) => {
      const id = cur._id.apartmentId;
      return { ...acc, [id]: cur };
    }, {});

    const data = [];
    apartmentData.map((item) => {
      item.totalBill = listOrderApartment[item._id] ? listOrderApartment[item._id].sum : 0;
      if (item.totalBill > 0) {
        data.push(item);
      }
      return item;
    });

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

exports.listBillOfApartment = async (req, res) => {
  try {
    const { apartmentId } = req.query;

    const month = (new Date().getMonth() + 1);
    const year = new Date().getFullYear();
    const month1 = `${month}-${year}`;
    const month2 = `${month - 1 > 0 ? month - 1 : 12}-${month - 1 > 0 ? year : year - 1}`;
    const month3 = `${month2 - 1 > 0 ? month2 - 1 : 12}-${month2 - 1 > 0 ? year : year - 1}`;
    const listTotalBill = await Order.aggregate([
      {
        $match: {
          apartmentId: mongoose.Types.ObjectId(apartmentId),
          $or: [
            { status: 'SENT' },
            { status: 'OVERDUE' },
          ],
        },
      },
      { $group: { _id: '$feeTypeId', total: { $sum: '$invoiceTotal' } } },
    ]);
    const dataListTotalBill = listTotalBill.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});

    const listBillUnpaid = await Order.aggregate([
      {
        $match: {
          apartmentId: mongoose.Types.ObjectId(apartmentId),
          $or: [
            { status: 'SENT' },
            { status: 'OVERDUE' },
          ],
        },
      },
      { $group: { _id: { feeTypeId: '$feeTypeId', month: '$month' }, total: { $sum: '$invoiceTotal' } } },
    ]);
    const dataListBillUnpaid = listBillUnpaid.reduce((acc, cur) => {
      const id = cur._id.feeTypeId + cur._id.month;
      return { ...acc, [id]: cur };
    }, {});

    const listBillDone = await Order.aggregate([
      {
        $match: {
          apartmentId: mongoose.Types.ObjectId(apartmentId),
          status: 'DONE',
        },
      },
      { $group: { _id: { feeTypeId: '$feeTypeId', month: '$month' }, total: { $sum: '$invoiceTotal' } } },
    ]);
    const dataListBillDone = listBillDone.reduce((acc, cur) => {
      const id = cur._id.feeTypeId + cur._id.month;
      return { ...acc, [id]: cur };
    }, {});

    // danh sách loại phí
    const listFeeType = await FeeType.find().select('-__v -isExpand');

    listFeeType.map((item) => {
      item._doc.feeTypeId = item._id;
      item._doc.invoiceTotal = dataListTotalBill[item._id] ? dataListTotalBill[item._id].total : 0;
      item._doc.bill = {
        [month1]: dataListBillUnpaid[`${item._id}${month1}`]
          ? {
            invoiceTotal: dataListBillUnpaid[`${item._id}${month1}`].total,
            status: 'UNPAID',
            month: month1,
          }
          : dataListBillDone[`${item._id}${month1}`]
            ? {
              invoiceTotal: dataListBillDone[`${item._id}${month1}`].total,
              status: 'DONE',
              month: month1,
            }
            : null,
        [month2]: dataListBillUnpaid[`${item._id}${month2}`]
          ? {
            unPaid: dataListBillUnpaid[`${item._id}${month2}`].total,
            status: 'UNPAID',
            month: month2,
          }
          : dataListBillDone[`${item._id}${month2}`]
            ? {
              done: dataListBillDone[`${item._id}${month2}`].total,
              status: 'DONE',
              month: month2,
            }
            : null,
        [month3]: dataListBillUnpaid[`${item._id}${month3}`]
          ? {
            unPaid: dataListBillUnpaid[`${item._id}${month3}`].total,
            status: 'UNPAID',
            month: month3,
          }
          : dataListBillDone[`${item._id}${month3}`]
            ? {
              done: dataListBillDone[`${item._id}${month3}`].total,
              status: 'DONE',
              month: month3,
            }
            : null,
      };
      delete item._doc._id;
      delete item._doc.text;
      return item;
    });
    return res.status(200).send({
      success: true,
      data: listFeeType,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.listBillByStatus = async (req, res) => {
  try {
    const {
      status, month, page, limit, feeTypeId,
    } = req.query;
    const perPage = parseInt(limit || 5);
    const currentPage = parseInt(page || 1);
    const query = {};
    const userId = req.headers.userid;

    // Get the owner's apartment information
    await channel.sendToQueue('ORDER-LIST-APARTMENT-USER-GET', Buffer.from(JSON.stringify(userId)));
    await channel.consume('ORDER-LIST-APARTMENT-USER-INFO', (info) => {
      const dataApartment = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('doneOwner', dataApartment);
    });
    setTimeout(() => eventEmitter.emit('doneOwner'), 10000);
    const apartmentData = await new Promise((resolve) => { eventEmitter.once('doneOwner', resolve); });
    let listApartmentId;
    let listApartmentById;
    if (apartmentData.length > 0) {
      listApartmentId = Array.from(apartmentData, ({ _id }) => _id);
      query.apartmentId = { $in: listApartmentId };
      listApartmentById = apartmentData.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});
    }

    if (status) { query.status = status; }
    if (month) { query.month = month; }
    if (feeTypeId) { query.feeTypeId = feeTypeId; }
    const data = await Order.find(query)
      .sort({ _id: -1 })
      .select('apartmentId feeTypeId createdBy invoiceTotal createdAt updatedAt senDate payment status ')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    const total = await Order.countDocuments(query);
    const totalPage = Math.ceil(total / perPage);

    // Get user information
    const listUserId = Array.from(data, ({ createdBy }) => createdBy);
    await channel.sendToQueue('ORDER-LIST-DETAIL-USER-GET', Buffer.from(JSON.stringify(listUserId)));
    await channel.consume('ORDER-LIST-DETAIL-USER-INFO', (info) => {
      const dataUser = JSON.parse(info.content);
      channel.ack(info);
      eventEmitter.emit('userDone', dataUser);
    });
    setTimeout(() => eventEmitter.emit('userDone'), 10000);
    const userData = await new Promise((resolve) => { eventEmitter.once('userDone', resolve); });

    // Get information type
    const listFeeType = await FeeType.find();
    const feeType = listFeeType.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});

    // format data
    data.map((item) => {
      item._doc.apartment = {
        _id: item.apartmentId,
        name: listApartmentById[item.apartmentId].apartmentCode,
      };
      item._doc.createdBy = {
        name: userData[item.createdBy].fullName,
        phone: userData[item.createdBy].phone,
      };
      item._doc.feeType = {
        _id: item.feeTypeId,
        name: feeType[item.feeTypeId].text,
      };
      delete item._doc.apartmentId;
      return item;
    });

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

exports.listDetailBillOfApartment = async (req, res) => {
  try {
    const { apartmentId, feeTypeId } = req.query;
    const query = { apartmentId, status: { $in: ['SENT', 'OVERDUE'] } };
    if (feeTypeId) { query.feeTypeId = feeTypeId; }
    const bill = await Order.find(query).select('invoiceTotal createdAt feeTypeId month status vehicleId');

    // Get information type
    const listFeeType = await FeeType.find().select('-__v -isExpand');
    const feeType = listFeeType.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});

    bill.map((item) => {
      item._doc.feeType = feeType[item.feeTypeId];
      if (feeType[item.feeTypeId].name !== 'VEHICLE') {
        delete item._doc.vehicleId;
      }
      delete item._doc.feeTypeId;
      return item;
    });

    return res.status(200).send({
      success: true,
      data: bill,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.payTheBill = async (req, res) => {
  try {
    const billIns = req.body;
    const userId = req.headers.userid;
    const date = new Date().valueOf();
    await Order.updateMany(
      { _id: { $in: billIns.listBillId } },
      {
        $set: {
          status: 'PAID',
          updatedAt: date,
          payer: userId,
          payment: 'TRANSFER',
        },
      },
    );
    const listOrder = await Order.find({ _id: { $in: billIns.listBillId } })
      .select('invoiceTotal feeTypeId apartmentId status vehicleId createdAt');
    const data = {};
    if (listOrder.length > 0) {
      // Get user information
      const { apartmentId } = listOrder[0];
      await channel.sendToQueue('PAYMENT-APARTMENT-GET', Buffer.from(JSON.stringify(apartmentId)));
      await channel.consume('PAYMENT-APARTMENT-INFO', (info) => {
        const dataApartment = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('apartmentDone', dataApartment);
      });
      setTimeout(() => eventEmitter.emit('apartmentDone'), 10000);
      const apartmentData = await new Promise((resolve) => { eventEmitter.once('apartmentDone', resolve); });

      // Get user information
      await channel.sendToQueue('PAYMENT-USER-GET', Buffer.from(JSON.stringify(userId)));
      await channel.consume('PAYMENT-USER-INFO', (info) => {
        const dataUser = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('userDone', dataUser);
      });
      setTimeout(() => eventEmitter.emit('userDone'), 10000);
      const userData = await new Promise((resolve) => { eventEmitter.once('userDone', resolve); });

      // Get information type
      const listFeeType = await FeeType.find().select('-__v -isExpand');
      const feeType = listFeeType.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});

      // format data
      let total = 0;
      listOrder.map((item) => {
        total += item.invoiceTotal;
        if (!item.vehicleId) {
          delete item._doc.vehicleId;
        }
        item._doc.feeType = feeType[item.feeTypeId];
        item._doc.apartment = {
          _id: apartmentData._id,
          name: apartmentData.apartmentCode,
          floor: apartmentData.floor.name,
        };
        item._doc.payer = {
          _id: userData._id,
          name: userData.fullName,
          phone: userData.phone,
        };
        item._doc.dateOfPayment = new Date().valueOf();
        delete item._doc.apartmentId;
        delete item._doc.feeTypeId;
        payment.info(item);
        delete item._doc.apartment;
        delete item._doc.payer;
        delete item._doc.dateOfPayment;
        return item;
      });
      data.dateOfPayment = new Date().valueOf();
      data.payer = {
        _id: userData._id,
        name: userData.fullName,
        phone: userData.phone,
      };
      data.apartment = {
        _id: apartmentData._id,
        name: apartmentData.apartmentCode,
        floor: apartmentData.floor.name,
      };
      data.total = total;
      data.bill = listOrder;
    }
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

exports.paymentHistory = async (req, res) => {
  try {
    const { month, apartmentId } = req.query;

    // lấy dữ liệu từ file .logs
    const dataFileText = fs.readFileSync(path.join(__dirname, '../../order-service/log/payment.log'), 'utf-8');

    // chuyển file từ text sang json
    const dataFileArray = dataFileText.split('\n');
    dataFileArray.pop();
    const dataFileJson = dataFileArray.map((item) => JSON.parse(item));

    // lấy lịch sử thanh toán theo tháng và căn hộ
    const transactionHistory = [];
    dataFileJson.map((item) => {
      const data = item.message;
      const dateCreateBill = new Date(data.createdAt * 1);
      const monthBill = `${dateCreateBill.getMonth() + 1}-${dateCreateBill.getFullYear()}`;
      if (monthBill === month && apartmentId === data.apartment._id) {
        transactionHistory.push(item.message);
      }
      return item;
    });
    return res.status(200).send({
      success: true,
      data: transactionHistory,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.revenueStatistics = async (req, res) => {
  try {
    const { projectId, blockId, feeTypeId } = req.query;
    const idProject = mongoose.Types.ObjectId(projectId);
    const query = { projectId: idProject, status: 'DONE' };
    if (blockId) { query.blockId = mongoose.Types.ObjectId(blockId); }
    if (feeTypeId) { query.feeTypeId = mongoose.Types.ObjectId(feeTypeId); }
    const data = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%m/%Y',
              date: {
                $toDate: {
                  $toDouble: '$createdAt',
                },
              },
            },
          },
          total: { $sum: '$invoiceTotal' },
        },
      },
    ]);

    // sắp xếp dữ liệu theo tháng
    const monthYear = Array.from(data, ({ _id }) => _id);
    const sorted = monthYear.sort((a, b) => {
      a = a.split('/');
      b = b.split('/');
      return new Date(a[1], a[0], 1) - new Date(b[1], b[0], 1);
    });

    // dữ liệu hóa đơn theo tháng
    const dataOrder = data.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});

    // lấy dữ liệu 12 tháng gần nhất
    const get12Month = sorted.filter((item, index) => index > (sorted.length - 13));
    const monthlyStatisticsList = [];
    get12Month.map((item) => {
      const dataMonth = {
        _id: item,
        total: dataOrder[item].total,
      };
      monthlyStatisticsList.push(dataMonth);
      return item;
    });

    return res.status(200).send({
      success: true,
      data: monthlyStatisticsList,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.debtStatistics = async (req, res) => {
  try {
    const { projectId, blockId, feeTypeId } = req.query;
    const idProject = mongoose.Types.ObjectId(projectId);
    const query = { projectId: idProject, status: { $in: ['SENT', 'OVERDUE'] } };
    if (blockId) { query.blockId = blockId; }
    if (feeTypeId) { query.blockId = feeTypeId; }
    const chartDebt = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%m/%Y',
              date: {
                $toDate: {
                  $multiply: [
                    { $toDouble: '$createdAt' },
                    1,
                  ],
                },
              },
            },
          },
          total: { $sum: '$invoiceTotal' },
        },
      },
    ]);

    // sắp xếp dữ liệu theo tháng
    const monthYear = Array.from(chartDebt, ({ _id }) => _id);
    const sorted = monthYear.sort((a, b) => {
      a = a.split('/');
      b = b.split('/');
      return new Date(a[1], a[0], 1) - new Date(b[1], b[0], 1);
    });

    // dữ liệu hóa đơn theo tháng
    const dataOrder = chartDebt.reduce((acc, cur) => {
      const id = cur._id;
      return { ...acc, [id]: cur };
    }, {});
    const monthlyStatisticsList = [];

    // lấy dữ liệu 12 tháng gần nhất
    const get12Month = sorted.filter((item, index) => index > (sorted.length - 13));
    get12Month.map((item) => {
      const dataMonth = {
        _id: item,
        total: dataOrder[item].total,
      };
      monthlyStatisticsList.push(dataMonth);
      return item;
    });

    return res.status(200).send({
      success: true,
      data: monthlyStatisticsList,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.listDebt = async (req, res) => {
  try {
    const { projectId } = req.query;
    const idProject = mongoose.Types.ObjectId(projectId);
    const listDebt = await Order.aggregate([
      { $match: { projectId: idProject, status: { $in: ['SENT', 'OVERDUE'] } } },
      {
        $group: {
          _id: '$apartmentId', bill: { $push: '$$ROOT' }, total: { $sum: '$invoiceTotal' },
        },
      },
    ]);
    if (listDebt.length > 0) {
      const listApartmentId = Array.from(listDebt, ({ _id }) => _id);
      await channel.sendToQueue('STATISTICS-APARTMENT-GET', Buffer.from(JSON.stringify(listApartmentId)));
      await channel.consume('STATISTICS-APARTMENT-INFO', (info) => {
        const dataApartment = JSON.parse(info.content);
        channel.ack(info);
        eventEmitter.emit('apartmentDone', dataApartment);
      });
      setTimeout(() => eventEmitter.emit('apartmentDone'), 10000);
      const apartmentData = await new Promise((resolve) => { eventEmitter.once('apartmentDone', resolve); });
      const apartmentDatalist = apartmentData.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});

      let userData;
      if (apartmentData.length > 0) {
        const listUserId = Array.from(apartmentData, ({ owner }) => owner);
        await channel.sendToQueue('STATISTICS-USER-GET', Buffer.from(JSON.stringify(listUserId)));
        await channel.consume('STATISTICS-USER-INFO', (info) => {
          const dataUser = JSON.parse(info.content);
          channel.ack(info);
          eventEmitter.emit('userDone', dataUser);
        });
        setTimeout(() => eventEmitter.emit('userDone'), 10000);
        userData = await new Promise((resolve) => { eventEmitter.once('userDone', resolve); });
      }
      // Get information type
      const listFeeType = await FeeType.find().select('-__v -isExpand');
      const feeType = listFeeType.reduce((acc, cur) => {
        const id = cur._id;
        return { ...acc, [id]: cur };
      }, {});

      if (userData) {
        listDebt.map((item) => {
          item.apartment = {
            name: apartmentDatalist[item._id].apartmentCode,
            block: apartmentDatalist[item._id].block.name,
            floor: apartmentDatalist[item._id].floor.name,
          };
          item.bill.map((element) => {
            element.feeType = feeType[element.feeTypeId];
            delete element.feeTypeId;
            return element;
          });
          item.owner = {
            name: userData[apartmentDatalist[item._id].owner].fullName,
            phone: userData[apartmentDatalist[item._id].owner].phone,
          };
          return item;
        });
      }
    }
    return res.status(200).send({
      success: true,
      data: listDebt,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
