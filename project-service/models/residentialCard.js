const mongoose = require('mongoose');

const { Schema } = mongoose;

const residentialCardSchema = new Schema({
  projectId: String,
  apartmentId: String,
  name: String,
  phone: String,
  email: String,
  numberIdentify: String,
  imageResident: String,
  status: {
    type: String,
    enum: ['PROCESS', 'DONE', 'CANCEL', 'REFUSE'],
    default: 'PROCESS',
  },
  // role: {
  //   type: String,
  //   enum: ['RELATIVE_OWNER', ' TENANT', 'MEMBER_TENANT'],
  //   default: null,
  // },
  createdAt: { type: String, default: null },
  updatedAt: { type: String, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, {
  toJSON: { getters: true, id: false },
});

residentialCardSchema.virtual('imageResidentPath').get(function () {
  if (this.imageResident) {
    return `${process.env.IMAGE_URL}/residentialCard/${this.id}/${this.imageResident}`;
  }
  return `${process.env.IMAGE_URL}/defaultImage.jpg`;
});
residentialCardSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
residentialCardSchema.pre(['updateOne', 'findOneAndUpdate', 'updateOne'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
const ResidentialCard = mongoose.model('ResidentialCard', residentialCardSchema);
module.exports = ResidentialCard;
