const validateProductPayload = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    if (!data.name || !data.name.trim()) errors.push('Product name is required');
    if (!data.category || !data.category.trim()) errors.push('Product category is required');
    if (data.price === undefined || data.price === null) errors.push('Product price is required');
    if (!data.image || !data.image.trim()) errors.push('Primary product image URL is required');
  }

  if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
    errors.push('Price must be a non-negative number');
  }

  if (data.originalPrice !== undefined && data.originalPrice !== null && (typeof data.originalPrice !== 'number' || data.originalPrice < 0)) {
    errors.push('Original price must be a non-negative number');
  }

  if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) {
    errors.push('Stock count must be a non-negative integer');
  }

  if (data.lowStockThreshold !== undefined && (typeof data.lowStockThreshold !== 'number' || data.lowStockThreshold < 0)) {
    errors.push('Low stock threshold must be a non-negative integer');
  }

  if (data.discountPercentage !== undefined && (typeof data.discountPercentage !== 'number' || data.discountPercentage < 0 || data.discountPercentage > 100)) {
    errors.push('Discount percentage must be between 0 and 100');
  }

  if (data.sku && typeof data.sku !== 'string') {
    errors.push('SKU must be a valid string');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateProductPayload,
};
