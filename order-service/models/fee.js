const mongoose = require('mongoose');

const { Schema } = mongoose;

const feeSchema = new Schema({
  projectId: Schema.Types.ObjectId,
  apartmentId: Schema.Types.ObjectId,
  blockId: Schema.Types.ObjectId,
  feeTypeId: {
    type: Schema.Types.ObjectId,
    ref: 'FeeType',
  },
  deviceId: {
    type: String,
    default: null,
  },
  firstNumber: {
    type: Number,
    default: 0,
  },
  lastNumber: {
    type: Number,
    default: 0,
  },
  consumption: {
    type: Number,
    default: 0,
  },
  confirm: {
    type: Boolean,
    default: false,
  },
  month: {
    type: String,
  },
  price: {
    type: Number,
    default: 0,
  },
  sent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  updatedAt: {
    type: String,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
}, {
  toJSON: { getters: true },
  id: false,
});

feeSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

feeSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
