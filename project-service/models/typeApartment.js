const mongoose = require('mongoose');

const { Schema } = mongoose;

const typeApartmentSchema = new Schema({
  name: {
    type: String,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    require: true,
  },
  quantity: {
    type: Number,
    default: 0,
  },
  toilet: {
    type: Number,
    default: 0,
  },
  bedroom: {
    type: Number,
    default: 0,
  },
  kitchen: {
    type: Number,
    default: 0,
  },
  balcony: {
    type: Number,
    default: 0,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: String, default: null },
  updatedAt: { type: String, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
});

typeApartmentSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
typeApartmentSchema.pre(['updateOne', 'findOneAndUpdate', 'updateOne'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
const TypeApartment = mongoose.model('TypeApartment', typeApartmentSchema);
module.exports = TypeApartment;
