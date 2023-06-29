const mongoose = require('mongoose');

const { Schema } = mongoose;

const demoSchema = new Schema({
  email: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('Demo', demoSchema);
