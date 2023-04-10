const mongoose = require('mongoose');

const { Schema } = mongoose;

const blockSchema = new Schema({
  name: {
    type: String,
  },
  idProject: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    require: true,
  },
  numberFloor: {
    type: Number,
    default: 0,
  },
  numberApartment: {
    type: Number,
    default: 0,
  },
  floor: [{
    name: String,
  }],
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

const Block = mongoose.model('Block', blockSchema);
module.exports = Block;
