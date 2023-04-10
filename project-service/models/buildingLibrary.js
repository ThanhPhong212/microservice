const mongoose = require('mongoose');

const { Schema } = mongoose;

const buildingLibrarySchema = new Schema({
  name: {
    type: String,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    require: true,
  },
  file: String,
  imageCKEditor: [],
  description: String,
  createdAt: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  updatedAt: {
    type: String,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
}, {
  toJSON: { getters: true },
  id: false,
});

buildingLibrarySchema.virtual('filePath').get(function () {
  if (this.file) {
    // eslint-disable-next-line no-underscore-dangle
    return `${process.env.AVATAR_URL}library/${this._id}/${this.file}`;
  }
  return null;
});

buildingLibrarySchema.pre('save', function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  this.set({ createdAt: new Date().valueOf() });
  next();
});

buildingLibrarySchema.pre(['updateOne', 'findByIdAndUpdate'], function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

const buildingLibrary = mongoose.model('BuildingLibrary', buildingLibrarySchema);
module.exports = buildingLibrary;
