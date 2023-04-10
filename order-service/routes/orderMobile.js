const { getFeeType } = require('../controllers/feeConfig');
const {
  listBillApartmentOwner,
  listBillOfApartment,
  listBillByStatus,
  listDetailBillOfApartment,
  payTheBill,
  paymentHistory,
} = require('../controllers/order');

module.exports = (app, router) => {
  router.get('/mobile/order/bills/user', listBillApartmentOwner);
  router.get('/mobile/order/total-bills/apartment', listBillOfApartment);
  router.get('/mobile/order/bills/status', listBillByStatus);
  router.get('/mobile/order/fee-type', getFeeType);
  router.get('/mobile/order/bills/apartment', listDetailBillOfApartment);
  router.put('/mobile/order/bills', payTheBill);
  router.get('/mobile/order/payment/history', paymentHistory);

  // step
  app.use('/v1', router);
};
