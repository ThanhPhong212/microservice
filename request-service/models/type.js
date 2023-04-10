const mongoose = require('mongoose');

const { Schema } = mongoose;

const { data } = require('../config/data');

const typeSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  assign: [{
    projectId: Schema.Types.ObjectId,
    staff: Schema.Types.ObjectId,
  }],
  text: {
    type: String,
    default: null,
  },
});

const Type = mongoose.model('Type', typeSchema);
async function initType() {
  const type = await Type.findOne({});
  if (!type) {
    await Type.insertMany(data.type);
  }
}
initType();
module.exports = Type;
