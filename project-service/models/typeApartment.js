const mongoose = require('mongoose');

const { Schema } = mongoose;

const typeApartmentSchema = new Schema({
  name: {
    type: String,
  },
  idProject: {
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
  createdAt: {
    type: Date,
    default: new Date(),
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: new Date(),
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
});

const TypeApartment = mongoose.model('TypeApartment', typeApartmentSchema);
module.exports = TypeApartment;
