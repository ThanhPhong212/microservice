const yup = require('yup');

const phone = /^(03|05|07|08|09)+([0-9]{8})$/;
exports.create = yup.object().shape({
  name: yup.string().required('Họ tên không được để trống!'),
  phone: yup.string().required('Số điện thoại không được để trống!'),
  username: yup.string().required('Tên đăng nhập không được để trống!'),
  role: yup.string().required('Vai trò là bắt buộc!'),
  numberIdentify: yup.string().when('role', {
    is: (role) => role === 'CUSTOMER',
    then: yup.string().required('Số định danh cá nhân không được để trống!'),
    otherwise: yup.string().notRequired(),
  }),
});

exports.validateLogin = yup.object().shape({
  username: yup.string().required('Tên đăng nhập không được để trống!'),
  password: yup.string().required('Mật khẩu không được để trống!'),
});

exports.validateCreate = yup.object().shape({
  name: yup.string().required('Họ tên không được để trống!'),
  phone: yup.string()
    .matches(phone, 'Số điện thoại không hợp lệ!')
    .required('Số điện thoại là bắt buộc'),
  role: yup.string().required('Vai trò là bắt buộc!'),
  numberIdentify: yup.string().required('Số định danh cá nhân là bắt buộc!'),
});
