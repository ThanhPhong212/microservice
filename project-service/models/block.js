const mongoose = require('mongoose');

const { Schema } = mongoose;

const blockSchema = new Schema({
  name: {
    type: String,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    require: true,
  },
  numberApartment: {
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

blockSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
blockSchema.pre(['updateOne', 'findOneAndUpdate', 'updateOne'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

const Block = mongoose.model('Block', blockSchema);
module.exports = Block;
