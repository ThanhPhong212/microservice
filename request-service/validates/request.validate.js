const yup = require('yup');

exports.create = yup.object().shape({
  type: yup.string().required(),
  blockId: yup.string().nullable(true),
  descriptionFile: yup.string().min(10).nullable(true),
  status: yup.mixed().oneOf(['NEW', 'ACCEPT', 'COMPLETE', 'CANCEL']),
  otherContact: yup.string().nullable(true),
  evaluate: yup.object().shape({
    rate: yup.mixed().oneOf([1, 2, 3, 4, 5]),
    explain: yup.string().nullable(true),
  }),
  content: yup.string().nullable(true),
  staff: yup.string().nullable(true),
});
