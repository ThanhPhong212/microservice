const validation = (schema) => async (req, res, next) => {
  try {
    const { body } = req;
    await schema.validate(body);
    return next();
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = validation;
