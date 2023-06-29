const mongoose = require('mongoose');

const { Schema } = mongoose;

const device = new Schema({
  deviceId: { type: String, require: false }, // HOUSE_ROOF CASHBACK
  playerId: { type: String, require: false },
  userId: { type: String, require: false },
  type: {
    type: String,
    enum: ['WEB', 'APP'],
  },
});
mongoose.set('useFindAndModify', false);

module.exports = mongoose.model('Device', device);
