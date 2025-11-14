const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const emailService = require('../utils/emailService');

const generateToken = (id, type = 'user') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register Alumni (with MANDATORY location)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      current_city,
      current_country,
      school_id, 
      start_year, 
      end_year, 
      degree_level,
      field_of_study 
    } = req.body;

    // Validation - including location
    if (!email || !password || !first_name || !last_name || !current_city || !current_country || !school_id || !start_year || !end_year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: email, password, first_name, last_name, current_city, current_country, school_id, start_year, end_year'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email exists
    const [existingUsers] = await db.query(
      'SELECT user_id FROM users WHERE email = ?', 
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please login or use a different email.'
      });
    }

    // Check school exists
    const [schools] = await db.query(
      'SELECT school_id, school_name FROM schools WHERE school_id = ? AND is_active = TRUE',
      [school_id]
    );

    if (!schools.length) {
      return res.status(404).json({
        success: false,
        message: 'School not found or inactive'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Insert user with MANDATORY location - SET is_verified to TRUE by default
    const [userResult] = await db.query(
      `INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        phone, 
        current_city,
        current_country,
        role, 
        verification_token,
        is_verified,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'alumni', ?, TRUE, TRUE)`,
      [email, hashedPassword, first_name, last_name, phone || null, current_city, current_country, verificationToken]
    );

    const userId = userResult.insertId;

    // Insert education (needs verification)
    await db.query(
      `INSERT INTO alumni_education (
        user_id, 
        school_id, 
        start_year, 
        end_year, 
        degree_level,
        field_of_study,
        is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [userId, school_id, start_year, end_year, degree_level || 'secondary', field_of_study || null]
    );

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    try {
      await emailService.sendVerificationEmail(email, first_name, verificationUrl);
    } catch (emailError) {
      console.error('Email send failed:', emailError);
    }

    // CRITICAL: Generate token IMMEDIATELY
    const token = generateToken(userId, 'user');

    // Log activity
    try {
      await db.query(
        `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description, ip_address) 
         VALUES (?, 'alumni', 'register', 'User registered', ?)`,
        [userId, req.ip || 'unknown']
      );
    } catch (logError) {
      console.error('Activity log failed:', logError);
    }

    // CRITICAL: Return complete user object with token
    res.status(201).json({
      success: true,
      message: 'Registration successful! Your education record is pending verification by your school administrator.',
      token, // MUST be included
      user: {
        user_id: userId,
        email,
        first_name,
        last_name,
        role: 'alumni',
        is_verified: true, // Set to true for immediate access
        school_name: schools[0].school_name,
        education_verified: false,
        current_city,
        current_country
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Keep all other exports the same...
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const [users] = await db.query(
      `SELECT 
        u.user_id, 
        u.email, 
        u.password_hash, 
        u.role, 
        u.first_name, 
        u.last_name, 
        u.is_verified, 
        u.is_active, 
        u.profile_picture,
        u.current_city,
        u.current_country,
        (SELECT COUNT(*) FROM alumni_education WHERE user_id = u.user_id AND is_verified = TRUE) as verified_education_count,
        (SELECT COUNT(*) FROM alumni_education WHERE user_id = u.user_id) as total_education_count
       FROM users u 
       WHERE u.email = ?`,
      [email]
    );

    if (!users.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user.user_id, 'user');

    try {
      await db.query(
        `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description, ip_address) 
         VALUES (?, ?, 'login', 'User logged in', ?)`,
        [user.user_id, user.role, req.ip || 'unknown']
      );
    } catch (logError) {
      console.error('Activity log failed:', logError);
    }

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_verified: user.is_verified,
        education_verified: user.verified_education_count > 0,
        has_unverified_education: user.total_education_count > user.verified_education_count,
        profile_picture: user.profile_picture,
        current_city: user.current_city,
        current_country: user.current_country
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

exports.schoolAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const [admins] = await db.query(
      `SELECT 
        sa.admin_id, 
        sa.email, 
        sa.password_hash, 
        sa.first_name, 
        sa.last_name, 
        sa.phone,
        sa.profile_picture,
        sa.is_active,
        sa.school_id,
        s.school_name,
        s.city,
        s.state
       FROM school_admins sa
       JOIN schools s ON sa.school_id = s.school_id
       WHERE sa.email = ?`,
      [email]
    );

    if (!admins.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const admin = admins[0];

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact super admin.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(admin.admin_id, 'school_admin');

    try {
      await db.query(
        `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description, ip_address) 
         VALUES (?, 'school_admin', 'login', 'School admin logged in', ?)`,
        [admin.admin_id, req.ip || 'unknown']
      );
    } catch (logError) {
      console.error('Activity log failed:', logError);
    }

    res.json({
      success: true,
      token,
      user: {
        admin_id: admin.admin_id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: 'school_admin',
        school_id: admin.school_id,
        school_name: admin.school_name,
        profile_picture: admin.profile_picture
      }
    });
  } catch (error) {
    console.error('School admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Export remaining functions...
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const [users] = await db.query(
      'SELECT user_id, email, first_name FROM users WHERE verification_token = ?',
      [token]
    );

    if (!users.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    await db.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE user_id = ?',
      [users[0].user_id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await db.query(
      'SELECT user_id, first_name FROM users WHERE email = ?',
      [email]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?',
      [resetToken, resetTokenExpiry, users[0].user_id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    try {
      await emailService.sendPasswordResetEmail(email, users[0].first_name, resetUrl);
    } catch (emailError) {
      console.error('Password reset email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};

exports.schoolAdminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const [admins] = await db.query(
      'SELECT admin_id, first_name FROM school_admins WHERE email = ?',
      [email]
    );

    if (!admins.length) {
      return res.status(404).json({
        success: false,
        message: 'No school admin account found with this email'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await db.query(
      'UPDATE school_admins SET reset_token = ?, reset_token_expiry = ? WHERE admin_id = ?',
      [resetToken, resetTokenExpiry, admins[0].admin_id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/school-admin/reset-password?token=${resetToken}`;
    
    try {
      await emailService.sendPasswordResetEmail(email, admins[0].first_name, resetUrl);
    } catch (emailError) {
      console.error('Password reset email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('School admin forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const [users] = await db.query(
      'SELECT user_id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (!users.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = ?',
      [hashedPassword, users[0].user_id]
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (req.user.type === 'school_admin') {
      const [admins] = await db.query(
        `SELECT 
          sa.admin_id, 
          sa.email, 
          sa.first_name, 
          sa.last_name, 
          sa.phone,
          sa.profile_picture,
          sa.school_id,
          s.school_name,
          s.city,
          s.state
         FROM school_admins sa
         JOIN schools s ON sa.school_id = s.school_id
         WHERE sa.admin_id = ?`,
        [req.user.user_id]
      );

      return res.json({
        success: true,
        user: {
          ...admins[0],
          role: 'school_admin'
        }
      });
    }

    const [users] = await db.query(
      `SELECT 
        u.user_id, 
        u.email, 
        u.role, 
        u.first_name, 
        u.last_name, 
        u.phone, 
        u.profile_picture, 
        u.date_of_birth, 
        u.gender, 
        u.current_city, 
        u.current_country, 
        u.bio, 
        u.linkedin_url, 
        u.is_verified, 
        u.created_at,
        (SELECT COUNT(*) FROM alumni_education WHERE user_id = u.user_id AND is_verified = TRUE) as verified_education_count,
        (SELECT COUNT(*) FROM alumni_education WHERE user_id = u.user_id) as total_education_count
       FROM users u
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    const userData = users[0];
    userData.education_verified = userData.verified_education_count > 0;
    userData.has_unverified_education = userData.total_education_count > userData.verified_education_count;

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
      error: error.message
    });
  }
};