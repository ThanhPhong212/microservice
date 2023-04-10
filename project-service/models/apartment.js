const mongoose = require('mongoose');

const { Schema } = mongoose;

const apartmentSchema = new Schema({
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
  floor: {
    _id: String,
    name: String,
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
  apartmentWallet: {
    type: String,
  },
  description: {
    type: String,
  },
  createdBy: {
    type: String,
  },
  updatedBy: {
    type: String,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

const Apartment = mongoose.model('Apartment', apartmentSchema);
module.exports = Apartment;
