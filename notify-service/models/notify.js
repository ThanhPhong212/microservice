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
    enum: ['HOUSE_ROOF', 'CASHBACK', 'PPA', 'TASK'],
    default: 'HOUSE_ROOF',
  },
  toProject: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  toBlock: {
    type: Schema.Types.ObjectId,
  },
  toApartment: {
    type: Schema.Types.ObjectId,
  },
  toUser: String,
  schedule: {
    type: Date,
  },
  seen: { type: Boolean, default: false },
  listSeen: [{ type: String }],
  url: { type: String, default: null },
  typeNotify: {
    type: String,
    enum: ['MANAGEMENT', 'SYSTEM'],
    default: 'SYSTEM',
  },
  createdAt: {
    type: String,
  },
  createdBy: {
    type: String,
    default: 'System',
  },
  updatedAt: String,
  updatedBy: {
    type: String,
    default: 'System',
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
  return `${process.env.IMAGE_URL}notify/${this.id}/${this.file}`;
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
