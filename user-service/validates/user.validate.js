const yup = require('yup');

exports.create = yup.object().shape({
  name: yup.string().required('Họ tên không được để trống!'),
  phone: yup.string().required('Số điện thoại không được để trống!'),
  username: yup.string().required('Tên đăng nhập không được để trống!'),
  role: yup.string().required('Vai trò là bắt buộc!'),
  numberIdentify: yup.string().when('role', {
    // Nếu role khác partner thì numberIdentify bắt buộc
    is: (role) => role !== 'PARTNER',
    then: yup.string().required('Số định danh cá nhân không được để trống!'),
    // Nếu không thì numberIdentify không bắt buộc
    otherwise: yup.string().notRequired(),
  }),
});
