// BACKEND VERSION - For Node.js/Express server
const path = require('path');
const fs = require('fs');

/**
 * Get avatar URL for backend responses with proper HTTPS handling
 * @param {string} profilePicture - Profile picture path from database
 * @param {string} baseUrl - Base URL of the API
 * @returns {string} Full URL or null
 */
function getAvatarUrl(profilePicture, baseUrl) {
  // If no profile picture, return null
  if (!profilePicture || typeof profilePicture !== 'string') {
    return null;
  }
  
  // Get the base URL with HTTPS enforcement
  const finalBaseUrl = getSecureBaseUrl(baseUrl);
  
  // If it's already a full URL, ensure it's HTTPS
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture.replace(/^http:/, 'https:');
  }
  
  // Clean the path
  const cleanPath = profilePicture.replace(/\\/g, '/').replace(/^\/+/, '');
  
  // Return full URL with HTTPS
  if (cleanPath.startsWith('uploads/')) {
    return `${finalBaseUrl}/${cleanPath}`;
  }
  
  return `${finalBaseUrl}/uploads/${cleanPath}`;
}

/**
 * Get secure base URL with HTTPS in production
 */
function getSecureBaseUrl(baseUrl) {
  const url = baseUrl || process.env.API_URL || 'http://localhost:5000';
  
  // Always use HTTPS in production (Vercel)
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return url.replace(/^http:/, 'https:');
  }
  
  return url;
}

/**
 * Format file path for database storage
 */
function formatPathForDatabase(filePath) {
  if (!filePath) return '';
  
  // Remove any base URL
  const urlPattern = /https?:\/\/[^\/]+\//;
  let cleaned = filePath.replace(urlPattern, '');
  
  // Remove leading uploads/ if present
  cleaned = cleaned.replace(/^uploads\//, '');
  
  // Normalize slashes
  cleaned = cleaned.replace(/\\/g, '/');
  
  // Remove leading slashes
  cleaned = cleaned.replace(/^\/+/, '');
  
  return cleaned;
}

/**
 * Get complete file URL with request object
 */
function getCompleteFileUrl(req, filePath) {
  if (!filePath) return null;
  
  // If already a full URL, ensure HTTPS
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath.replace(/^http:/, 'https:');
  }
  
  // Clean the path
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  
  // Ensure it starts with uploads/
  const finalPath = cleanPath.startsWith('uploads/') 
    ? cleanPath 
    : `uploads/${cleanPath}`;
  
  // Always use HTTPS in production
  const protocol = (process.env.NODE_ENV === 'production' || process.env.VERCEL) 
    ? 'https' 
    : req.protocol;
  
  const baseUrl = `${protocol}://${req.get('host')}`;
  return `${baseUrl}/${finalPath}`;
}

/**
 * Generate initials avatar URL
 */
function getInitialsAvatar(firstName, lastName, size = 128) {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  if (!name) return null;
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=${size}`;
}

/**
 * Validate if file is an image
 */
function isValidImage(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.mimetype);
}

/**
 * Get file extension from mimetype
 */
function getFileExtension(mimetype) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  
  return extensions[mimetype] || 'jpg';
}

module.exports = {
  getAvatarUrl,
  formatPathForDatabase,
  getCompleteFileUrl,
  getInitialsAvatar,
  isValidImage,
  getFileExtension,
  getSecureBaseUrl
};