const yup = require('yup');

exports.createFeeValidate = yup.object().shape({
  projectId: yup.string().required(),
  feeTypeId: yup.string().required(),
  fileName: yup.string(),
});
