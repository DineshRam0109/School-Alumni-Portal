const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create all required upload directories
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/profiles',
    'uploads/messages',
    'uploads/groups',
    'uploads/group-messages',
    'uploads/documents',
    'uploads/events',
    'uploads/resumes'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Storage configurations
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/messages/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `msg-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const groupAvatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/groups/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `group-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const groupMessageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/group-messages/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `grp-msg-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/events/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `event-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const userId = req.user ? req.user.user_id : 'unknown';
    cb(null, `resume-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filters
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, gif, webp)'), false);
  }
};

const resumeFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed for resumes'), false);
  }
};

const attachmentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
    // Video
    'video/mp4', 'video/mpeg', 'video/webm', 'video/avi', 'video/quicktime'
  ];
  
  // Additional extension check for safety
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    '.mp3', '.wav', '.ogg', '.aac',
    '.mp4', '.mpeg', '.webm', '.avi', '.mov'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Create multer instances with consistent configuration
const uploadProfilePicture = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter
});

const uploadGroupAvatar = multer({
  storage: groupAvatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter
});

const uploadEventImage = multer({
  storage: eventStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter
});

const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: resumeFileFilter
});

const uploadMessageAttachments = multer({
  storage: messageStorage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: attachmentFileFilter
});

const uploadGroupMessageAttachments = multer({
  storage: groupMessageStorage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: attachmentFileFilter
});

// Enhanced error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 10MB';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 5 files per upload';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name or too many files';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many form parts';
        break;
      default:
        message = err.message;
    }
    
    return res.status(400).json({
      success: false,
      message
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  
  next();
};

// Utility function to delete files
const deleteFile = (filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error deleting file:', err);
    }
  });
};

// Utility function to get file URL
const getFileUrl = (req, filePath) => {
  if (!filePath) return null;
  return `${req.protocol}://${req.get('host')}/${filePath}`;
};

module.exports = {
  // Multer upload instances
  uploadProfilePicture,
  uploadMessageAttachments,
  uploadGroupAvatar,
  uploadGroupMessageAttachments,
  uploadEventImage,
  uploadResume,
  
  // Middleware
  handleMulterError,
  
  // Utility functions
  deleteFile,
  getFileUrl
};