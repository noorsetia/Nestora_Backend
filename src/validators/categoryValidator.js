const validateCategoryPayload = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    if (!data.name || !data.name.trim()) errors.push('Category name is required');
  }

  if (data.name && typeof data.name !== 'string') {
    errors.push('Category name must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCategoryPayload,
};
