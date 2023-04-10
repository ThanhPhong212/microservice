const mongoose = require('mongoose');

const { Schema } = mongoose;

const parkingSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  name: String,
  blockId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  floor: {
    type: Number,
    default: 0,
  },
  acreage: Number,
  quantityConfig: {
    motor: Number,
    car: Number,
    bicycle: Number,
  },
  status: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
  },
  isDeleted: {
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
    default: new Date().valueOf(),
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
}, {
  toJSON: { getters: true },
  id: false,
});

parkingSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

parkingSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
const Parking = mongoose.model('Parking', parkingSchema);
module.exports = Parking;
