const mongoose = require('mongoose');

const { Schema } = mongoose;

const roleSchema = new Schema({
  value: String,
  text: String,
  active: {
    type: Boolean,
  },
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
