const yup = require('yup');

exports.createFeeConfigValidate = yup.object().shape({
  name: yup.string().required(),
  projectId: yup.string().required(),
  description: yup.string().nullable(true),
  feeTypeId: yup.string().required(),
  level: yup.array().of(
    yup.object().shape({
      name: yup.string().nullable(true),
      from: yup.number().nullable(true),
      to: yup.number().nullable(true),
      price: yup.number().nullable(true),
    }),
  ),
  surcharge: yup.array().of(
    yup.object().shape({
      name: yup.string().nullable(true),
      price: yup.number().nullable(true),
    }),
  ),
  vehicle: yup.mixed().oneOf([null, 'CAR', 'MOTOR'], 'Vehicle is not valid'),
});

exports.updateFeeConfigValidate = yup.object().shape({
  name: yup.string().required(),
  projectId: yup.string().required(),
  description: yup.string().nullable(true),
  feeTypeId: yup.string().required(),
  level: yup.array().of(
    yup.object().shape({
      name: yup.string().nullable(true),
      from: yup.number().nullable(true),
      to: yup.number().nullable(true),
      price: yup.number().nullable(true),
    }),
  ),
  surcharge: yup.array().of(
    yup.object().shape({
      name: yup.string().nullable(true),
      price: yup.number().nullable(true),
    }),
  ),
  vehicle: yup.mixed().oneOf([null, 'CAR', 'MOTOR'], 'Vehicle is not valid'),
});
