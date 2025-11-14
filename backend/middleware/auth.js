const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token (works for both users and school admins)
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if school admin or regular user
    if (decoded.type === 'school_admin') {
      const [admins] = await db.query(
        'SELECT admin_id, email, first_name, last_name, school_id, is_active FROM school_admins WHERE admin_id = ?',
        [decoded.id]
      );

      if (!admins.length) {
        return res.status(401).json({
          success: false,
          message: 'School admin not found'
        });
      }

      if (!admins[0].is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated'
        });
      }

      req.user = {
        user_id: admins[0].admin_id,
        email: admins[0].email,
        first_name: admins[0].first_name,
        last_name: admins[0].last_name,
        role: 'school_admin',
        school_id: admins[0].school_id,
        type: 'school_admin'
      };
    } else {
      // Regular user (alumni or super_admin)
      const [users] = await db.query(
        'SELECT user_id, email, role, first_name, last_name, is_verified, is_active FROM users WHERE user_id = ?',
        [decoded.id]
      );

      if (!users.length) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!users[0].is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated'
        });
      }

      req.user = {
        ...users[0],
        type: 'user'
      };
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Role-based authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is verified
exports.checkVerified = (req, res, next) => {
  if (req.user.role === 'school_admin') {
    // School admins don't need email verification
    return next();
  }

  if (!req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email to access this feature'
    });
  }
  next();
};

// School admin middleware - checks if user has access to specific school
exports.checkSchoolAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
      // Super admin has access to all schools
      return next();
    }

    if (req.user.role !== 'school_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only school admins can access this resource'
      });
    }

    // Get school_id from params or body
    const schoolId = req.params.schoolId || req.body.school_id || req.query.school_id;

    if (schoolId && parseInt(schoolId) !== parseInt(req.user.school_id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this school'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check school access'
    });
  }
};