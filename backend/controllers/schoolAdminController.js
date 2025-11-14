const db = require('../config/database');
const { createNotification } = require('./notificationController');

// @desc    Get My School (School Admin Dashboard)
// @route   GET /api/school-admin/my-school
// @access  Private/SchoolAdmin
exports.getMySchool = async (req, res) => {
  try {
    const [schools] = await db.query(
      `SELECT s.* 
       FROM schools s
       WHERE s.school_id = ? AND s.is_active = TRUE`,
      [req.user.school_id]
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
      message: 'Failed to fetch school',
      error: error.message
    });
  }
};

// @desc    Get Unverified Alumni (ONLY for school admin's school)
// @route   GET /api/school-admin/unverified-alumni
// @access  Private/SchoolAdmin
exports.getUnverifiedAlumni = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const [unverified] = await db.query(
      `SELECT 
        u.user_id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.phone,
        u.profile_picture,
        u.current_city,
        u.current_country,
        u.bio,
        u.created_at,
        ae.education_id,
        ae.degree_level, 
        ae.field_of_study, 
        ae.start_year, 
        ae.end_year,
        ae.is_verified,
        s.school_name
       FROM users u
       INNER JOIN alumni_education ae ON u.user_id = ae.user_id
       INNER JOIN schools s ON ae.school_id = s.school_id
       WHERE ae.school_id = ? 
         AND ae.is_verified = FALSE 
         AND u.is_active = TRUE
         AND u.role = 'alumni'
       ORDER BY u.created_at DESC`,
      [schoolId]
    );

    res.json({
      success: true,
      unverified_alumni: unverified,
      count: unverified.length
    });
  } catch (error) {
    console.error('Get unverified alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unverified alumni',
      error: error.message
    });
  }
};

// @desc    Verify Alumni Education
// @route   PUT /api/school-admin/verify/:educationId
// @access  Private/SchoolAdmin
exports.verifyAlumni = async (req, res) => {
  try {
    const { educationId } = req.params;
    const schoolId = req.user.school_id;

    const [education] = await db.query(
      `SELECT ae.*, u.first_name, u.last_name, u.user_id
       FROM alumni_education ae
       INNER JOIN users u ON ae.user_id = u.user_id
       WHERE ae.education_id = ? AND ae.school_id = ?`,
      [educationId, schoolId]
    );

    if (!education.length) {
      return res.status(404).json({
        success: false,
        message: 'Education record not found or does not belong to your school'
      });
    }

    if (education[0].is_verified) {
      return res.status(400).json({
        success: false,
        message: 'This education record is already verified'
      });
    }

    await db.query(
      `UPDATE alumni_education 
       SET is_verified = TRUE, 
           verified_by = ?, 
           verified_at = NOW()
       WHERE education_id = ?`,
      [req.user.user_id, educationId]
    );

    try {
      await createNotification(
        education[0].user_id,
        'system',
        'Education Verified',
        'Your education record has been verified by your school administrator',
        null
      );
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }

    res.json({
      success: true,
      message: `${education[0].first_name} ${education[0].last_name}'s education record verified successfully`
    });
  } catch (error) {
    console.error('Verify alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify alumni',
      error: error.message
    });
  }
};

