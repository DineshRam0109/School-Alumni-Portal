const db = require('../config/database');


// @desc    Get all schools
// @route   GET /api/schools
// @access  Publicz
exports.getAllSchools = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, city, country } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM schools WHERE is_active = TRUE`;
    const params = [];

    // Search in school name with partial match
    if (search && search.trim()) {
      query += ` AND school_name LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    // City filter - CASE INSENSITIVE and TRIMMED
    if (city && city.trim()) {
      query += ` AND LOWER(TRIM(city)) = LOWER(TRIM(?))`;
      params.push(city.trim());
    }

    // Country filter - CASE INSENSITIVE and TRIMMED
    if (country && country.trim()) {
      query += ` AND LOWER(TRIM(country)) = LOWER(TRIM(?))`;
      params.push(country.trim());
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

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) as total FROM schools WHERE is_active = TRUE';
    const countParams = [];

    if (search && search.trim()) {
      countQuery += ` AND school_name LIKE ?`;
      countParams.push(`%${search.trim()}%`);
    }

    if (city && city.trim()) {
      countQuery += ` AND LOWER(TRIM(city)) = LOWER(TRIM(?))`;
      countParams.push(city.trim());
    }

    if (country && country.trim()) {
      countQuery += ` AND LOWER(TRIM(country)) = LOWER(TRIM(?))`;
      countParams.push(country.trim());
    }

    const [totalCount] = await db.query(countQuery, countParams);

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
             u.current_city, u.current_country, u.is_active,
             ae.start_year, ae.end_year, ae.degree_level, ae.field_of_study,
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
    const params = [id];

    // REMOVED: AND u.is_active = TRUE filter to show all alumni

    if (batch_year) {
      query += ` AND ae.end_year = ?`;
      params.push(batch_year);
    }

    if (search && search.trim()) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY u.first_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [alumni] = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT ae.user_id) as total
      FROM alumni_education ae
      JOIN users u ON ae.user_id = u.user_id
      WHERE ae.school_id = ?
    `;
    const countParams = [id];

    if (batch_year) {
      countQuery += ` AND ae.end_year = ?`;
      countParams.push(batch_year);
    }

    if (search && search.trim()) {
      countQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm);
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

// Export all other existing functions...
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

exports.getSchoolStatistics = async (req, res) => {
  try {
    const { id } = req.params;

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







exports.getSchoolAnalyticsById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify access: super_admin can access any school, school_admin only their school
    if (req.user.role === 'school_admin' && req.user.school_id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Registration trend (last 12 months)
    const [registrationTrend] = await db.query(
      `SELECT DATE_FORMAT(u.created_at, '%Y-%m') as month, COUNT(*) as count
       FROM users u
       JOIN alumni_education ae ON u.user_id = ae.user_id
       WHERE ae.school_id = ? 
         AND u.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         AND u.role = 'alumni'
       GROUP BY month
       ORDER BY month ASC`,
      [id]
    );

    // Location distribution
    const [locationStats] = await db.query(
      `SELECT u.current_city, u.current_country, COUNT(*) as count
       FROM users u
       JOIN alumni_education ae ON u.user_id = ae.user_id
       WHERE ae.school_id = ? 
         AND u.current_city IS NOT NULL
         AND u.is_active = TRUE
         AND u.role = 'alumni'
       GROUP BY u.current_city, u.current_country
       ORDER BY count DESC
       LIMIT 10`,
      [id]
    );

    // Industry distribution
    const [industryStats] = await db.query(
      `SELECT we.industry, COUNT(*) as count
       FROM work_experience we
       JOIN alumni_education ae ON we.user_id = ae.user_id
       WHERE ae.school_id = ? 
         AND we.is_current = TRUE 
         AND we.industry IS NOT NULL
       GROUP BY we.industry
       ORDER BY count DESC
       LIMIT 10`,
      [id]
    );

    // Events by type
    const [eventsByType] = await db.query(
      `SELECT event_type, COUNT(*) as count
       FROM events 
       WHERE school_id = ? AND is_active = TRUE
       GROUP BY event_type`,
      [id]
    );

    // Top attended events
    const [topEvents] = await db.query(
      `SELECT e.title, e.event_date, COUNT(er.registration_id) as attendee_count
       FROM events e
       LEFT JOIN event_registrations er ON e.event_id = er.event_id
       WHERE e.school_id = ? AND e.is_active = TRUE
       GROUP BY e.event_id
       ORDER BY attendee_count DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      analytics: {
        registration_trend: registrationTrend,
        location_distribution: locationStats,
        industry_distribution: industryStats,
        events_by_type: eventsByType,
        top_events: topEvents
      }
    });
  } catch (error) {
    console.error('Get school analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

exports.updateSchoolLogo = async (req, res) => {
  try {
    const schoolId = req.params.id;
    
    // Verify user is school admin
    if (req.user.role !== 'school_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can update school logo'
      });
    }
    
    // Verify admin manages this school
    if (req.user.school_id !== parseInt(schoolId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own school logo'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }
    
    // Store clean path (like userController does)
    const filePath = req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '');
    
    // Update school logo in database (store without timestamp)
    await db.query(
      'UPDATE schools SET logo = ? WHERE school_id = ?',
      [filePath, schoolId]
    );
    
    // Add timestamp for cache busting in response
    const timestamp = Date.now();
    const logoWithTimestamp = `uploads/${filePath}?upload=${timestamp}`;
    
    res.json({
      success: true,
      message: 'School logo updated successfully',
      logo: logoWithTimestamp
    });
    
  } catch (error) {
    console.error('Upload school logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload school logo',
      error: error.message
    });
  }
};