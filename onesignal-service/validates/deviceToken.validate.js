const yup = require('yup');

exports.create = yup.object().shape({
  oneSignalId: yup.string().required(),
  deviceToken: yup.string().required(),
});

exports.createDevice = yup.object().shape({
  playerId: yup.string().required(),
});
