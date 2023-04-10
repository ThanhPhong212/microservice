const mongoose = require('mongoose');

const { Schema } = mongoose;

const typeNotifySchema = new Schema({
  name: {
    type: String,
    require: true,
  },
});

const TypeNotify = mongoose.model('TypeNotify', typeNotifySchema);
module.exports = TypeNotify;
