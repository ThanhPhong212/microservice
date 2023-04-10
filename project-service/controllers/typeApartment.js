const TypeApartment = require('../models/typeApartment');
const Project = require('../models/project');
const Apartment = require('../models/apartment');

// eslint-disable-next-line consistent-return
exports.createTypeApartment = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const typeApartmentIns = req.body;
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    typeApartmentIns.updatedBy = userId;
    typeApartmentIns.idProject = projectId;

    typeApartmentIns.createdBy = userId;
    await TypeApartment.create(typeApartmentIns, async (err, result) => {
      if (err) {
        return res.status(400).send({
          success: false,
          error: err.message,
        });
      }
      project.typeApartment.push(result.id);
      await project.save();
      return res.status(200).send({
        success: true,
        data: result,
      });
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};

exports.updateTypeApartment = async (req, res) => {
  try {
    const userId = req.headers.userid;
    const typeApartmentIns = req.body;
    const { typeApartmentId, projectId } = req.params;

    // kiểm tra căn hộ trong block
    const apartmentInTypeApartment = await Apartment.findOne({ typeApartment: typeApartmentId });
    if (typeApartmentIns.isDeleted && apartmentInTypeApartment) {
      return res.status(400).send({
        success: false,
        error: 'Không thể xóa loại căn hộ này!',
      });
    }

    const project = await Project.findById(projectId);
    typeApartmentIns.updatedBy = userId;
    const data = await TypeApartment.findByIdAndUpdate(typeApartmentId, typeApartmentIns, { returnDocument: 'after' });
    if (typeApartmentIns.isDeleted) {
      const index = project.typeApartment.indexOf(typeApartmentId);
      if (index > -1) {
        project.typeApartment.splice(index, 1);
      }
    }
    await project.save();
    return res.status(200).send({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      error: error.message,
    });
  }
};
