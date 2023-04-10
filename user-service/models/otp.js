const mongoose = require('mongoose');

const { Schema } = mongoose;

const otpSchema = new Schema({
  phone: {
    type: String,
    unique: true,
  },
  otp: String,
  timeExpired: {
    type: Date,
    default: new Date(new Date().getTime() + 90 * 1000),
  },
});

const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp;
