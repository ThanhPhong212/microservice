/* eslint-disable no-use-before-define */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const projectSchema = new Schema({
  name: {
    type: String,
  },
  description: {
    type: String,
  },
  hotline: {
    type: String,
  },
  area: {
    type: Number,
    default: 0,
  },
  block: [{
    type: Schema.Types.ObjectId,
    ref: 'Block',
  }],
  typeApartment: [{
    type: Schema.Types.ObjectId,
    ref: 'TypeApartment',
  }],
  service: {
    type: Number,
    default: 0,
  },
  basement: {
    type: Number,
    default: 0,
  },
  province: {
    type: String,
    default: null,
  },
  district: {
    type: String,
    default: null,
  },
  ward: {
    type: String,
    default: null,
  },
  address: {
    type: String,
    default: null,
  },
  thumbnail: {
    type: String,
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
}, {
  toJSON: { getters: true },
  id: false,
});

// eslint-disable-next-line func-names
projectSchema.virtual('thumbnailPath').get(function () {
  if (this.thumbnail) {
    // eslint-disable-next-line no-underscore-dangle
    return `${process.env.AVATAR_URL}project/${this._id}/${this.thumbnail}`;
  }
  return `${process.env.AVATAR_URL}/homedefault.png`;
});

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
