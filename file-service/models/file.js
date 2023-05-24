const mongoose = require('mongoose');

const { Schema } = mongoose;

const fileSchema = new Schema({
  fileName: { type: String, unique: true },
  userId: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  type: {
    type: String,
    enum: ['AVATAR', 'CARD', 'PROJECT', 'NOTIFY', 'SERVICE', 'REQUEST', 'CKEDITOR', 'LIBRARY', 'DEVICE', 'RESIDENTIAL_CARD'],
  },
});

module.exports = mongoose.model('File', fileSchema);
