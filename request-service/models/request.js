/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const requestSchema = new Schema({
  code: {
    type: String,
    unique: true,
    require: true,
  },
  type: {
    type: Schema.Types.ObjectId,
    require: true,
    ref: 'Type',
  },
  projectId: {
    type: Schema.Types.ObjectId,
  },
  blockId: {
    type: Schema.Types.ObjectId,
  },
  apartmentId: {
    type: Schema.Types.ObjectId,
  },
  otherContact: {
    type: String,
    default: null,
  },
  content: {
    type: String,
    require: true,
  },
  staff: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  status: {
    type: String,
    enum: ['NEW', 'ACCEPT', 'COMPLETE', 'CANCEL'],
    default: 'NEW',
  },
  descriptionFile: {
    type: String,
    default: null,
  },
  evaluate: {
    rate: {
      type: Number,
      default: 0,
    },
    explain: {
      type: String,
      default: null,
    },
  },
  createdAt: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  timeSend: {
    type: String,
  },
  timeHandle: {
    type: String,
  },
  timeCompleted: {
    type: String,
  },
}, {
  toJSON: { getters: true },
  id: false,
});

requestSchema.virtual('descriptionFilePath').get(function () {
  if (!this.descriptionFile) { return `${process.env.IMAGE_URL}/image_default.jpg`; }
  return `${process.env.IMAGE_URL}request/${this.code}/${this.descriptionFile}`;
});

requestSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  if (this.status === 'NEW' || !this.status) {
    this.set({ timeSend: new Date().valueOf() });
  }
  if (this.status === 'ACCEPT') {
    this.set({ timeHandle: new Date().valueOf() });
  }
  if (this.status === 'COMPLETE') {
    this.set({ timeCompleted: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

requestSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  if (this._update.status === 'NEW' || !this._update.status) {
    this.set({ timeSend: new Date().valueOf() });
  }
  if (this._update.status === 'ACCEPT') {
    this.set({ timeHandle: new Date().valueOf() });
  }
  if (this._update.status === 'COMPLETE') {
    this.set({ timeCompleted: new Date().valueOf() });
  }
  next();
});
const Request = mongoose.model('Request', requestSchema);
module.exports = Request;
