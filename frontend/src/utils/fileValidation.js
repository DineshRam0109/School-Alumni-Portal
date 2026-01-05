export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5242880, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  } = options;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / 1048576}MB`
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
};

export const getFilePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};