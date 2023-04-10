const mongoose = require('mongoose');

const { Schema } = mongoose;

const authenticateSchema = new Schema({
  value: {
    type: String,
    default: null,
  },
  device: {
    type: String,
    default: null,
  },
  userId: {
    type: Schema.Types.ObjectId,
    default: null,
    unique: true,
  },
});

const Auth = mongoose.model('Authenticate', authenticateSchema);
module.exports = Auth;
