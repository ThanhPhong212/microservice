/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const registerSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  otherContact: String,
  userId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  apartmentId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    require: true,
  },
  amount: {
    adult: Number,
    child: Number,
  },
  registrationDate: String,
  slotId: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  time: {
    type: Array,
    default: [],
  },
  note: String,
  description: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['PROCESS', 'PAYMENT', 'DONE', 'CANCEL'],
    default: 'PROCESS',
  },
  reason: String,
  timeDone: String,
  timeCancel: String,
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
});

registerSchema.virtual('amountTotal').get(function () {
  const adult = this.amount.adult ? this.amount.adult : 0;
  const child = this.amount.child ? this.amount.child : 0;
  return adult + child;
});

registerSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
registerSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  if (this._update.status === 'DONE') {
    this.set({ timeDone: new Date().valueOf() });
    this.set({ timeCancel: null });
  }
  if (this._update.status === 'PAYMENT') {
    this.set({ timeDone: null });
    this.set({ timeCancel: null });
  }
  if (this._update.status === 'CANCEL') {
    this.set({ timeDone: null });
    this.set({ timeCancel: new Date().valueOf() });
  }
  next();
});
const Register = mongoose.model('Register', registerSchema);
module.exports = Register;
