const mongoose = require('mongoose');

const { Schema } = mongoose;

const apartmentSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  apartmentCode: {
    type: String,
  },
  typeApartment: {
    type: Schema.Types.ObjectId,
    ref: 'TypeApartment',
    required: true,
  },
  block: {
    type: Schema.Types.ObjectId,
    ref: 'Block',
    required: true,
  },
  areaApartment: {
    type: Number,
  },
  owner: Schema.Types.ObjectId,
  relativeOwners: [
    {
      type: Schema.Types.ObjectId,
      default: [],
    },
  ],
  tenants: [
    {
      type: Schema.Types.ObjectId,
      default: [],
    },
  ],
  memberTenants: [
    {
      type: Schema.Types.ObjectId,
      default: [],
    },
  ],
  electricId: {
    type: String,
    default: null,
  },
  waterId: {
    type: String,
    default: null,
  },
  apartmentWallet: String,
  description: String,
  createdAt: { type: String, default: null },
  updatedAt: { type: String, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  status: {
    type: Boolean,
    default: true,
  },
});

apartmentSchema.pre('save', function (next) {
  this.set({ createdAt: new Date().valueOf() });
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
apartmentSchema.pre(['updateOne', 'findOneAndUpdate', 'updateOne'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
const Apartment = mongoose.model('Apartment', apartmentSchema);
module.exports = Apartment;
