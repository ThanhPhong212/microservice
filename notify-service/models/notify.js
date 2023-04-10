const mongoose = require('mongoose');

const { Schema } = mongoose;
const notifySchema = new Schema({
  title: {
    type: String,
    require: true,
  },
  content: {
    type: String,
    require: true,
  },
  level: {
    type: String,
    enum: ['IMPORTANCE', 'NOT-IMPORTANCE'],
    require: true,
  },
  type: {
    type: String,
    enum: ['NOTIFY'],
    default: 'NOTIFY',
  },
  toProject: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  toBlock: {
    type: Schema.Types.ObjectId,
  },
  toFloor: {
    type: Schema.Types.ObjectId,
  },
  toApartment: {
    type: Schema.Types.ObjectId,
  },
  schedule: {
    type: Date,
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
  file: {
    type: String,
    default: null,
  },
}, {
  toJSON: { getters: true },
  get: (time) => time.toDateString(),
});

notifySchema.virtual('notifyFilePath').get(function () {
  if (!this.file) { return null; }
  return `${process.env.AVATAR_URL}notify/${this.id}/${this.file}`;
});

notifySchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
notifySchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
const Notify = mongoose.model('Notify', notifySchema);
module.exports = Notify;
