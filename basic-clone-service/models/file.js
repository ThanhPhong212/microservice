const mongoose = require('mongoose');

const { Schema } = mongoose;

const fileSchema = new Schema({
  fileName: { type: String, unique: true },
});

module.exports = mongoose.model('File', fileSchema);
