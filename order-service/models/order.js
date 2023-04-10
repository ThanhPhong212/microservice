const mongoose = require('mongoose');

const { Schema } = mongoose;

const orderSchema = new Schema({
  projectId: Schema.Types.ObjectId,
  apartmentId: Schema.Types.ObjectId,
  blockId: Schema.Types.ObjectId,
  feeTypeId: {
    type: Schema.Types.ObjectId,
    ref: 'FeeType',
  },
  feeId: {
    type: Schema.Types.ObjectId,
    ref: 'Fee',
  },
  deviceId: {
    type: String,
    default: null,
  },
  firstNumber: {
    type: Number,
    default: null,
  },
  lastNumber: {
    type: Number,
    default: null,
  },
  level: [
    {
      name: {
        type: String,
        default: 0,
      },
      from: {
        type: Number,
        default: 0,
      },
      to: {
        type: Number,
        default: 0,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
  ],
  price: Number,
  consumption: Number,
  surcharge: {
    type: Array,
    default: [],
  },
  subTotal: {
    type: Number,
    default: 0,
  },
  invoiceTotal: {
    type: Number,
    default: 0,
  },
  month: String,
  status: {
    type: String,
    enum: ['UNSENT', 'SENT', 'PAID', 'OVERDUE', 'DONE'],
    default: 'UNSENT',
  },
  payer: Schema.Types.ObjectId,
  description: {
    type: String,
    default: null,
  },
  payment: {
    type: String,
    enum: ['CASH', 'TRANSFER'],
    default: 'CASH',
  },
  createdAt: {
    type: String,
  },
  sentDate: {
    type: String,
    default: null,
  },
  vehicle: {
    type: String,
    enum: ['CAR', 'MOTOR', null],
    default: null,
  },
  vehicleId: {
    type: String,
    default: null,
  },
  confirm: {
    type: Boolean,
    default: false,
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

orderSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

orderSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

module.exports = mongoose.model('Order', orderSchema);
