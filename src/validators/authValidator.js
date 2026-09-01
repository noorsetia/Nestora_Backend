const validateRegisterInput = (data) => {
  const errors = {};

  if (!data.firstName || !data.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!data.lastName || !data.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  if (!data.password) {
    errors.password = 'Password is required.';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  } else {
    // Password complexity check
    const hasUpper = /[A-Z]/.test(data.password);
    const hasLower = /[a-z]/.test(data.password);
    const hasNumber = /[0-9]/.test(data.password);

    if (!hasUpper || !hasLower || !hasNumber) {
      errors.password = 'Password must contain uppercase, lowercase, and a number.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const validateLoginInput = (data) => {
  const errors = {};

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  }

  if (!data.password) {
    errors.password = 'Password is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const validateForgotPasswordInput = (data) => {
  const errors = {};

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const validateResetPasswordInput = (data) => {
  const errors = {};

  if (!data.token) {
    errors.token = 'Reset token is required.';
  }

  if (!data.password) {
    errors.password = 'New password is required.';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
};
