
// ✅ Get the base URL without /api for static files
const getBaseUrl = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  // Remove /api from the end if it exists
  return apiUrl.replace(/\/api\/?$/, '');
};

const BASE_URL = getBaseUrl();

/**
 * Get avatar URL for frontend display
 * @param {Object|string} userOrPath - User object or profile picture path
 * @param {string} firstName - Optional first name
 * @param {string} lastName - Optional last name
 * @returns {string} Full URL to the avatar image
 */
export const getAvatarUrl = (userOrPath, firstName, lastName) => {
    
  let profilePicture, fName, lName;
  
  // Handle both object parameter and separate parameters
  if (typeof userOrPath === 'object' && userOrPath !== null) {
    profilePicture = userOrPath.profile_picture;
    fName = userOrPath.first_name || firstName;
    lName = userOrPath.last_name || lastName;
  } else {
    profilePicture = userOrPath;
    fName = firstName;
    lName = lastName;
  }
  
      
  // If profile picture exists
  if (profilePicture && typeof profilePicture === 'string' && profilePicture.trim()) {
    // Already a full URL
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
            return profilePicture;
    }
    
    // Relative path starting with uploads/
    if (profilePicture.startsWith('uploads/')) {
      const url = `${BASE_URL}/${profilePicture}`;
            return url;
    }
    
    // Just filename (e.g., "profiles/profile-123.jpg")
    const url = `${BASE_URL}/uploads/${profilePicture}`;
        return url;
  }
  
  // Fallback to initials avatar
  if (fName || lName) {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(fName || '')}+${encodeURIComponent(lName || '')}&background=random&size=128`;
        return fallback;
  }
  
  // Default avatar
  const defaultUrl = `https://ui-avatars.com/api/?name=User&background=random&size=128`;
    return defaultUrl;
};

/**
 * Handle image loading errors with fallback
 */
export const handleImageError = (e, firstName, lastName) => {
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || 'User')}+${encodeURIComponent(lastName || 'Name')}&background=random&size=128`;
  
  if (e.target.src !== fallbackUrl) {
        e.target.src = fallbackUrl;
  }
  e.target.onerror = null;
};

/**
 * Get file URL for frontend
 */
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  
  // Handle full URLs
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Clean path
  const cleanPath = filePath.replace(/^\/+/, '');
  
  if (cleanPath.startsWith('uploads/')) {
    return `${BASE_URL}/${cleanPath}`;
  }
  
  return `${BASE_URL}/uploads/${cleanPath}`;
};

// Export for frontend components
export default {
  getAvatarUrl,
  handleImageError,
  getFileUrl
};