const mongoose = require('mongoose');

const { Schema } = mongoose;

const revenueSchema = new Schema({
  projectId: String,
  value: Number,
  month: String,
}, {
  toJSON: { getters: true },
  id: false,
});
module.exports = mongoose.model('Revenue', revenueSchema);
