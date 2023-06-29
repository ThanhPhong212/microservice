/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const eventSchema = new Schema({
  projectId: { type: String },
  title: { type: String },
  time: { type: String },
  location: { type: String },
  slot: { type: Number, default: 0 },
  content: { type: String },
  image: { type: String },
  fees: { type: Number, default: 0 },
  interest: [{ type: String, default: [] }],
  participants: [{ type: String, default: [] }],
  status: { type: Boolean, default: true },
  createdAt: { type: String },
  updatedAt: { type: String },
  createdBy: {
    type: String,
    default: null,
  },
  updatedBy: {
    type: String,
    default: null,
  },
}, {
  toJSON: { getters: true },
  id: false,
});

eventSchema.virtual('imagePath').get(function () {
  if (!this.image) { return `${process.env.IMAGE_URL}image_default.jpg`; }
  return `${process.env.IMAGE_URL}event/${this._id}/${this.image}`;
});

eventSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
eventSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
