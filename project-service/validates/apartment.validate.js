const yup = require('yup');

const phoneRegExp = /^0[1-9]{1}[0-9]{8}$/;

exports.validateCreateApartment = yup.object().shape({
  block: yup.string().required(),
  apartmentCode: yup.string().required(),
  typeApartment: yup.string().required(),
  areaApartment: yup.number().required(),
  owner: yup.string().required(),
  description: yup.string().nullable(true),
});

exports.validateUpdateApartment = yup.object().shape({
  block: yup.string(),
  apartmentCode: yup.string(),
  typeApartment: yup.string(),
  areaApartment: yup.number(),
  owner: yup.string(),
  relativeOwners: yup.array().of(
    yup.object().shape({
      name: yup.string().required(),
      phone: yup.string().matches(phoneRegExp, 'Phone number is not valid').required(),
    }),
  ),
  tenants: yup.array().of(
    yup.object().shape({
      name: yup.string().required(),
      phone: yup.string().matches(phoneRegExp, 'Phone number is not valid').required(),
    }),
  ),
  memberTenants: yup.array().of(
    yup.object().shape({
      name: yup.string().required(),
      phone: yup.string().matches(phoneRegExp, 'Phone number is not valid').required(),
    }),
  ),
  description: yup.string().nullable(true),
});

exports.CUDtypeApartment = yup.object().shape({
  name: yup.string().required('Tên loại căn hộ không được để trống!'),
  typeApartmentId: yup.string().nullable(true),
  quantity: yup.number().typeError('Số lượng phải là chữ số!').nullable(true),
  bedroom: yup.number().typeError('Số lượng phải là chữ số!').integer('Số lượng phòng ngủ không được là thập phân!').min(0, 'Số lượng phòng ngủ không được là số âm!')
    .nullable(true),
  kitchen: yup.number().typeError('Số lượng phải là chữ số!').integer('Số lượng nhà bếp không được là thập phân!').min(0, 'Số lượng nhà bếp không được là số âm!'),
  toilet: yup.number().typeError('Số lượng phải là chữ số!').integer('Số lượng nhà vệ sinh không được là thập phân!').min(0, 'Số lượng nhà vệ sinh không được là số âm!'),
  balcony: yup.number().typeError('Số lượng phải là chữ số!').integer('Số lượng ban công không được là số thập phân!').min(0, 'Số lượng ban công không được là số âm!'),
  isDeleted: yup.boolean().nullable(true),
});
