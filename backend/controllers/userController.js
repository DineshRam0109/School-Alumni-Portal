const db = require('../config/database');
const bcrypt = require('bcryptjs');

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
      // Regular user found - get their education, work, achievements
      const [education] = await db.query(
        `SELECT ae.*, s.school_name, s.city, s.logo
         FROM alumni_education ae
         JOIN schools s ON ae.school_id = s.school_id
         WHERE ae.user_id = ?
         ORDER BY ae.start_year DESC`,
        [id]
      );

      const [work] = await db.query(
        `SELECT * FROM work_experience 
         WHERE user_id = ? 
         ORDER BY 
           CASE WHEN is_current = TRUE THEN 0 ELSE 1 END,
           start_date DESC`,
        [id]
      );

      const [achievements] = await db.query(
        `SELECT * FROM achievements 
         WHERE user_id = ? 
         ORDER BY achievement_date DESC`,
        [id]
      );

      return res.json({
        success: true,
        user: {
          ...users[0],
          education,
          work_experience: work,
          achievements
        }
      });
    }

    // If not found in users table, return 404 
    // (School admins should use /school-admins/:id endpoint)
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

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
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

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedAdmin[0]
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

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser[0]
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

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;

    // Update appropriate table based on user role
    if (req.user.role === 'school_admin') {
      await db.query(
        'UPDATE school_admins SET profile_picture = ? WHERE admin_id = ?',
        [profilePicturePath, req.user.user_id]
      );
    } else {
      await db.query(
        'UPDATE users SET profile_picture = ? WHERE user_id = ?',
        [profilePicturePath, req.user.user_id]
      );
    }

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profile_picture: profilePicturePath
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

    let passwordHash;
    let updateTable;
    let updateId;

    if (req.user.role === 'school_admin') {
      const [admins] = await db.query(
        'SELECT password_hash FROM school_admins WHERE admin_id = ?',
        [req.user.user_id]
      );
      passwordHash = admins[0].password_hash;
      updateTable = 'school_admins';
      updateId = 'admin_id';
    } else {
      const [users] = await db.query(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [req.user.user_id]
      );
      passwordHash = users[0].password_hash;
      updateTable = 'users';
      updateId = 'user_id';
    }

    const isValid = await bcrypt.compare(current_password, passwordHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await db.query(
      `UPDATE ${updateTable} SET password_hash = ? WHERE ${updateId} = ?`,
      [hashedPassword, req.user.user_id]
    );

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