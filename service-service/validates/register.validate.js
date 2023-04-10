const yup = require('yup');

exports.registerService = yup.object().shape({
  apartmentId: yup.string().required(),
  serviceId: yup.string().required(),
  adult: yup.number().integer('Số lượng người lớn không được là số thập phân!').min(0, 'Số lượng người lớn không được là số âm !').required(),
  child: yup.number().integer('Số lượng trẻ em không được là số thập phân!').min(0, 'Số lượng trẻ em không được là số âm !').required(),
});
