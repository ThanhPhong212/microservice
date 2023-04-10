const mongoose = require('mongoose');

const { Schema } = mongoose;

const feeConfigSchema = new Schema({
  name: {
    type: String,
    require: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  description: String,
  feeTypeId: {
    type: Schema.Types.ObjectId,
    ref: 'FeeType',
    require: true,
  },
  level: [
    {
      name: {
        type: String,
        default: null,
      },
      from: {
        type: Number,
        default: null,
      },
      to: {
        type: Number,
        default: null,
      },
      price: Number,
    },
  ],
  price: {
    type: Number,
    default: 0,
  },
  surcharge: [
    {
      name: String,
      value: Number,
      isPercent: {
        type: Boolean,
        default: true,
      },
    },
  ],
  vehicle: {
    type: String,
    enum: [null, 'CAR', 'MOTOR'],
    default: null,
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

feeConfigSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

feeConfigSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
module.exports = mongoose.model('FeeConfig', feeConfigSchema);
