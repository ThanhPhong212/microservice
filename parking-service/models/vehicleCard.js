/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const vehicleCardSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  apartmentId: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  cardCode: String,
  licensePlate: String,
  vehicleBrand: String,
  vehicleType: {
    type: String,
    enum: ['MOTOR', 'CAR', 'BICYCLE'],
  },
  vehicleName: String,
  vehicleColor: String,
  parking: {
    type: Schema.Types.ObjectId,
    ref: 'Parking',
    require: true,
  },
  registrationDate: String,
  vehicleLicense: {
    frontLicense: {
      type: String,
      default: null,
    },
    backsideLicense: {
      type: String,
      default: null,
    },
    vehicleImage: {
      type: String,
      default: null,
    },
  },
  description: String,
  tariff: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['PROCESS', 'DONE', 'DECLINE', 'CANCEL'],
    default: 'PROCESS',
  },
  timeDone: String,
  timeDecline: String,
  reason: String,
  isDeleted: {
    type: Boolean,
    default: false,
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

vehicleCardSchema.virtual('frontLicensePath').get(function () {
  if (!this.vehicleLicense.frontLicense) { return `${process.env.IMAGE_URL}/image_default.jpg`; }
  // eslint-disable-next-line no-underscore-dangle
  return `${process.env.IMAGE_URL}/vehicleCard/${this._id}/${this.vehicleLicense.frontLicense}`;
});

vehicleCardSchema.virtual('backsideLicensePath').get(function () {
  if (!this.vehicleLicense.backsideLicense) { return `${process.env.IMAGE_URL}/image_default.jpg`; }
  // eslint-disable-next-line no-underscore-dangle
  return `${process.env.IMAGE_URL}/vehicleCard/${this._id}/${this.vehicleLicense.backsideLicense}`;
});

vehicleCardSchema.virtual('vehicleImagePath').get(function () {
  if (!this.vehicleLicense.vehicleImage) { return `${process.env.IMAGE_URL}/image_default.jpg`; }
  // eslint-disable-next-line no-underscore-dangle
  return `${process.env.IMAGE_URL}/vehicleCard/${this._id}/${this.vehicleLicense.vehicleImage}`;
});

vehicleCardSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});

vehicleCardSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  if (this._update.status === 'DONE') {
    this.set({ timeDone: new Date().valueOf() });
    this.set({ timeDecline: null });
  }
  if (this._update.status === 'DECLINE') {
    this.set({ timeDecline: new Date().valueOf() });
  }
  if (this._update.status === 'CANCEL') {
    this.set({ timeDone: null });
    this.set({ timeDecline: null });
  }
  next();
});
const VehicleCard = mongoose.model('VehicleCard', vehicleCardSchema);
module.exports = VehicleCard;
