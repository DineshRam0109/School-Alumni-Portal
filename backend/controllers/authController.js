// authController.js - COMPLETE WORKING VERSION
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { createNotification } = require('./notificationController');
const { getCompleteFileUrl } = require('../utils/profilePictureUtils');
const { sendNewAlumniRegisteredEmail,sendPasswordResetEmail, } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (id, type = 'user') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, { expiresIn: '6h' });
};

// Format user response
const formatUserResponse = (req, user, isSchoolAdmin = false) => {
  const formattedUser = {
    ...user,
    profile_picture: user.profile_picture ? getCompleteFileUrl(req, user.profile_picture) : null
  };
  if (isSchoolAdmin) {
    formattedUser.role = 'school_admin';
    formattedUser.user_id = user.admin_id;
  }
  return formattedUser;
};

// Register
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, current_city, current_country, school_id, start_year, end_year, degree_level } = req.body;

    if (!first_name || !last_name || !email || !password || !current_city || !current_country) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    const [existingUsers] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const verification_token = crypto.randomBytes(32).toString('hex');

    const [result] = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone, current_city, current_country, verification_token, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'alumni')`,
      [first_name, last_name, email, password_hash, phone || null, current_city, current_country, verification_token]
    );

    const userId = result.insertId;

    if (school_id && start_year && end_year && degree_level) {
      await db.query(
        `INSERT INTO alumni_education (user_id, school_id, degree_level, start_year, end_year) VALUES (?, ?, ?, ?, ?)`,
        [userId, school_id, degree_level, start_year, end_year]
      );
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verification_token}`;
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - Alumni Portal',
        html: `<h2>Welcome!</h2><p>Hi ${first_name},</p><p>Please verify your email:</p><a href="${verificationUrl}">Verify Email</a>`
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    // ✅ ADDED: Notify school admin about new alumni registration
    if (school_id) {
      try {
        const [schoolAdmin] = await db.query(
          'SELECT sa.admin_id, sa.email, sa.first_name, sa.last_name, s.school_name FROM school_admins sa JOIN schools s ON sa.school_id = s.school_id WHERE sa.school_id = ? AND sa.is_active = TRUE LIMIT 1',
          [school_id]
        );

        if (schoolAdmin.length > 0) {
          await createNotification(
            schoolAdmin[0].admin_id,
            'verification_request',
            'New Alumni Verification Required',
            `${first_name} ${last_name} has registered and needs verification`,
            userId,
            'verification'
          );

          // ✅ SEND EMAIL using your separate function
          await sendNewAlumniRegisteredEmail(
            schoolAdmin[0].email,
            `${schoolAdmin[0].first_name} ${schoolAdmin[0].last_name}`,
            `${first_name} ${last_name}`,
            email,
            schoolAdmin[0].school_name
          );
                  }
      } catch (notifError) {
        console.error('Failed to send admin notification:', notifError);
      }
    }

    const [users] = await db.query(
      `SELECT user_id, email, first_name, last_name, role, profile_picture, phone, current_city, current_country, bio, is_verified, is_active, created_at FROM users WHERE user_id = ?`,
      [userId]
    );

    const user = formatUserResponse(req, users[0]);
    const token = generateToken(userId, 'user');

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful!', 
      token, 
      user, 
      expiresIn: '6h' 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: error.message 
    });
  }
};
// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const [users] = await db.query(
      `SELECT user_id, email, password_hash, first_name, last_name, role, profile_picture, phone, current_city, current_country, bio, is_verified, is_active, created_at FROM users WHERE email = ? AND role IN ('alumni', 'super_admin')`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    delete user.password_hash;
    const formattedUser = formatUserResponse(req, user);
    const token = generateToken(user.user_id, 'user');

    await db.query(
      `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description) VALUES (?, ?, 'login', 'User logged in')`,
      [user.user_id, user.role]
    );

    res.json({ success: true, message: 'Login successful', token, user: formattedUser, expiresIn: '6h' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// School Admin Login
const schoolAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const [admins] = await db.query(
      `SELECT admin_id, email, password_hash, first_name, last_name, profile_picture, phone, school_id, is_active, created_at FROM school_admins WHERE email = ?`,
      [email]
    );

    if (admins.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const admin = admins[0];

    if (!admin.is_active) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    delete admin.password_hash;
    const formattedAdmin = formatUserResponse(req, admin, true);
    const token = generateToken(admin.admin_id, 'school_admin');

    await db.query(
      `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description) VALUES (?, 'school_admin', 'login', 'School admin logged in')`,
      [admin.admin_id]
    );

    res.json({ success: true, message: 'Login successful', token, user: formattedAdmin, expiresIn: '6h' });
  } catch (error) {
    console.error('School admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const [users] = await db.query('SELECT user_id, first_name, last_name FROM users WHERE verification_token = ?', [token]);

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    const user = users[0];
    await db.query('UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE user_id = ?', [user.user_id]);

    try {
      const [education] = await db.query('SELECT school_id FROM alumni_education WHERE user_id = ?', [user.user_id]);

      if (education.length > 0) {
        const schoolIds = education.map(e => e.school_id);
        
        for (const schoolId of schoolIds) {
          const [schoolAdmin] = await db.query(
            'SELECT admin_id FROM school_admins WHERE school_id = ? AND is_active = TRUE LIMIT 1',
            [schoolId]
          );

          if (schoolAdmin.length > 0) {
            await createNotification(
              schoolAdmin[0].admin_id,
              'verification_request',
              'New Alumni Verification Required',
              `${user.first_name} ${user.last_name} has verified their email`,
              user.user_id,
              'verification'
            );
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to send verification notification:', notifError);
    }

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Email verification failed', error: error.message });
  }
};

// Forgot Password - ALUMNI
const forgotPassword = async (req, res) => {
    try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email address' 
      });
    }

    
    const [users] = await db.query(
      'SELECT user_id, first_name, last_name, email FROM users WHERE email = ?', 
      [email]
    );

    if (users.length === 0) {
            return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email' 
      });
    }

    const user = users[0];
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?',
      [resetToken, resetTokenExpiry, user.user_id]
    );

    
    // ✅ SEND PASSWORD RESET EMAIL
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
            
      await sendPasswordResetEmail(
        email,
        `${user.first_name} ${user.last_name}`,
        resetUrl
      );
      
          } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError);
      console.error('Email error details:', emailError.message);
      
      // Still return success to user (security best practice)
      // but log the error for debugging
    }

    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email' 
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process request', 
      error: error.message 
    });
  }
};


