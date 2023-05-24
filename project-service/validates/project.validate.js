const yup = require('yup');

const phoneRegExp = /^0[1-9]{1}[0-9]{8}$/;

exports.validateCreateProject = yup.object().shape({
  name: yup.string().required(),
  area: yup.number().required(),
  description: yup.string().nullable(true),
  hotline: yup.string().matches(phoneRegExp, 'Hotline không hợp lệ!').nullable(true),
  service: yup.number().nullable(true),
  basement: yup.number().nullable(true),
  province: yup.string().nullable(true),
  district: yup.string().nullable(true),
  ward: yup.string().nullable(true),
  address: yup.string().nullable(true),
});

exports.validateUpdateProject = yup.object().shape({
  name: yup.string().nullable(true),
  area: yup.number().nullable(true),
  description: yup.string().nullable(true),
  hotline: yup.string().matches(phoneRegExp, 'Hotline không hợp lệ!').nullable(true),
  service: yup.number().nullable(true),
  basement: yup.number().nullable(true),
  province: yup.string().nullable(true),
  district: yup.string().nullable(true),
  ward: yup.string().nullable(true),
  address: yup.string().nullable(true),
});

exports.validateCUDBlock = yup.object().shape({
  name: yup.string().required('Tên block không được để trống!'),
  numberApartment: yup.number().typeError('Số lượng phải là chữ số!').integer('Số lượng căn hộ không được là thập phân!').min(0, 'Số lượng căn hộ không được là số âm!'),
});
