const yup = require('yup');

exports.createLibraryValidate = yup.object().shape({
  name: yup.string().required(),
  file: yup.string().nullable(true),
  description: yup.string().nullable(true),
  projectId: yup.string().required(),
});

exports.editLibraryValidate = yup.object().shape({
  name: yup.string().required(),
  file: yup.string().nullable(true),
  description: yup.string().nullable(true),
});
