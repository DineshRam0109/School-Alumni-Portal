const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { sendPasswordChangedEmail } = require('../utils/emailService');
const { getFileUrl, formatPathForDatabase, getCompleteFileUrl } = require('../utils/profilePictureUtils');

const formatUserResponse = (req, user, isSchoolAdmin = false) => {
  const formattedUser = {
    ...user,
    profile_picture: user.profile_picture 
      ? getCompleteFileUrl(req, user.profile_picture)
      : null
  };
  
  if (isSchoolAdmin) {
    formattedUser.role = 'school_admin';
    formattedUser.user_id = user.admin_id;
  }
  
  return formattedUser;
};

// @desc    Get user by ID with complete profile data
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // First, try to get from users table (alumni/super_admin)
    const [users] = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone, 
              u.profile_picture, u.date_of_birth, u.gender, u.current_city, 
              u.current_country, u.bio, u.linkedin_url, u.facebook_url, 
              u.twitter_url, u.is_verified, u.role, u.created_at
       FROM users u
       WHERE u.user_id = ? AND u.is_active = TRUE`,
      [id]
    );

    if (users.length > 0) {
      const user = users[0];
      
      // Get education data
      const [education] = await db.query(
        `SELECT ae.*, s.school_name, s.city, s.logo
         FROM alumni_education ae
         JOIN schools s ON ae.school_id = s.school_id
         WHERE ae.user_id = ?
         ORDER BY ae.start_year DESC`,
        [id]
      );

      // Get work experience
      const [workExperience] = await db.query(
        `SELECT * FROM work_experience 
         WHERE user_id = ? 
         ORDER BY start_date DESC, is_current DESC`,
        [id]
      );

      // Get achievements
      const [achievements] = await db.query(
        `SELECT * FROM achievements 
         WHERE user_id = ? 
         ORDER BY achievement_date DESC`,
        [id]
      );

      const completeProfile = {
        ...user,
        profile_picture: user.profile_picture 
          ? getCompleteFileUrl(req, user.profile_picture)
          : null,
        education: education || [],
        work_experience: workExperience || [],
        achievements: achievements || [],
      };

      return res.json({
        success: true,
        user: completeProfile
      });
    }

    return res.status(404).json({
      success: false,
      message: 'User not found'
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender,
      current_city,
      current_country,
      bio,
      linkedin_url,
      facebook_url,
      twitter_url
    } = req.body;

    // Check if user is school admin
    if (req.user.role === 'school_admin') {
      // Update school_admins table
      const updates = [];
      const values = [];

      if (first_name !== undefined) {
        updates.push('first_name = ?');
        values.push(first_name);
      }
      if (last_name !== undefined) {
        updates.push('last_name = ?');
        values.push(last_name);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone || null);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(req.user.user_id);

      await db.query(
        `UPDATE school_admins SET ${updates.join(', ')} WHERE admin_id = ?`,
        values
      );

      const [updatedAdmin] = await db.query(
        'SELECT * FROM school_admins WHERE admin_id = ?',
        [req.user.user_id]
      );

      const admin = formatUserResponse(req, updatedAdmin[0], true);

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: admin
      });
    }

    // Regular user update
    const updates = [];
    const values = [];

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (date_of_birth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(date_of_birth || null);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender || null);
    }
    if (current_city !== undefined) {
      updates.push('current_city = ?');
      values.push(current_city || null);
    }
    if (current_country !== undefined) {
      updates.push('current_country = ?');
      values.push(current_country || null);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio || null);
    }
    if (linkedin_url !== undefined) {
      updates.push('linkedin_url = ?');
      values.push(linkedin_url || null);
    }
    if (facebook_url !== undefined) {
      updates.push('facebook_url = ?');
      values.push(facebook_url || null);
    }
    if (twitter_url !== undefined) {
      updates.push('twitter_url = ?');
      values.push(twitter_url || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(req.user.user_id);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );

    const [updatedUser] = await db.query(
      'SELECT * FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    const user = formatUserResponse(req, updatedUser[0]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const userId = req.user.user_id;
    const filePath = req.file.path.replace(/\\/g, '/');
    
    // ✅ GET OLD PROFILE PICTURE BEFORE UPDATE
    const [users] = await db.query(
      'SELECT profile_picture FROM users WHERE user_id = ?',
      [userId]
    );

    const oldProfilePicture = users[0]?.profile_picture;

    // Update database with new picture
    await db.query(
      'UPDATE users SET profile_picture = ? WHERE user_id = ?',
      [filePath, userId]
    );

    // ✅ DELETE OLD FILE IF EXISTS
    if (oldProfilePicture && oldProfilePicture !== filePath) {
      const fs = require('fs');
      const path = require('path');
      const oldFilePath = path.join(__dirname, '..', oldProfilePicture);
      
      fs.unlink(oldFilePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting old profile picture:', err);
        }
      });
    }

    // Get updated user data
    const [updatedUsers] = await db.query(
      `SELECT user_id, email, first_name, last_name, role, profile_picture, 
              phone, current_city, current_country, bio, is_verified, is_active, created_at
       FROM users WHERE user_id = ?`,
      [userId]
    );

    const user = formatUserResponse(req, updatedUsers[0]);

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      user
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
};

exports.deleteAlumni = async (req, res) => {
  try {
    const { userId } = req.params;
    const schoolAdminId = req.user.user_id;
    const schoolId = req.user.school_id;

    // Check if user is school admin
    if (req.user.role !== 'school_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can delete alumni'
      });
    }

    // Check if alumni exists and belongs to this school
    const [alumni] = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email
       FROM users u
       INNER JOIN alumni_education ae ON u.user_id = ae.user_id
       WHERE u.user_id = ? 
         AND ae.school_id = ? 
         AND u.role = 'alumni'
         AND u.is_active = TRUE`,
      [userId, schoolId]
    );

    if (!alumni.length) {
      return res.status(404).json({
        success: false,
        message: 'Alumni not found in your school or already deleted'
      });
    }

    // Soft delete the alumni
    await db.query(
      'UPDATE users SET is_active = FALSE WHERE user_id = ?',
      [userId]
    );

    // Log the activity
    await db.query(
      `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description)
       VALUES (?, 'school_admin', 'delete_alumni', ?)`,
      [schoolAdminId, `Deleted alumni ${alumni[0].first_name} ${alumni[0].last_name} (${alumni[0].email})`]
    );

    res.json({
      success: true,
      message: `Alumni ${alumni[0].first_name} ${alumni[0].last_name} has been deleted successfully`
    });
  } catch (error) {
    console.error('Delete alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alumni',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // ✅ CHECK: New password cannot be the same as current password
    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password'
      });
    }

    let passwordHash;
    let updateTable;
    let updateId;
    let userEmail;
    let userName;

    if (req.user.role === 'school_admin') {
      const [admins] = await db.query(
        'SELECT password_hash, email, first_name, last_name FROM school_admins WHERE admin_id = ?',
        [req.user.user_id]
      );
      passwordHash = admins[0].password_hash;
      userEmail = admins[0].email;
      userName = `${admins[0].first_name} ${admins[0].last_name}`;
      updateTable = 'school_admins';
      updateId = 'admin_id';
    } else {
      const [users] = await db.query(
        'SELECT password_hash, email, first_name, last_name FROM users WHERE user_id = ?',
        [req.user.user_id]
      );
      passwordHash = users[0].password_hash;
      userEmail = users[0].email;
      userName = `${users[0].first_name} ${users[0].last_name}`;
      updateTable = 'users';
      updateId = 'user_id';
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, passwordHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // ✅ ADDITIONAL CHECK: Verify new password is different from old (using hash comparison)
    const isSamePassword = await bcrypt.compare(new_password, passwordHash);
    
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password'
      });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await db.query(
      `UPDATE ${updateTable} SET password_hash = ? WHERE ${updateId} = ?`,
      [hashedPassword, req.user.user_id]
    );

    // Send email notification
    try {
      await sendPasswordChangedEmail(userEmail, userName);
          } catch (emailError) {
      console.error('✗ Password changed email failed:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, school_id, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, 
             u.profile_picture, u.current_city, u.is_verified, u.is_active, u.created_at
      FROM users u
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (school_id) {
      query += ` AND u.user_id IN (SELECT user_id FROM alumni_education WHERE school_id = ?)`;
      params.push(school_id);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [users] = await db.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM users u WHERE 1=1`;
    const countParams = [];

    if (role) {
      countQuery += ` AND u.role = ?`;
      countParams.push(role);
    }

    if (search) {
      countQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      users,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'UPDATE users SET is_active = FALSE WHERE user_id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};