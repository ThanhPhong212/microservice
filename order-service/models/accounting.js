const mongoose = require('mongoose');

const { Schema } = mongoose;
const accountingSchema = new Schema({
  projectId: Schema.Types.ObjectId,
  apartmentId: Schema.Types.ObjectId,
  blockId: Schema.Types.ObjectId,
  invoiceTotal: {
    type: Number,
    default: 0,
  },
  to: String,
  month: String,
  description: {
    type: String,
    default: null,
  },
  receiptType: {
    type: Boolean,
    default: true,
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

accountingSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

accountingSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

module.exports = mongoose.model('Accounting', accountingSchema);
