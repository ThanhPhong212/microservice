const mongoose = require('mongoose');

const { Schema } = mongoose;

const deviceToken = new Schema({
  oneSignalId: { type: String, require: true },
  deviceToken: { type: String, require: true },
  deviceModel: { type: String, require: false },
  platform: { type: String, require: false },
  appVersion: { type: String, require: false },
  userId: { type: Schema.Types.ObjectId, require: false },
});
mongoose.set('useFindAndModify', false);

module.exports = mongoose.model('DeviceToken', deviceToken);
