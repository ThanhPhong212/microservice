/* eslint-disable no-underscore-dangle */
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
  createdAt: { type: String, default: null },
  updatedAt: { type: String, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, {
  toJSON: { getters: true },
  id: false,
});

projectSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

projectSchema.pre(['updateOne', 'findOneAndUpdate', 'updateOne'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

projectSchema.virtual('thumbnailPath').get(function () {
  if (this.thumbnail) {
    return `${process.env.IMAGE_URL}project/${this._id}/${this.thumbnail}`;
  }
  return `${process.env.IMAGE_URL}/image_default.jpg`;
});

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
