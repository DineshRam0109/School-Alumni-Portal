const db = require('../config/database');
const bcrypt = require('bcryptjs');

// @desc    Get Super Admin Dashboard Statistics
// @route   GET /api/super-admin/dashboard
// @access  Private/SuperAdmin
exports.getDashboardStats = async (req, res) => {
  try {
    // Get all statistics in parallel
    const [
      totalAlumni,
      totalSchools,
      totalSchoolAdmins,
      totalEvents,
      totalJobs,
      totalCompanies,
      totalConnections,
      recentAlumni,
      recentSchoolAdmins,
      topSchools
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users WHERE role = "alumni" AND is_active = TRUE'),
      db.query('SELECT COUNT(*) as count FROM schools WHERE is_active = TRUE'),
      db.query('SELECT COUNT(*) as count FROM school_admins WHERE is_active = TRUE'),
      db.query('SELECT COUNT(*) as count FROM events WHERE is_active = TRUE'),
      db.query('SELECT COUNT(*) as count FROM jobs WHERE is_active = TRUE'),
      db.query(`SELECT COUNT(DISTINCT company_name) as total 
                FROM work_experience 
                WHERE company_name IS NOT NULL 
                AND company_name != ''`),
      db.query('SELECT COUNT(*) as count FROM connections WHERE status = "accepted"'),
      db.query(`
        SELECT u.user_id, u.first_name, u.last_name, u.email, u.profile_picture, 
               u.current_city, u.created_at
        FROM users u
        WHERE u.role = 'alumni' AND u.is_active = TRUE
        ORDER BY u.created_at DESC
        LIMIT 10
      `),
      // UPDATED: Include profile_picture for school admins
      db.query(`
        SELECT sa.admin_id, sa.first_name, sa.last_name, sa.email, sa.profile_picture,
               s.school_name, sa.created_at
        FROM school_admins sa
        JOIN schools s ON sa.school_id = s.school_id
        WHERE sa.is_active = TRUE
        ORDER BY sa.created_at DESC
        LIMIT 10
      `),
      // UPDATED: Include logo for top schools
      db.query(`
        SELECT s.school_id, s.school_name, s.city, s.state, s.logo,
               COUNT(DISTINCT ae.user_id) as alumni_count
        FROM schools s
        LEFT JOIN alumni_education ae ON s.school_id = ae.school_id
        LEFT JOIN users u ON ae.user_id = u.user_id
        WHERE s.is_active = TRUE AND (u.role = 'alumni' OR u.user_id IS NULL)
        GROUP BY s.school_id
        ORDER BY alumni_count DESC
        LIMIT 10
      `)
    ]);

    res.json({
      success: true,
      statistics: {
        total_alumni: totalAlumni[0][0].count,
        total_schools: totalSchools[0][0].count,
        total_school_admins: totalSchoolAdmins[0][0].count,
        total_events: totalEvents[0][0].count,
        total_jobs: totalJobs[0][0].count,
        total_companies: totalCompanies[0][0].total,
        total_connections: totalConnections[0][0].count,
        recent_alumni: recentAlumni[0],
        recent_school_admins: recentSchoolAdmins[0],
        top_schools: topSchools[0]
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// @desc    Get All School Admins
// @route   GET /api/super-admin/school-admins
// @access  Private/SuperAdmin
exports.getAllSchoolAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT sa.admin_id, sa.email, sa.first_name, sa.last_name, sa.phone,
             sa.school_id, sa.profile_picture,s.school_name, s.city, s.state,
             sa.is_active, sa.created_at
      FROM school_admins sa
      JOIN schools s ON sa.school_id = s.school_id
    `;
    const params = [];

    if (search) {
      query += ` WHERE (sa.first_name LIKE ? OR sa.last_name LIKE ? OR sa.email LIKE ? OR s.school_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY sa.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [admins] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM school_admins sa';
    const countParams = [];
    if (search) {
      countQuery += ` JOIN schools s ON sa.school_id = s.school_id 
                      WHERE (sa.first_name LIKE ? OR sa.last_name LIKE ? OR sa.email LIKE ? OR s.school_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      school_admins: admins,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get all school admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school admins',
      error: error.message
    });
  }
};

// @desc    Create School Admin
// @route   POST /api/super-admin/school-admins
// @access  Private/SuperAdmin
exports.createSchoolAdmin = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, school_id } = req.body;

    // Validation
    if (!email || !password || !first_name || !last_name || !school_id) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: email, password, first_name, last_name, school_id'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if email already exists in school_admins
    const [existingAdmin] = await db.query(
      'SELECT admin_id FROM school_admins WHERE email = ?',
      [email]
    );

    if (existingAdmin.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered as school admin'
      });
    }

    // Check if school exists
    const [school] = await db.query(
      'SELECT school_id, school_name FROM schools WHERE school_id = ? AND is_active = TRUE',
      [school_id]
    );

    if (!school.length) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create school admin
    const [result] = await db.query(
      `INSERT INTO school_admins (email, password_hash, first_name, last_name, phone, school_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, first_name, last_name, phone || null, school_id, req.user.user_id]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description)
       VALUES (?, 'super_admin', 'create_school_admin', ?)`,
      [req.user.user_id, `Created school admin ${email} for ${school[0].school_name}`]
    );

    // ✅ SEND EMAIL NOTIFICATION TO NEW SCHOOL ADMIN
    try {
      const loginUrl = `${process.env.FRONTEND_URL}/school-admin-login`;
      await sendSchoolAdminAssignmentEmail(
        email,
        `${first_name} ${last_name}`,
        school[0].school_name,
        loginUrl
      );
          } catch (emailError) {
      console.error('✖ Failed to send school admin assignment email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: `School admin created successfully for ${school[0].school_name}`,
      admin_id: result.insertId
    });
  } catch (error) {
    console.error('Create school admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create school admin',
      error: error.message
    });
  }
};


// @desc    Update School Admin
// @route   PUT /api/super-admin/school-admins/:adminId
// @access  Private/SuperAdmin
exports.updateSchoolAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { first_name, last_name, phone, school_id, is_active } = req.body;

    // Check if admin exists
    const [admin] = await db.query(
      'SELECT admin_id FROM school_admins WHERE admin_id = ?',
      [adminId]
    );

    if (!admin.length) {
      return res.status(404).json({
        success: false,
        message: 'School admin not found'
      });
    }

    // Update fields
    const updates = [];
    const params = [];

    if (first_name) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (school_id) {
      updates.push('school_id = ?');
      params.push(school_id);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(adminId);

    await db.query(
      `UPDATE school_admins SET ${updates.join(', ')} WHERE admin_id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'School admin updated successfully'
    });
  } catch (error) {
    console.error('Update school admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update school admin',
      error: error.message
    });
  }
};