// @desc    Get School Statistics (for school admin's school only)
// @route   GET /api/school-admin/statistics
// @access  Private/SchoolAdmin
exports.getSchoolStatistics = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const [
      totalAlumni,
      verificationStats,
      recentRegistrations,
      upcomingEvents,
      batchStats,
      topEmployers
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(DISTINCT u.user_id) as total 
         FROM users u
         INNER JOIN alumni_education ae ON u.user_id = ae.user_id
         WHERE ae.school_id = ? AND u.is_active = TRUE AND u.role = 'alumni'`,
        [schoolId]
      ),
      db.query(
        `SELECT 
          SUM(CASE WHEN ae.is_verified = TRUE THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN ae.is_verified = FALSE THEN 1 ELSE 0 END) as unverified
         FROM alumni_education ae
         INNER JOIN users u ON ae.user_id = u.user_id
         WHERE ae.school_id = ? AND u.is_active = TRUE AND u.role = 'alumni'`,
        [schoolId]
      ),
      db.query(
        `SELECT COUNT(DISTINCT u.user_id) as count
         FROM users u
         INNER JOIN alumni_education ae ON u.user_id = ae.user_id
         WHERE ae.school_id = ? 
           AND u.role = 'alumni'
           AND u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [schoolId]
      ),
      db.query(
        `SELECT COUNT(*) as count FROM events 
         WHERE school_id = ? 
           AND event_date >= NOW() 
           AND is_active = TRUE`,
        [schoolId]
      ),
      db.query(
        `SELECT ae.end_year, COUNT(DISTINCT u.user_id) as count
         FROM alumni_education ae
         INNER JOIN users u ON ae.user_id = u.user_id
         WHERE ae.school_id = ? 
           AND u.is_active = TRUE 
           AND u.role = 'alumni'
         GROUP BY ae.end_year
         ORDER BY ae.end_year DESC`,
        [schoolId]
      ),
      db.query(
        `SELECT we.company_name, COUNT(DISTINCT we.user_id) as count
         FROM work_experience we
         INNER JOIN alumni_education ae ON we.user_id = ae.user_id
         INNER JOIN users u ON we.user_id = u.user_id
         WHERE ae.school_id = ? 
           AND we.is_current = TRUE
           AND u.is_active = TRUE
           AND u.role = 'alumni'
         GROUP BY we.company_name
         ORDER BY count DESC
         LIMIT 10`,
        [schoolId]
      )
    ]);

    res.json({
      success: true,
      statistics: {
        total_alumni: totalAlumni[0][0].total || 0,
        verified_alumni: verificationStats[0][0].verified || 0,
        unverified_alumni: verificationStats[0][0].unverified || 0,
        recent_registrations: recentRegistrations[0][0].count || 0,
        upcoming_events: upcomingEvents[0][0].count || 0,
        batch_distribution: batchStats[0],
        top_employers: topEmployers[0]
      }
    });
  } catch (error) {
    console.error('Get school statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// @desc    Get School Alumni (for school admin's school only)
// @route   GET /api/school-admin/alumni
// @access  Private/SchoolAdmin
exports.getSchoolAlumni = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { page = 1, limit = 20, search, batch_year, verified } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.profile_picture,
             u.current_city, u.current_country, u.phone,
             ae.start_year, ae.end_year, ae.degree_level, ae.field_of_study, ae.is_verified,
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
    const params = [schoolId];

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (batch_year) {
      query += ` AND ae.end_year = ?`;
      params.push(batch_year);
    }

    if (verified !== undefined) {
      query += ` AND ae.is_verified = ?`;
      params.push(verified === 'true' ? 1 : 0);
    }

    query += ` ORDER BY u.first_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [alumni] = await db.query(query, params);

    let countQuery = `
      SELECT COUNT(DISTINCT u.user_id) as total
      FROM users u
      JOIN alumni_education ae ON u.user_id = ae.user_id
      WHERE ae.school_id = ? AND u.is_active = TRUE
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

    if (verified !== undefined) {
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

// @desc    Get School Events (created by or for this school)
// @route   GET /api/school-admin/events
// @access  Private/SchoolAdmin
exports.getSchoolEvents = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { page = 1, limit = 20, upcoming } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, 
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.event_id) as attendee_count
      FROM events e
      WHERE e.school_id = ? AND e.is_active = TRUE
    `;
    const params = [schoolId];

    if (upcoming === 'true') {
      query += ` AND e.event_date >= NOW()`;
    }

    query += ` ORDER BY e.event_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [events] = await db.query(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM events WHERE school_id = ? AND is_active = TRUE';
    const countParams = [schoolId];

    if (upcoming === 'true') {
      countQuery += ' AND event_date >= NOW()';
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      events,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get school events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school events',
      error: error.message
    });
  }
};

