const mongoose = require('mongoose');

const { Schema } = mongoose;

const registerCheckSchema = new Schema({
  registerDate: String,
  slotId: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    require: true,
  },
  data: {
    type: Schema.Types.Mixed,
    default: {},
  },

}, {
  toJSON: { getters: true },
});

const RegisterCheck = mongoose.model('RegisterCheck', registerCheckSchema);
module.exports = RegisterCheck;