// @desc    Delete/Deactivate School Admin
// @route   DELETE /api/super-admin/school-admins/:adminId
// @access  Private/SuperAdmin
exports.deleteSchoolAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if admin exists
    const [admin] = await db.query(
      'SELECT admin_id, email FROM school_admins WHERE admin_id = ?',
      [adminId]
    );

    if (!admin.length) {
      return res.status(404).json({
        success: false,
        message: 'School admin not found'
      });
    }

    // Soft delete (deactivate)
    await db.query(
      'UPDATE school_admins SET is_active = FALSE WHERE admin_id = ?',
      [adminId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description)
       VALUES (?, 'super_admin', 'delete_school_admin', ?)`,
      [req.user.user_id, `Deactivated school admin ${admin[0].email}`]
    );

    res.json({
      success: true,
      message: 'School admin deactivated successfully'
    });
  } catch (error) {
    console.error('Delete school admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete school admin',
      error: error.message
    });
  }
};

// @desc    Get All Schools (with management)
// @route   GET /api/super-admin/schools
// @access  Private/SuperAdmin
exports.getAllSchools = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, 
             COUNT(DISTINCT ae.user_id) as alumni_count,
             COUNT(DISTINCT sa.admin_id) as admin_count
      FROM schools s
      LEFT JOIN alumni_education ae ON s.school_id = ae.school_id
      LEFT JOIN users u ON ae.user_id = u.user_id AND u.role = 'alumni'
      LEFT JOIN school_admins sa ON s.school_id = sa.school_id AND sa.is_active = TRUE
    `;
    const params = [];

    if (search) {
      query += ` WHERE s.school_name LIKE ? OR s.city LIKE ? OR s.state LIKE ? OR s.school_code LIKE ?`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` GROUP BY s.school_id ORDER BY s.school_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [schools] = await db.query(query, params);

    // Get total count
    const searchTerm = search ? `%${search}%` : null;
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM schools' + (search ? ' WHERE school_name LIKE ? OR city LIKE ? OR state LIKE ? OR school_code LIKE ?' : ''),
      search ? [searchTerm, searchTerm, searchTerm, searchTerm] : []
    );

    res.json({
      success: true,
      schools,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get all schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schools',
      error: error.message
    });
  }
};

// @desc    Create School
// @route   POST /api/super-admin/schools
// @access  Private/SuperAdmin
exports.createSchool = async (req, res) => {
  try {
    const {
      school_name,
      school_code,
      address,
      city,
      state,
      country,
      website,
      established_year,
      description
    } = req.body;

    // Validation
    if (!school_name || !school_code || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: school_name, school_code, city, state, country'
      });
    }

    // Check if school_code already exists
    const [existing] = await db.query(
      'SELECT school_id FROM schools WHERE school_code = ?',
      [school_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'School code already exists'
      });
    }

    // Create school
    const [result] = await db.query(
      `INSERT INTO schools (school_name, school_code, address, city, state, country, website, established_year, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [school_name, school_code, address || null, city, state, country, website || null, established_year || null, description || null]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description)
       VALUES (?, 'super_admin', 'create_school', ?)`,
      [req.user.user_id, `Created school ${school_name}`]
    );

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      school_id: result.insertId
    });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create school',
      error: error.message
    });
  }
};

// @desc    Update School
// @route   PUT /api/super-admin/schools/:schoolId
// @access  Private/SuperAdmin
exports.updateSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const {
      school_name,
      address,
      city,
      state,
      country,
      website,
      established_year,
      description,
      is_active
    } = req.body;

    // Check if school exists
    const [school] = await db.query(
      'SELECT school_id FROM schools WHERE school_id = ?',
      [schoolId]
    );

    if (!school.length) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Update fields
    const updates = [];
    const params = [];

    if (school_name) {
      updates.push('school_name = ?');
      params.push(school_name);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (city) {
      updates.push('city = ?');
      params.push(city);
    }
    if (state) {
      updates.push('state = ?');
      params.push(state);
    }
    if (country) {
      updates.push('country = ?');
      params.push(country);
    }
    if (website !== undefined) {
      updates.push('website = ?');
      params.push(website);
    }
    if (established_year !== undefined) {
      updates.push('established_year = ?');
      params.push(established_year);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(schoolId);

    await db.query(
      `UPDATE schools SET ${updates.join(', ')} WHERE school_id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'School updated successfully'
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update school',
      error: error.message
    });
  }
};

