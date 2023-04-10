const mongoose = require('mongoose');

const { Schema } = mongoose;

const { data } = require('../config/data');

const feeTypeSchema = new Schema({
  name: String,
  text: {
    type: String,
    default: null,
  },
  isExpand: {
    type: Boolean,
    default: false,
  },
});

const FeeType = mongoose.model('FeeType', feeTypeSchema);
async function initFeeType() {
  const type = await FeeType.findOne({});
  if (!type) {
    await FeeType.insertMany(data.feeType);
  }
}
initFeeType();
module.exports = FeeType;