// @desc    Get School Analytics (for school admin's school only)
// @route   GET /api/school-admin/analytics
// @access  Private/SchoolAdmin
exports.getSchoolAnalytics = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

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
      [schoolId]
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
      [schoolId]
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
      [schoolId]
    );

    // Events by type
    const [eventsByType] = await db.query(
      `SELECT event_type, COUNT(*) as count
       FROM events 
       WHERE school_id = ? AND is_active = TRUE
       GROUP BY event_type`,
      [schoolId]
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
      [schoolId]
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

// Replace the exportSchoolReport function in schoolAdminController.js
// @desc    Export School Report
// @route   POST /api/school-admin/export
// @access  Private/SchoolAdmin
exports.exportSchoolReport = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { report_type, format = 'csv' } = req.body;


    let data = [];
    let filename = '';

    switch (report_type) {
      case 'alumni':
        [data] = await db.query(
          `SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone,
                  u.current_city, u.current_country, 
                  ae.degree_level, ae.field_of_study, ae.start_year, ae.end_year,
                  ae.is_verified, DATE_FORMAT(u.created_at, '%Y-%m-%d') as created_at
           FROM users u
           JOIN alumni_education ae ON u.user_id = ae.user_id
           WHERE ae.school_id = ? AND u.is_active = TRUE
           ORDER BY u.created_at DESC`,
          [schoolId]
        );
        filename = `school_alumni_report_${Date.now()}`;
        break;

      case 'events':
        [data] = await db.query(
          `SELECT e.event_id, e.title, e.event_type, 
                  DATE_FORMAT(e.event_date, '%Y-%m-%d %H:%i') as event_date, 
                  e.location, e.is_online,
                  COUNT(er.registration_id) as registered_count
           FROM events e
           LEFT JOIN event_registrations er ON e.event_id = er.event_id
           WHERE e.school_id = ? AND e.is_active = TRUE
           GROUP BY e.event_id
           ORDER BY e.event_date DESC`,
          [schoolId]
        );
        filename = `school_events_report_${Date.now()}`;
        break;

      case 'batches':
        [data] = await db.query(
          `SELECT ae.end_year as batch_year, 
                  COUNT(DISTINCT ae.user_id) as total_alumni,
                  SUM(CASE WHEN ae.is_verified = TRUE THEN 1 ELSE 0 END) as verified_alumni,
                  SUM(CASE WHEN ae.is_verified = FALSE THEN 1 ELSE 0 END) as unverified_alumni
           FROM alumni_education ae
           JOIN users u ON ae.user_id = u.user_id
           WHERE ae.school_id = ? AND u.is_active = TRUE
           GROUP BY ae.end_year
           ORDER BY ae.end_year DESC`,
          [schoolId]
        );
        filename = `school_batches_report_${Date.now()}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Use: alumni, events, or batches'
        });
    }


    // CHANGED: Return 200 with message instead of 404 when no data
    if (data.length === 0) {
      if (format === 'json') {
        return res.json({
          success: true,
          data: [],
          count: 0,
          report_type: report_type,
          school_id: schoolId,
          generated_at: new Date().toISOString(),
          message: 'No data available for this report'
        });
      } else {
        // For CSV, return a CSV with just headers
        const headers = getDefaultHeaders(report_type);
        const csv = headers.join(',') + '\n';
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return res.send(csv);
      }
    }

    if (format === 'csv') {
      // Get headers from first object
      const headers = Object.keys(data[0]);
      
      // Create CSV content
      let csv = headers.join(',') + '\n';
      
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape values that contain commas or quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csv += values.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        data: data,
        count: data.length,
        report_type: report_type,
        school_id: schoolId,
        generated_at: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use: csv or json'
      });
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

// Helper function to get default headers when no data exists
function getDefaultHeaders(reportType) {
  switch (reportType) {
    case 'alumni':
      return ['user_id', 'first_name', 'last_name', 'email', 'phone', 'current_city', 'current_country', 
              'degree_level', 'field_of_study', 'start_year', 'end_year', 'is_verified', 'created_at'];
    case 'events':
      return ['event_id', 'title', 'event_type', 'event_date', 'location', 'is_online', 'registered_count'];
    case 'batches':
      return ['batch_year', 'total_alumni', 'verified_alumni', 'unverified_alumni'];
    default:
      return [];
  }
}
// @desc    Get School Admin Profile by ID
// @route   GET /api/school-admins/:id
// @access  Public (anyone can view school admin profiles)
exports.getSchoolAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const [admins] = await db.query(
      `SELECT 
        sa.admin_id,
        sa.email,
        sa.first_name,
        sa.last_name,
        sa.phone,
        sa.profile_picture,
        sa.school_id,
        sa.created_at,
        sa.is_active,
        s.school_name,
        s.school_code,
        s.city,
        s.state,
        s.country,
        s.logo
       FROM school_admins sa
       LEFT JOIN schools s ON sa.school_id = s.school_id
       WHERE sa.admin_id = ? AND sa.is_active = TRUE`,
      [id]
    );

    if (!admins.length) {
      return res.status(404).json({
        success: false,
        message: 'School administrator not found'
      });
    }

    res.json({
      success: true,
      admin: admins[0]
    });
  } catch (error) {
    console.error('Get school admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school administrator',
      error: error.message
    });
  }
};
module.exports = {
  getMySchool: exports.getMySchool,
  getUnverifiedAlumni: exports.getUnverifiedAlumni,
  verifyAlumni: exports.verifyAlumni,
  getSchoolStatistics: exports.getSchoolStatistics,
  getSchoolAlumni: exports.getSchoolAlumni,
  getSchoolEvents: exports.getSchoolEvents,
  getSchoolAnalytics: exports.getSchoolAnalytics,
  exportSchoolReport: exports.exportSchoolReport,
  getSchoolAdminById: exports.getSchoolAdminById  

};