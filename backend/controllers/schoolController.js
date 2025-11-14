const db = require('../config/database');

// @desc    Get all schools
// @route   GET /api/schools
// @access  Public
exports.getAllSchools = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, city, country } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM schools WHERE is_active = TRUE`;
    const params = [];

    if (search) {
      query += ` AND school_name LIKE ?`;
      params.push(`%${search}%`);
    }

    if (city) {
      query += ` AND city = ?`;
      params.push(city);
    }

    if (country) {
      query += ` AND country = ?`;
      params.push(country);
    }

    query += ` ORDER BY school_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [schools] = await db.query(query, params);

    // Get alumni count for each school
    const schoolIds = schools.map(school => school.school_id);
    if (schoolIds.length > 0) {
      const [counts] = await db.query(
        `SELECT school_id, COUNT(DISTINCT user_id) as alumni_count 
         FROM alumni_education 
         WHERE school_id IN (?) 
         GROUP BY school_id`,
        [schoolIds]
      );

      const countMap = new Map(counts.map(count => [count.school_id, count.alumni_count]));
      schools.forEach(school => {
        school.alumni_count = countMap.get(school.school_id) || 0;
      });
    }

    const [totalCount] = await db.query(
      'SELECT COUNT(*) as total FROM schools WHERE is_active = TRUE'
    );

    res.json({
      success: true,
      schools,
      pagination: {
        total: totalCount[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schools'
    });
  }
};

// @desc    Get school by ID with details
// @route   GET /api/schools/:id
// @access  Public
exports.getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;

    const [schools] = await db.query(
      'SELECT * FROM schools WHERE school_id = ? AND is_active = TRUE',
      [id]
    );

    if (!schools.length) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Execute all queries in parallel
    const [alumniCount, batchStats, recentAlumni] = await Promise.all([
      db.query(
        'SELECT COUNT(DISTINCT user_id) as total FROM alumni_education WHERE school_id = ?',
        [id]
      ),
      db.query(
        `SELECT end_year as batch_year, COUNT(DISTINCT user_id) as count
         FROM alumni_education
         WHERE school_id = ?
         GROUP BY end_year
         ORDER BY end_year DESC`,
        [id]
      ),
      db.query(
        `SELECT u.user_id, u.first_name, u.last_name, u.profile_picture, 
                u.current_city, ae.end_year
         FROM users u
         JOIN alumni_education ae ON u.user_id = ae.user_id
         WHERE ae.school_id = ? AND u.is_active = TRUE
         ORDER BY u.created_at DESC
         LIMIT 10`,
        [id]
      )
    ]);

    res.json({
      success: true,
      school: {
        ...schools[0],
        alumni_count: alumniCount[0][0].total,
        batch_stats: batchStats[0],
        recent_alumni: recentAlumni[0]
      }
    });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school details'
    });
  }
};

// @desc    Get school alumni list
// @route   GET /api/schools/:id/alumni
// @access  Private
exports.getSchoolAlumni = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, batch_year, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.profile_picture,
             u.current_city, u.current_country, ae.start_year, ae.end_year, ae.degree_level,
             we.company_name, we.position
      FROM users u
      JOIN alumni_education ae ON u.user_id = ae.user_id
      LEFT JOIN (
        SELECT user_id, company_name, position
        FROM work_experience
        WHERE is_current = TRUE
      ) we ON u.user_id = we.user_id
      WHERE ae.school_id = ? AND u.is_active = TRUE
    `;
    const params = [id];

    if (batch_year) {
      query += ` AND ae.end_year = ?`;
      params.push(batch_year);
    }

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY u.first_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [alumni] = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT u.user_id) as total
      FROM users u
      JOIN alumni_education ae ON u.user_id = ae.user_id
      WHERE ae.school_id = ? AND u.is_active = TRUE
    `;
    const countParams = [id];

    if (batch_year) {
      countQuery += ` AND ae.end_year = ?`;
      countParams.push(batch_year);
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
      message: 'Failed to fetch school alumni'
    });
  }
};

