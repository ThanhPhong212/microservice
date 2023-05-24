const mongoose = require('mongoose');

const { Schema } = mongoose;

const serviceSchema = new Schema({
  name: {
    type: String,
    require: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  thumbnail: {
    type: String,
    default: null,
  },
  description: {
    type: String,
    default: null,
  },
  rule: {
    type: String,
    default: null,
  },
  typeAccept: {
    type: String,
    enum: ['MANUAL', 'AUTO'],
    default: 'MANUAL',
  },
  slotConfig: [{
    slotName: {
      type: String,
      default: null,
    },
    slotCapacity: {
      type: Number,
      default: 0,
    },
  }],
  typeWork: {
    type: String,
    enum: ['EVERYDAY', 'DAYOFWEEK'],
    require: true,
  },
  setupEveryDay: {
    type: Array,
    default: [],
  },
  setupDayOfWeek: {
    type: Schema.Types.Mixed,
    default: {},
  },
  dayOff: [{
    type: String,
  }],
  fee: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Boolean,
    default: true,
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

serviceSchema.virtual('thumbnailPath').get(function () {
  if (!this.thumbnail) { return `${process.env.IMAGE_URL}image_default.jpg`; }
  // eslint-disable-next-line no-underscore-dangle
  return `${process.env.IMAGE_URL}service/${this._id}/${this.thumbnail}`;
});

serviceSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
serviceSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
