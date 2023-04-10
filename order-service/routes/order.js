const {
  listAccounting, createExpenses, editExpenses, exportReceipt,
} = require('../controllers/accounting');
const {
  listFee, createFeeApartment, createFeeVehicle, confirmFee, createFeeDevice, apartmentBillList,
} = require('../controllers/fee');
const {
  createFeeConfig, getFeeType, editFeeConfig, getListFeeConfig, getFeeConfigById,
} = require('../controllers/feeConfig');
const {
  getOderByFeeId,
  getAllOrder,
  createBill,
  getOderById,
  sentBill,
  exportBill,
  updateBill,
  revenueStatistics,
  debtStatistics,
  listDebt,
} = require('../controllers/order');
const validation = require('../middlewares/validation');
const { createFeeValidate } = require('../validates/fee.validate');
const { createFeeConfigValidate, updateFeeConfigValidate } = require('../validates/feeConfig.validate');

module.exports = (app, router) => {
  router.get('/order/fee', listFee);
  router.post('/order/fee/apartment', validation(createFeeValidate), createFeeApartment);
  router.post('/order/fee/vehicle-card', validation(createFeeValidate), createFeeVehicle);
  router.post('/order/fee/device', validation(createFeeValidate), createFeeDevice);
  router.put('/order/fee/confirm', confirmFee);
  router.get('/order/fee-config', getListFeeConfig);
  router.get('/order/fee-config/:feeConfigId', getFeeConfigById);
  router.post('/order/fee-config', validation(createFeeConfigValidate), createFeeConfig);
  router.put('/order/fee-config/:feeConfigId', validation(updateFeeConfigValidate), editFeeConfig);

  // feeType
  router.get('/order/fee-type', getFeeType);

  // bill
  router.get('/order', getOderByFeeId);
  router.get('/order/bill', getAllOrder);
  router.post('/order/bill/export', exportBill);
  router.put('/order/bill/sent-bill', sentBill);
  router.put('/order/bill/:billId', updateBill);
  router.post('/order/bill', createBill);
  router.get('/order/bill/apartment', apartmentBillList);
  router.get('/order/bill/:billId', getOderById);

  // accounting
  router.post('/order/accounting/export', exportReceipt);
  router.post('/order/accounting', createExpenses);
  router.put('/order/accounting', editExpenses);
  router.get('/order/accounting', listAccounting);

  router.get('/order/statistics/revenue', revenueStatistics);
  router.get('/order/statistics/debt', debtStatistics);
  router.get('/order/statistics/list-debt', listDebt);

  // step
  app.use('/v1', router);
};
