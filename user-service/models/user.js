/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */
const mongoose = require('mongoose');
const Role = require('./role');

const { data } = require('../config/data');

const { Schema } = mongoose;

const userSchema = new Schema({
  name: String,
  avatar: { type: String, default: null },
  birthday: { type: String, default: null },
  gender: {
    type: String,
    enum: [0, 1, 2],
    default: 2,
  },
  status: { type: Boolean, default: true },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  username: { type: String, require: true },
  password: {
    type: String,
    require: true,
    default: '$2a$10$zLUFqOmzkY2O/Pth1HlmwO12JcsYIncjRTYQgTAyPRbc/Sc4Bxg26',
  },
  numberIdentify: String,
  dateOfIssue: { type: String, default: null },
  placeOfIssue: String,
  country: String,
  typeIdCard: {
    type: String,
    enum: ['CARD', 'PASSPORT'],
  },
  imageIdentify: {
    front: { type: String, default: null },
    backside: { type: String, default: null },
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  projects: [{ type: String }],
  isDeleted: { type: Boolean, default: false },

  // cashback
  refundRatePartner: { type: Number, default: 0 },
  refundMaxPartner: { type: Number, default: 0 },
  refundRateCustomer: { type: Number, default: 0 },
  refundMaxCustomer: { type: Number, default: 0 },
  address: String,
  website: String,
  category: [{ type: String }],
  APIKey: String,
  availableBalance: Number,
  roofie: Number,

  createdAt: { type: String, default: null },
  updatedAt: { type: String, default: null },
  createdBy: { type: Schema.Types.ObjectId, default: null },
  updatedBy: { type: Schema.Types.ObjectId, default: null },

}, {
  toJSON: { getters: true, id: false },
});
userSchema.virtual('avatarPath').get(function () {
  if (this.avatar) {
    return `${process.env.IMAGE_URL}/user/${this.id}/avatar/${this.avatar}`;
  }
  return `${process.env.IMAGE_URL}/avatar_default.jpg`;
});

userSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.set({ createdAt: new Date().valueOf() });
  }
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
userSchema.pre(['updateOne', 'findOneAndUpdate', 'updateOne'], function (next) {
  this.set({ updatedAt: new Date().valueOf() });
  next();
});
userSchema.virtual('imgIdentifyFrontPath').get(function () {
  if (!this.imageIdentify.front) { return `${process.env.IMAGE_URL}/image_default.jpg`; }
  return `${process.env.IMAGE_URL}/user/${this.id}/card/${this.imageIdentify.front}`;
});

userSchema.virtual('imgIdentifyBackPath').get(function () {
  if (!this.imageIdentify.backside) { return `${process.env.IMAGE_URL}/image_default.jpg`; }
  return `${process.env.IMAGE_URL}/user/${this.id}/card/${this.imageIdentify.backside}`;
});

const User = mongoose.model('User', userSchema);
async function initUser() {
  // create role
  const role = await Role.find();
  const listValueRole = Array.from(role, ({ value }) => value);
  const listRoleCreate = data.role.filter((item) => !listValueRole.includes(item.value));
  if (listRoleCreate.length > 0) {
    await Role.insertMany(listRoleCreate);
  }

  // create user
  const user = await User.find();
  const listPhoneUser = Array.from(user, ({ phone }) => phone);
  const listUseName = Array.from(user, ({ username }) => username);
  const listNumberIdentifyUser = Array.from(user, ({ numberIdentify }) => numberIdentify);
  const listUserCreate = data.user.filter((item) => !listPhoneUser.includes(item.phone) && !listUseName.includes(item.username) && !listNumberIdentifyUser.includes(item.numberIdentify));
  if (listUserCreate.length > 0) {
    const roleId = await Role.find();
    const roleKey = roleId.reduce((acc, cur) => {
      const id = cur.value;
      return { ...acc, [id]: cur };
    }, {});
    listUserCreate.map((item) => {
      const element = item;
      element.role = roleKey[element.role]._id;
      return element;
    });
    await User.insertMany(listUserCreate);
  }
}
initUser();
module.exports = User;
