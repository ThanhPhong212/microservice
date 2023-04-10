const yup = require('yup');

const phoneRegExp = /^0[1-9]{1}[0-9]{8}$/;

exports.create = yup.object().shape({
  email: yup.string().email().nullable(true),
  password: yup.string().min(8).nullable(true),
  fullName: yup.string().required(),
  gender: yup.mixed().oneOf([0, 1, 2]),
  typeIdCard: yup.mixed().oneOf(['CARD', 'PASSPORT']),
  country: yup.string().nullable(true),
  numberIdentify: yup.string().nullable(true),
  dateOfIssue: yup.string().nullable(true),
  avatar: yup.string().min(8, 'avatar is not valid').nullable(true),
  imageFront: yup.string().min(8, 'imageFront is not valid').nullable(true),
  imageBackside: yup.string().min(8, 'imageBackside is not valid').nullable(true),
  birthday: yup.string().nullable(true),
  phone: yup.string().matches(phoneRegExp, 'Phone number is not valid').required(),
  role: yup.mixed().oneOf(['EXECUTE', 'CUSTOMER'], 'Role is not valid').required(),
});

exports.update = yup.object().shape({
  email: yup.string().email().nullable(true),
  password: yup.string().min(8).nullable(true),
  fullName: yup.string(),
  gender: yup.mixed().oneOf([0, 1, 2]),
  typeIdCard: yup.mixed().oneOf(['CARD', 'PASSPORT']),
  country: yup.string().nullable(true),
  numberIdentify: yup.string().nullable(true),
  dateOfIssue: yup.string().nullable(true),
  avatar: yup.string().min(8, 'avatar is not valid').nullable(true),
  imageFront: yup.string().min(8, 'imageFront is not valid').nullable(true),
  imageBackside: yup.string().min(8, 'imageBackside is not valid').nullable(true),
  birthday: yup.string().nullable(true),
  status: yup.boolean(),
  role: yup.mixed().oneOf(['EXECUTE', 'CUSTOMER'], 'Role is not valid'),
  isDeleted: yup.boolean(),
});