// @desc    Create school (Super Admin only)
// @route   POST /api/schools
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

    if (!school_name || !school_code) {
      return res.status(400).json({
        success: false,
        message: 'School name and code are required'
      });
    }

    // Check if school code exists
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

    const [result] = await db.query(
      `INSERT INTO schools (school_name, school_code, address, city, state, country, 
                           website, established_year, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [school_name, school_code, address, city, state, country, website, established_year, description]
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
      message: 'Failed to create school'
    });
  }
};

// @desc    Update school
// @route   PUT /api/schools/:id
// @access  Private/SuperAdmin/SchoolAdmin
exports.updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      school_name,
      address,
      city,
      state,
      country,
      website,
      established_year,
      description
    } = req.body;

    // Check if user is school admin for this school
    if (req.user.role === 'school_admin') {
      const [adminCheck] = await db.query(
        'SELECT * FROM school_admins WHERE user_id = ? AND school_id = ?',
        [req.user.user_id, id]
      );

      if (!adminCheck.length) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this school'
        });
      }
    }

    await db.query(
      `UPDATE schools SET
        school_name = COALESCE(?, school_name),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        country = COALESCE(?, country),
        website = COALESCE(?, website),
        established_year = COALESCE(?, established_year),
        description = COALESCE(?, description)
       WHERE school_id = ?`,
      [school_name, address, city, state, country, website, established_year, description, id]
    );

    res.json({
      success: true,
      message: 'School updated successfully'
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update school'
    });
  }
};

// @desc    Get school statistics
// @route   GET /api/schools/:id/statistics
// @access  Private
exports.getSchoolStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    // Execute all queries in parallel for better performance
    const [totalAlumni, batchStats, locationStats, companyStats, recentRegistrations] = await Promise.all([
      db.query(
        'SELECT COUNT(DISTINCT user_id) as total FROM alumni_education WHERE school_id = ?',
        [id]
      ),
      db.query(
        `SELECT end_year, COUNT(DISTINCT user_id) as count
         FROM alumni_education
         WHERE school_id = ?
         GROUP BY end_year
         ORDER BY end_year DESC`,
        [id]
      ),
      db.query(
        `SELECT u.current_city, u.current_country, COUNT(*) as count
         FROM users u
         JOIN alumni_education ae ON u.user_id = ae.user_id
         WHERE ae.school_id = ? AND u.current_city IS NOT NULL
         GROUP BY u.current_city, u.current_country
         ORDER BY count DESC
         LIMIT 10`,
        [id]
      ),
      db.query(
        `SELECT we.company_name, COUNT(*) as count
         FROM work_experience we
         JOIN alumni_education ae ON we.user_id = ae.user_id
         WHERE ae.school_id = ? AND we.is_current = TRUE
         GROUP BY we.company_name
         ORDER BY count DESC
         LIMIT 10`,
        [id]
      ),
      db.query(
        `SELECT DATE_FORMAT(u.created_at, '%Y-%m') as month, COUNT(*) as count
         FROM users u
         JOIN alumni_education ae ON u.user_id = ae.user_id
         WHERE ae.school_id = ?
         GROUP BY month
         ORDER BY month DESC
         LIMIT 12`,
        [id]
      )
    ]);

    res.json({
      success: true,
      statistics: {
        total_alumni: totalAlumni[0][0].total,
        batch_distribution: batchStats[0],
        location_distribution: locationStats[0],
        top_companies: companyStats[0],
        registration_trend: recentRegistrations[0]
      }
    });
  } catch (error) {
    console.error('Get school statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school statistics'
    });
  }
};

// @desc    Assign school admin
// @route   POST /api/schools/:id/assign-admin
// @access  Private/SuperAdmin
exports.assignSchoolAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is alumni
    const [user] = await db.query(
      'SELECT user_id, role FROM users WHERE user_id = ?',
      [user_id]
    );

    if (!user.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user role to school_admin
    await db.query(
      'UPDATE users SET role = ? WHERE user_id = ?',
      ['school_admin', user_id]
    );

    // Assign to school
    await db.query(
      'INSERT INTO school_admins (user_id, school_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = user_id',
      [user_id, id]
    );

    res.json({
      success: true,
      message: 'School admin assigned successfully'
    });
  } catch (error) {
    console.error('Assign school admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign school admin'
    });
  }
};

// @desc    Get alumni grouped by batch
// @route   GET /api/schools/:id/batches
// @access  Private
exports.getAlumniBatches = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all batches with alumni count
    const [batches] = await db.query(
      `SELECT 
        ae.end_year as batch_year,
        COUNT(DISTINCT ae.user_id) as alumni_count,
        MIN(ae.start_year) as start_year
       FROM alumni_education ae
       WHERE ae.school_id = ?
       GROUP BY ae.end_year
       ORDER BY ae.end_year DESC`,
      [id]
    );

    // Get alumni for each batch in parallel
    const batchDetails = await Promise.all(
      batches.map(async (batch) => {
        const [alumni] = await db.query(
          `SELECT u.user_id, u.first_name, u.last_name, u.profile_picture, u.current_city,
                  we.company_name, we.position
           FROM users u
           JOIN alumni_education ae ON u.user_id = ae.user_id
           LEFT JOIN work_experience we ON u.user_id = we.user_id AND we.is_current = TRUE
           WHERE ae.school_id = ? AND ae.end_year = ?
           ORDER BY u.first_name ASC
           LIMIT 20`,
          [id, batch.batch_year]
        );

        return {
          ...batch,
          alumni: alumni
        };
      })
    );

    res.json({
      success: true,
      batches: batchDetails
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch data'
    });
  }
};

// @desc    Get school admin's assigned school
// @route   GET /api/schools/my-school
// @access  Private/SchoolAdmin
exports.getMySchool = async (req, res) => {
  try {
    const [schools] = await db.query(
      `SELECT s.* FROM schools s
       JOIN school_admins sa ON s.school_id = sa.school_id
       WHERE sa.user_id = ? AND s.is_active = TRUE`,
      [req.user.user_id]
    );

    if (!schools.length) {
      return res.json({
        success: true,
        school: null,
        message: 'No school assigned'
      });
    }

    res.json({
      success: true,
      school: schools[0]
    });
  } catch (error) {
    console.error('Get my school error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school'
    });
  }
};

// @desc    Verify alumni education
// @route   PATCH /api/schools/verify-education/:educationId
// @access  Private/SchoolAdmin
exports.verifyAlumniEducation = async (req, res) => {
  try {
    const { educationId } = req.params;

    // Check if user is school admin for this education record's school
    const [education] = await db.query(
      `SELECT ae.*, sa.user_id as admin_id 
       FROM alumni_education ae
       LEFT JOIN school_admins sa ON ae.school_id = sa.school_id AND sa.user_id = ?
       WHERE ae.education_id = ?`,
      [req.user.user_id, educationId]
    );

    if (!education.length) {
      return res.status(404).json({
        success: false,
        message: 'Education record not found'
      });
    }

    if (!education[0].admin_id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this education record'
      });
    }

    await db.query(
      `UPDATE alumni_education 
       SET is_verified = TRUE, verified_by = ?, verified_at = NOW()
       WHERE education_id = ?`,
      [req.user.user_id, educationId]
    );

    res.json({
      success: true,
      message: 'Education verified successfully'
    });
  } catch (error) {
    console.error('Verify education error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify education'
    });
  }
};

// @desc    Get unverified alumni for school admin
// @route   GET /api/schools/unverified-alumni
// @access  Private/SchoolAdmin
exports.getUnverifiedAlumni = async (req, res) => {
  try {
    // Get school admin's school
    const [schools] = await db.query(
      'SELECT school_id FROM school_admins WHERE user_id = ?',
      [req.user.user_id]
    );

    if (!schools.length) {
      return res.status(403).json({
        success: false,
        message: 'No school assigned'
      });
    }

    const schoolId = schools[0].school_id;

    const [unverified] = await db.query(
      `SELECT ae.*, u.first_name, u.last_name, u.email, u.profile_picture
       FROM alumni_education ae
       JOIN users u ON ae.user_id = u.user_id
       WHERE ae.school_id = ? AND ae.is_verified = FALSE
       ORDER BY ae.created_at DESC`,
      [schoolId]
    );

    res.json({
      success: true,
      unverified_alumni: unverified
    });
  } catch (error) {
    console.error('Get unverified alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unverified alumni'
    });
  }
};