// School Admin Forgot Password
const schoolAdminForgotPassword = async (req, res) => {
    try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email address' 
      });
    }

    
    const [admins] = await db.query(
      'SELECT admin_id, first_name, last_name, email FROM school_admins WHERE email = ?', 
      [email]
    );

    if (admins.length === 0) {
            return res.status(404).json({ 
        success: false, 
        message: 'No school admin account found with this email' 
      });
    }

    const admin = admins[0];
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    
    await db.query(
      'UPDATE school_admins SET reset_token = ?, reset_token_expiry = ? WHERE admin_id = ?',
      [resetToken, resetTokenExpiry, admin.admin_id]
    );

    
    // ✅ SEND PASSWORD RESET EMAIL
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&type=school_admin`;
      
            
      await sendPasswordResetEmail(
        email,
        `${admin.first_name} ${admin.last_name}`,
        resetUrl
      );
      
          } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError);
      console.error('Email error details:', emailError.message);
      
      // Still return success to user (security best practice)
    }

    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email' 
    });
  } catch (error) {
    console.error('❌ School admin forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process request', 
      error: error.message 
    });
  }
};


// Reset Password
// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const userType = req.query.type || 'user';

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    let result, updateTable, idField, passwordField;

    if (userType === 'school_admin') {
      // Get admin with current password hash
      [result] = await db.query(
        'SELECT admin_id, password_hash FROM school_admins WHERE reset_token = ? AND reset_token_expiry > NOW()', 
        [token]
      );
      updateTable = 'school_admins';
      idField = 'admin_id';
      passwordField = 'password_hash';
    } else {
      // Get user with current password hash
      [result] = await db.query(
        'SELECT user_id, password_hash FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()', 
        [token]
      );
      updateTable = 'users';
      idField = 'user_id';
      passwordField = 'password_hash';
    }

    if (result.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    const userData = result[0];
    const currentPasswordHash = userData.password_hash;

    // ✅ CHECK: New password should be different from old password
    const isSamePassword = await bcrypt.compare(password, currentPasswordHash);
    
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be different from your current password' 
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await db.query(
      `UPDATE ${updateTable} SET ${passwordField} = ?, reset_token = NULL, reset_token_expiry = NULL WHERE ${idField} = ?`,
      [password_hash, userData[idField]]
    );

    // ✅ SEND PASSWORD CHANGED EMAIL
    try {
      const [userInfo] = await db.query(
        `SELECT first_name, last_name, email FROM ${updateTable} WHERE ${idField} = ?`,
        [userData[idField]]
      );

      if (userInfo.length > 0) {
        const { sendPasswordChangedEmail } = require('../utils/emailService');
        await sendPasswordChangedEmail(
          userInfo[0].email,
          `${userInfo[0].first_name} ${userInfo[0].last_name}`
        );
              }
    } catch (emailError) {
      console.error('❌ Failed to send password changed email:', emailError);
      // Don't fail the password reset if email fails
    }

    res.json({ 
      success: true, 
      message: 'Password reset successful. You can now login with your new password.' 
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

// Get Me
const getMe = async (req, res) => {
  try {
    if (req.user.role === 'school_admin') {
      const [admins] = await db.query(
        `SELECT admin_id, email, first_name, last_name, profile_picture, phone, school_id, is_active, created_at FROM school_admins WHERE admin_id = ?`,
        [req.user.user_id]
      );

      if (admins.length === 0) {
        return res.status(404).json({ success: false, message: 'School admin not found' });
      }

      return res.json({ success: true, user: formatUserResponse(req, admins[0], true) });
    }

    const [users] = await db.query(
      `SELECT user_id, email, first_name, last_name, role, profile_picture, phone, current_city, current_country, bio, is_verified, is_active, created_at FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: formatUserResponse(req, users[0]) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user data', error: error.message });
  }
};

// ✅ CRITICAL: Export all functions
module.exports = {
  register,
  login,
  schoolAdminLogin,
  verifyEmail,
  forgotPassword,
  schoolAdminForgotPassword,
  resetPassword,
  getMe
};