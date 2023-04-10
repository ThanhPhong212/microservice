/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */
const mongoose = require('mongoose');
const Role = require('./role');

const { data } = require('../config/data');

const { Schema } = mongoose;

const userSchema = new Schema({
  idProject: [
    {
      type: Schema.Types.ObjectId,
      require: true,
    },
  ],
  fullName: {
    type: String,
    default: null,
  },
  avatar: {
    type: String,
  },
  birthday: String,
  gender: {
    type: String,
    enum: [0, 1, 2],
    default: 2,
  },
  status: {
    type: Boolean,
    default: true,
  },
  phone: {
    type: String,
    unique: true,
  },
  userName: {
    type: String,
  },
  password: {
    type: String,
  },
  email: {
    type: String,
    default: null,
  },
  country: {
    type: String,
    default: null,
  },
  typeIdCard: {
    type: String,
    enum: ['CARD', 'PASSPORT'],
  },
  numberIdentify: {
    type: String,
    default: null,
  },
  dateOfIssue: String,
  placeOfIssue: String,
  imageIdentify: {
    front: {
      type: String,
      default: null,
    },
    backside: {
      type: String,
      default: null,
    },
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  createdAt: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  updatedAt: String,
  updatedBy: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  toJSON: { getters: true },
});
userSchema.virtual('avatarPath').get(function () {
  if (this.avatar) {
    return `${process.env.AVATAR_URL}user/${this.id}/avatar/${this.avatar}`;
  }
  return `${process.env.AVATAR_URL}default.jpg`;
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
  if (!this.imageIdentify.front) { return null; }
  return `${process.env.AVATAR_URL}user/${this.id}/card/${this.imageIdentify.front}`;
});

userSchema.virtual('imgIdentifyBackPath').get(function () {
  if (!this.imageIdentify.backside) { return null; }
  return `${process.env.AVATAR_URL}user/${this.id}/card/${this.imageIdentify.backside}`;
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
  const listUserCreate = data.user.filter((item) => !listPhoneUser.includes(item.phone));
  if (listUserCreate.length > 0) {
    const roleId = await Role.find();
    const roleKey = roleId.reduce((acc, cur) => {
      const id = cur.value;
      return { ...acc, [id]: cur };
    }, {});
    listUserCreate.map((item) => {
      // eslint-disable-next-line no-param-reassign
      item.role = roleKey[item.role]._id;
      return item;
    });
    await User.insertMany(listUserCreate);
  }
}
initUser();
module.exports = User;
