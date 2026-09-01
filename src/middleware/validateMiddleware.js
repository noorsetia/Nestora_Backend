const validate = (validatorFn) => {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req.body);
    if (!isValid) {
      const firstMessage = Object.values(errors)[0] || 'Invalid request payload';
      return res.status(400).json({
        success: false,
        message: firstMessage,
        errors,
      });
    }
    next();
  };
};

module.exports = validate;