// @desc    Delete School
// @route   DELETE /api/super-admin/schools/:schoolId
// @access  Private/SuperAdmin
exports.deleteSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Check if school exists
    const [school] = await db.query(
      'SELECT school_id, school_name FROM schools WHERE school_id = ?',
      [schoolId]
    );

    if (!school.length) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Check if school has admins or alumni
    const [admins] = await db.query(
      'SELECT COUNT(*) as count FROM school_admins WHERE school_id = ?',
      [schoolId]
    );

    const [alumni] = await db.query(
      'SELECT COUNT(*) as count FROM alumni_education WHERE school_id = ?',
      [schoolId]
    );

    if (admins[0].count > 0 || alumni[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete school with existing admins or alumni. Please deactivate instead.'
      });
    }

    // Hard delete if no dependencies
    await db.query('DELETE FROM schools WHERE school_id = ?', [schoolId]);

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, user_type, activity_type, activity_description)
       VALUES (?, 'super_admin', 'delete_school', ?)`,
      [req.user.user_id, `Deleted school ${school[0].school_name}`]
    );

    res.json({
      success: true,
      message: 'School deleted successfully'
    });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete school',
      error: error.message
    });
  }
};

// @desc    Get All Alumni (system-wide) - FIXED: Exclude super_admin
// @route   GET /api/super-admin/alumni
// @access  Private/SuperAdmin
exports.getAllAlumni = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, school_id, verified } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone,
             u.current_city, u.current_country, u.profile_picture,
             u.is_verified, u.is_active, u.created_at,
             GROUP_CONCAT(DISTINCT s.school_name SEPARATOR ', ') as schools,
             GROUP_CONCAT(DISTINCT CONCAT(ae.start_year, '-', ae.end_year) SEPARATOR ', ') as batch_years
      FROM users u
      LEFT JOIN alumni_education ae ON u.user_id = ae.user_id
      LEFT JOIN schools s ON ae.school_id = s.school_id
      WHERE u.role = 'alumni'
    `;
    const params = [];

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (school_id) {
      query += ` AND ae.school_id = ?`;
      params.push(school_id);
    }

    if (verified !== undefined) {
      query += ` AND u.is_verified = ?`;
      params.push(verified === 'true' ? 1 : 0);
    }

    query += ` GROUP BY u.user_id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [alumni] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT u.user_id) as total FROM users u';
    countQuery += ' LEFT JOIN alumni_education ae ON u.user_id = ae.user_id';
    countQuery += ' WHERE u.role = "alumni"';
    
    const countParams = [];
    if (search) {
      countQuery += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (school_id) {
      countQuery += ' AND ae.school_id = ?';
      countParams.push(school_id);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      alumni,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get all alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alumni',
      error: error.message
    });
  }
};

exports.getSchoolAlumni = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 20, search, batch_year, verified } = req.query;
    const offset = (page - 1) * limit;

    // Check if school exists
    const [school] = await db.query(
      'SELECT school_id, school_name FROM schools WHERE school_id = ?',
      [schoolId]
    );

    if (!school.length) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    let query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.profile_picture,
             u.current_city, u.current_country, u.phone, u.is_active,
             ae.start_year, ae.end_year, ae.degree_level, ae.field_of_study, ae.is_verified,
             we.company_name, we.position
      FROM alumni_education ae
      JOIN users u ON ae.user_id = u.user_id
      LEFT JOIN (
        SELECT user_id, company_name, position
        FROM work_experience
        WHERE is_current = TRUE
        LIMIT 1
      ) we ON u.user_id = we.user_id
      WHERE ae.school_id = ?
    `;
    const params = [schoolId];

    // REMOVED: AND u.role = 'alumni' filter - let's show all users with education records

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (batch_year) {
      query += ` AND ae.end_year = ?`;
      params.push(batch_year);
    }

    if (verified !== undefined && verified !== '') {
      query += ` AND ae.is_verified = ?`;
      params.push(verified === 'true' ? 1 : 0);
    }

    query += ` ORDER BY u.first_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

        
    const [alumni] = await db.query(query, params);

    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT u.user_id) as total
      FROM alumni_education ae
      JOIN users u ON ae.user_id = u.user_id
      WHERE ae.school_id = ?
    `;
    const countParams = [schoolId];

    if (search) {
      countQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (batch_year) {
      countQuery += ` AND ae.end_year = ?`;
      countParams.push(batch_year);
    }

    if (verified !== undefined && verified !== '') {
      countQuery += ` AND ae.is_verified = ?`;
      countParams.push(verified === 'true' ? 1 : 0);
    }

    const [countResult] = await db.query(countQuery, countParams);

    
    res.json({
      success: true,
      alumni,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get school alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school alumni',
      error: error.message
    });
  }
};