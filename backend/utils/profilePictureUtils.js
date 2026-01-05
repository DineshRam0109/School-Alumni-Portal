// BACKEND VERSION - For Node.js/Express server
const path = require('path');
const fs = require('fs');

/**
 * Get avatar URL for backend responses
 * @param {string} profilePicture - Profile picture path from database
 * @param {string} baseUrl - Base URL of the API (e.g., http://localhost:5000)
 * @returns {string} Full URL or relative path
 */
function getAvatarUrl(profilePicture, baseUrl = process.env.API_URL || 'http://localhost:5000') {
  // If no profile picture, return null (let frontend handle the fallback)
  if (!profilePicture || typeof profilePicture !== 'string') {
    return null;  // Changed from returning default-avatar.png
  }
  
  // If it's already a full URL, return as-is
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture;
  }
  
  // Clean the path
  const cleanPath = profilePicture.replace(/\\/g, '/').replace(/^\/+/, '');
  
  // Return full URL
  if (cleanPath.startsWith('uploads/')) {
    return `${baseUrl}/${cleanPath}`;
  }
  
  return `${baseUrl}/uploads/${cleanPath}`;
}

/**
 * Format file path for database storage
 * Removes the base uploads/ path and normalizes slashes
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
  
  // If already a full URL, return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Clean the path
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  
  // Ensure it starts with uploads/
  const finalPath = cleanPath.startsWith('uploads/') 
    ? cleanPath 
    : `uploads/${cleanPath}`;
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${finalPath}`;
}

/**
 * Generate initials avatar URL (for use when no profile picture)
 */
function getInitialsAvatar(firstName, lastName, size = 128) {
  const name = `${firstName || ''} ${lastName || ''}`.trim();
  if (!name) return null;
  
  // You can use a service or generate locally
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

// Export all functions
module.exports = {
  getAvatarUrl,
  formatPathForDatabase,
  getCompleteFileUrl,
  getInitialsAvatar,
  isValidImage,
  getFileExtension
};