const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('./notificationController');
const { getAvatarUrl } = require('../utils/profilePictureUtils');
const { 
  sendAlumniVerificationApprovedEmail,
  sendNewAlumniRegisteredEmail 
} = require('../utils/emailService');
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const baseUrl = process.env.API_URL || 'http://localhost:5000';
  return cleanPath.startsWith('uploads/') 
    ? `${baseUrl}/${cleanPath}` 
    : `${baseUrl}/uploads/${cleanPath}`;
};


exports.updateAdminProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const adminId = req.user.user_id;
    
    // Store path WITHOUT 'uploads/' prefix
    const profilePicturePath = req.file.path
      .replace(/\\/g, '/')
      .replace(/^uploads\//, '');

    // Get old profile picture to delete it
    const [oldData] = await db.query(
      'SELECT profile_picture FROM school_admins WHERE admin_id = ?',
      [adminId]
    );

    // Update database with new profile picture
    await db.query(
      'UPDATE school_admins SET profile_picture = ? WHERE admin_id = ?',
      [profilePicturePath, adminId]
    );

    // Delete old profile picture if it exists
    if (oldData[0]?.profile_picture) {
      const oldPath = oldData[0].profile_picture;
      const fullPath = path.join(__dirname, '..', 'uploads', oldPath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Return the FULL URL
    const fullUrl = getFileUrl(profilePicturePath);

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profile_picture: fullUrl
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    
    // Delete uploaded file if database update fails
    if (req.file) {
      const uploadedPath = path.join(__dirname, '..', req.file.path);
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture',
      error: error.message
    });
  }
};


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
      `SELECT ae.*, u.first_name, u.last_name, u.user_id, u.email, s.school_name
       FROM alumni_education ae
       INNER JOIN users u ON ae.user_id = u.user_id
       INNER JOIN schools s ON ae.school_id = s.school_id
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

    // ✅ SEND EMAIL
    try {
      await sendAlumniVerificationApprovedEmail(
        education[0].email,
        `${education[0].first_name} ${education[0].last_name}`,
        education[0].school_name
      );
          } catch (emailError) {
      console.error('❌ Verification approval email failed:', emailError);
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

    // FIXED: Format profile pictures
    const formattedAlumni = alumni.map(person => ({
      ...person,
      profile_picture: person.profile_picture ? getFileUrl(person.profile_picture) : null
    }));

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
      alumni: formattedAlumni,
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

    const admin = admins[0];
    
    // ✅ Format profile picture URL
    if (admin.profile_picture) {
      admin.profile_picture = getFileUrl(admin.profile_picture);
    }
    
    // ✅ Format school logo URL
    if (admin.logo) {
      admin.logo = getFileUrl(admin.logo);
    }

    res.json({
      success: true,
      admin: admin
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


exports.exportSchoolReport = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { report_type, format = 'csv' } = req.body;

    // Get school details for PDF header
    const [schoolData] = await db.query(
      'SELECT school_name, logo, city, state, country FROM schools WHERE school_id = ?',
      [schoolId]
    );
    const school = schoolData[0];

    let data = [];
    let filename = '';
    let reportTitle = '';

    // ... [Keep all your switch cases for data fetching - they're fine] ...
    switch (report_type) {
      case 'alumni':
        [data] = await db.query(
          `SELECT 
            u.user_id,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            u.current_city,
            u.current_country,
            u.linkedin_url,
            u.bio,
            ae.degree_level,
            ae.field_of_study,
            ae.start_year,
            ae.end_year,
            CASE WHEN ae.is_verified = 1 THEN 'Yes' ELSE 'No' END as is_verified,
            DATE_FORMAT(u.created_at, '%Y-%m-%d') as registration_date,
            we.company_name as current_company,
            we.position as current_position,
            we.industry as current_industry,
            CASE WHEN we.employment_type = 'full_time' THEN 'Full-Time'
                 WHEN we.employment_type = 'part_time' THEN 'Part-Time'
                 WHEN we.employment_type = 'contract' THEN 'Contract'
                 WHEN we.employment_type = 'freelance' THEN 'Freelance'
                 WHEN we.employment_type = 'internship' THEN 'Internship'
                 ELSE we.employment_type END as employment_type,
            (SELECT COUNT(*) FROM connections c 
             WHERE (c.sender_id = u.user_id OR c.receiver_id = u.user_id) 
             AND c.status = 'accepted') as total_connections
           FROM users u
           JOIN alumni_education ae ON u.user_id = ae.user_id
           LEFT JOIN work_experience we ON u.user_id = we.user_id AND we.is_current = TRUE
           WHERE ae.school_id = ? AND u.is_active = TRUE
           ORDER BY u.created_at DESC`,
          [schoolId]
        );
        filename = `alumni_report_${Date.now()}`;
        reportTitle = 'Alumni Directory Report';
        break;

      case 'events':
        [data] = await db.query(
          `SELECT 
            e.event_id,
            e.title,
            CASE 
              WHEN e.event_type = 'networking' THEN 'Networking'
              WHEN e.event_type = 'seminar' THEN 'Seminar'
              WHEN e.event_type = 'workshop' THEN 'Workshop'
              WHEN e.event_type = 'reunion' THEN 'Reunion'
              WHEN e.event_type = 'conference' THEN 'Conference'
              WHEN e.event_type = 'webinar' THEN 'Webinar'
              ELSE e.event_type END as event_type,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') as event_date,
            DATE_FORMAT(e.event_date, '%H:%i') as event_time,
            e.location,
            COALESCE(e.venue_details, 'Not specified') as venue_name,
            e.description,
            COUNT(er.registration_id) as total_registered,
            e.max_attendees,
            CONCAT(oc.first_name, ' ', oc.last_name) as organizer_name,
            oc.email as organizer_email,
            DATE_FORMAT(e.created_at, '%Y-%m-%d') as created_date
           FROM events e
           LEFT JOIN event_registrations er ON e.event_id = er.event_id
           LEFT JOIN users oc ON e.created_by = oc.user_id
           WHERE e.school_id = ? AND e.is_active = TRUE
           GROUP BY e.event_id
           ORDER BY e.event_date DESC`,
          [schoolId]
        );
        filename = `events_report_${Date.now()}`;
        reportTitle = 'Events & Attendance Report';
        break;

      case 'batches':
        [data] = await db.query(
          `SELECT 
            ae.end_year as batch_year,
            COUNT(DISTINCT ae.user_id) as total_alumni,
            SUM(CASE WHEN ae.is_verified = TRUE THEN 1 ELSE 0 END) as verified_alumni,
            SUM(CASE WHEN ae.is_verified = FALSE THEN 1 ELSE 0 END) as unverified_alumni,
            GROUP_CONCAT(DISTINCT ae.degree_level ORDER BY ae.degree_level) as degree_levels,
            GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) ORDER BY u.first_name SEPARATOR ' | ') as alumni_names
           FROM alumni_education ae
           JOIN users u ON ae.user_id = u.user_id
           LEFT JOIN work_experience we ON ae.user_id = we.user_id AND we.is_current = TRUE
           WHERE ae.school_id = ? AND u.is_active = TRUE
           GROUP BY ae.end_year
           ORDER BY ae.end_year DESC`,
          [schoolId]
        );
        filename = `batches_report_${Date.now()}`;
        reportTitle = 'Batch-wise Alumni Statistics';
        break;

      case 'employment':
        [data] = await db.query(
          `SELECT 
            we.company_name,
            COUNT(DISTINCT we.user_id) AS alumni_count,
            GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) ORDER BY u.first_name SEPARATOR ' | ') AS alumni_names,
            GROUP_CONCAT(DISTINCT we.position ORDER BY we.position SEPARATOR ', ') AS positions,
            GROUP_CONCAT(DISTINCT we.industry ORDER BY we.industry SEPARATOR ', ') AS industries,
            GROUP_CONCAT(DISTINCT ae.end_year ORDER BY ae.end_year DESC SEPARATOR ', ') AS batch_years,
            SUM(CASE WHEN we.employment_type = 'full_time' THEN 1 ELSE 0 END) AS full_time_count,
            SUM(CASE WHEN we.employment_type = 'part_time' THEN 1 ELSE 0 END) AS part_time_count,
            SUM(CASE WHEN we.employment_type = 'contract' THEN 1 ELSE 0 END) AS contract_count,
            SUM(CASE WHEN we.employment_type = 'internship' THEN 1 ELSE 0 END) AS internship_count,
            SUM(CASE WHEN we.employment_type = 'freelance' THEN 1 ELSE 0 END) AS freelance_count,
            MAX(we.location) AS company_location,
            GROUP_CONCAT(DISTINCT ae.degree_level SEPARATOR ', ') AS degree_levels,
            GROUP_CONCAT(DISTINCT ae.field_of_study SEPARATOR ', ') AS fields_of_study,
            GROUP_CONCAT(DISTINCT u.current_city SEPARATOR ', ') AS alumni_cities
           FROM work_experience we
           JOIN alumni_education ae ON we.user_id = ae.user_id
           JOIN users u ON we.user_id = u.user_id
           WHERE ae.school_id = ? AND we.is_current = TRUE AND u.is_active = TRUE
           GROUP BY we.company_name
           ORDER BY alumni_count DESC`,
          [schoolId]
        );
        filename = `employment_statistics_${Date.now()}`;
        reportTitle = 'Employment & Career Statistics';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Use: alumni, events, batches, or employment'
        });
    }

    // Handle empty data
    if (data.length === 0) {
      if (format === 'csv') {
        const headers = getDefaultHeaders(report_type);
        const csv = headers.join(',') + '\n';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return res.send(csv);
      } else {
        return res.status(404).json({
          success: false,
          message: 'No data available for this report'
        });
      }
    }

    // CSV Export
    if (format === 'csv') {
      const headers = Object.keys(data[0]);
      let csv = headers.join(',') + '\n';
      
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
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
    } 
    // PDF Export - FIXED
    else if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4',
        layout: 'landscape', // Always landscape for better table display
        bufferPages: true // IMPORTANT: Buffer pages to add footers later
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      
      doc.pipe(res);

      // PDF Header
      doc.fontSize(24).fillColor('#2563eb').text(school.school_name, { align: 'center' });
      doc.fontSize(18).fillColor('#64748b').text(reportTitle, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#94a3b8').text(
        `Generated on: ${new Date().toLocaleDateString('en-IN', { 
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        })}`, 
        { align: 'center' }
      );
      doc.moveDown(0.8);
      
      // Header line
      doc.strokeColor('#2563eb').lineWidth(2)
         .moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(1);

      // Render report content
      if (report_type === 'alumni') {
        renderAlumniPDF(doc, data);
      } else if (report_type === 'events') {
        renderEventsPDF(doc, data);
      } else if (report_type === 'batches') {
        renderBatchesPDF(doc, data);
      } else if (report_type === 'employment') {
        renderEmploymentPDF(doc, data);
      }

      // FIXED FOOTER LOGIC - Add footers to all buffered pages
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        
        // Add page number
        doc.fontSize(8).fillColor('#94a3b8')
           .text(
             `Page ${i + 1} of ${range.count}`, 
             40, 
             doc.page.height - 50, 
             { align: 'center', width: doc.page.width - 80 }
           );
       
      }

      doc.end();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use: csv or pdf'
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


// PDF Rendering Functions with improved colors and spacing

function renderAlumniPDF(doc, data) {
  const colors = { primary: '#059669', text: '#1f2937', border: '#d1fae5' };
  const allHeaders = Object.keys(data[0]);
  
  // Group columns into batches (max 8-10 per page)
  const columnsPerPage = 10;
  const columnGroups = [];
  
  for (let i = 0; i < allHeaders.length; i += columnsPerPage) {
    columnGroups.push(allHeaders.slice(i, i + columnsPerPage));
  }
  
  // Render each group of columns on separate pages
  columnGroups.forEach((headers, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage({ 
        size: 'A4', 
        layout: 'landscape',
        margins: { top: 15, bottom: 15, left: 10, right: 10 }
      });
    }
    
    const pageWidth = doc.page.width - 20;
    const startX = 10;
    const headerHeight = 22;
    const minRowHeight = 18;
    let yPosition = 15;
    
    // Calculate widths for this group
    const columnWidths = headers.map(header => {
      const headerText = header.replace(/_/g, ' ').toUpperCase();
      let maxWidth = Math.max(headerText.length * 6, 60);
      
      const sampleSize = Math.min(data.length, 20);
      for (let i = 0; i < sampleSize; i++) {
        const value = String(data[i][header] || '');
        maxWidth = Math.max(maxWidth, Math.min(value.length * 4, 150));
      }
      return maxWidth;
    });
    
    // Scale to fit page
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    if (totalWidth > pageWidth) {
      const scale = pageWidth / totalWidth;
      columnWidths.forEach((w, i) => columnWidths[i] = Math.max(w * scale, 50));
    }
    
    // Draw page header
    doc.fontSize(8).font('Helvetica-Bold')
       .text(`Alumni Report - Part ${pageIndex + 1} of ${columnGroups.length}`, 
             10, 10, { align: 'left' });
    
    const drawHeader = (y) => {
      let xPosition = startX;
      headers.forEach((header, i) => {
        doc.rect(xPosition, y, columnWidths[i], headerHeight)
           .fillAndStroke(colors.primary, colors.primary);
        
        const headerText = header.replace(/_/g, ' ').toUpperCase();
        doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold')
           .text(headerText, xPosition + 3, y + 6, {
             width: columnWidths[i] - 6, 
             align: 'center'
           });
        xPosition += columnWidths[i];
      });
      return y + headerHeight;
    };
    
    yPosition = drawHeader(yPosition + 10);
    
    // Draw rows for these columns only
    data.forEach((row, rowIndex) => {
      let maxHeight = minRowHeight;
      
      headers.forEach((header, i) => {
        const value = String(row[header] || '').trim();
        if (!value) return;
        
        const textOptions = { width: columnWidths[i] - 6 };
        const textHeight = doc.fontSize(6).font('Helvetica')
          .heightOfString(value, textOptions);
        
        maxHeight = Math.max(maxHeight, textHeight + 10);
      });
      
      if (yPosition + maxHeight > doc.page.height - 20) {
        doc.addPage({ 
          size: 'A4', 
          layout: 'landscape',
          margins: { top: 15, bottom: 15, left: 10, right: 10 }
        });
        doc.fontSize(8).font('Helvetica-Bold')
           .text(`Alumni Report - Part ${pageIndex + 1} of ${columnGroups.length} (cont.)`, 
                 10, 10, { align: 'left' });
        yPosition = 25;
        yPosition = drawHeader(yPosition);
      }
      
      let xPosition = startX;
      const rowBg = rowIndex % 2 === 0 ? '#f0fdf4' : '#ffffff';
      
      headers.forEach((header, i) => {
        doc.rect(xPosition, yPosition, columnWidths[i], maxHeight)
           .fillAndStroke(rowBg, colors.border);
        xPosition += columnWidths[i];
      });
      
      xPosition = startX;
      headers.forEach((header, i) => {
        const value = String(row[header] || '');
        doc.fillColor(colors.text).fontSize(6).font('Helvetica')
           .text(value, xPosition + 3, yPosition + 4, {
             width: columnWidths[i] - 6,
             height: maxHeight - 6,
             align: 'left',
             baseline: 'top'
           });
        xPosition += columnWidths[i];
      });
      
      yPosition += maxHeight;
    });
  });
}




function renderEventsPDF(doc, data) {
  const colors = { primary: '#ea580c', text: '#1f2937', border: '#fed7aa' };
  const allHeaders = Object.keys(data[0]);
  
  // Group columns - fewer per page for better width
  const columnsPerPage = 6;
  const columnGroups = [];
  
  for (let i = 0; i < allHeaders.length; i += columnsPerPage) {
    columnGroups.push(allHeaders.slice(i, i + columnsPerPage));
  }
  
  columnGroups.forEach((headers, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage({ 
        size: 'A4', 
        layout: 'landscape',
        margins: { top: 15, bottom: 15, left: 10, right: 10 }
      });
    }
    
    const pageWidth = doc.page.width - 20; // 822 - 20 = 802 points available
    const startX = 10;
    const headerHeight = 28;
    const minRowHeight = 24;
    const padding = 5;
    let yPosition = 30;
    
    // Add report title
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937')
       .text(`Events Report - Part ${pageIndex + 1} of ${columnGroups.length}`, 
             10, 10, { align: 'left' });
    
    doc.moveTo(10, 26).lineTo(doc.page.width - 10, 26)
       .strokeColor('#d1d5db').lineWidth(0.5).stroke();
    
    // Calculate column widths based on content
    const columnWidths = headers.map(header => {
      const headerText = header.replace(/_/g, ' ').toUpperCase();
      let maxWidth = headerText.length * 8;
      
      // Check actual data content
      data.forEach(row => {
        const value = String(row[header] || '');
        // Estimate width based on content length
        const contentWidth = Math.min(value.length * 5.5, 250);
        maxWidth = Math.max(maxWidth, contentWidth);
      });
      
      // Set minimum and maximum widths
      return Math.min(Math.max(maxWidth, 80), 280);
    });
    
    // Scale proportionally to fit page
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    if (totalWidth > pageWidth) {
      const scale = pageWidth / totalWidth;
      columnWidths.forEach((w, i) => {
        columnWidths[i] = Math.max(w * scale, 70);
      });
    } else if (totalWidth < pageWidth * 0.9) {
      // Distribute extra space proportionally
      const scale = (pageWidth * 0.98) / totalWidth;
      columnWidths.forEach((w, i) => {
        columnWidths[i] = w * scale;
      });
    }
    
    const drawHeader = (y) => {
      let x = startX;
      
      // Draw header cell backgrounds
      headers.forEach((header, i) => {
        doc.rect(x, y, columnWidths[i], headerHeight)
           .fillAndStroke(colors.primary, colors.primary);
        x += columnWidths[i];
      });
      
      // Draw header text
      x = startX;
      headers.forEach((header, i) => {
        const headerText = header.replace(/_/g, ' ').toUpperCase();
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        
        const textHeight = doc.heightOfString(headerText, {
          width: columnWidths[i] - (padding * 2),
          align: 'center',
          lineBreak: true
        });
        const yOffset = (headerHeight - textHeight) / 2;
        
        doc.text(headerText, x + padding, y + yOffset, {
          width: columnWidths[i] - (padding * 2),
          align: 'center',
          lineBreak: true
        });
        
        x += columnWidths[i];
      });
      
      return y + headerHeight;
    };
    
    yPosition = drawHeader(yPosition);
    
    // Draw data rows
    data.forEach((row, rowIndex) => {
      // Calculate required row height
      let maxHeight = minRowHeight;
      
      headers.forEach((header, i) => {
        const value = String(row[header] || '').trim();
        if (!value) return;
        
        doc.fontSize(8).font('Helvetica');
        const textHeight = doc.heightOfString(value, {
          width: columnWidths[i] - (padding * 2),
          lineBreak: true
        });
        
        maxHeight = Math.max(maxHeight, textHeight + (padding * 2) + 4);
      });
      
      // Check for page break
      if (yPosition + maxHeight > doc.page.height - 20) {
        doc.addPage({ 
          size: 'A4', 
          layout: 'landscape',
          margins: { top: 15, bottom: 15, left: 10, right: 10 }
        });
        
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937')
           .text(`Events Report - Part ${pageIndex + 1} of ${columnGroups.length} (cont.)`, 
                 10, 10, { align: 'left' });
        
        doc.moveTo(10, 26).lineTo(doc.page.width - 10, 26)
           .strokeColor('#d1d5db').lineWidth(0.5).stroke();
        
        yPosition = 30;
        yPosition = drawHeader(yPosition);
      }
      
      const rowBg = rowIndex % 2 === 0 ? '#fff7ed' : '#ffffff';
      let x = startX;
      
      // Draw all cell backgrounds
      headers.forEach((header, i) => {
        doc.rect(x, yPosition, columnWidths[i], maxHeight)
           .fillAndStroke(rowBg, colors.border);
        x += columnWidths[i];
      });
      
      // Draw all cell text
      x = startX;
      headers.forEach((header, i) => {
        let value = row[header];
        if (value === null || value === undefined) value = '';
        value = String(value).trim();
        
        if (value) {
          doc.fillColor(colors.text).fontSize(8).font('Helvetica');
          
          doc.text(value, x + padding, yPosition + padding, {
            width: columnWidths[i] - (padding * 2),
            height: maxHeight - (padding * 2),
            align: 'left',
            lineBreak: true,
            ellipsis: false
          });
        }
        
        x += columnWidths[i];
      });
      
      yPosition += maxHeight;
    });
  });
}

function renderBatchesPDF(doc, data) {
  const colors = { primary: '#0891b2', text: '#1f2937', border: '#cffafe' };
  const allHeaders = Object.keys(data[0]);
  
  // Group columns - fewer per page for better width
  const columnsPerPage = 6;
  const columnGroups = [];
  
  for (let i = 0; i < allHeaders.length; i += columnsPerPage) {
    columnGroups.push(allHeaders.slice(i, i + columnsPerPage));
  }
  
  columnGroups.forEach((headers, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage({ 
        size: 'A4', 
        layout: 'landscape',
        margins: { top: 15, bottom: 15, left: 10, right: 10 }
      });
    }
    
    const pageWidth = doc.page.width - 20;
    const startX = 10;
    const headerHeight = 28;
    const minRowHeight = 24;
    const padding = 5;
    let yPosition = 30;
    
    // Add report title
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937')
       .text(`Batches Report - Part ${pageIndex + 1} of ${columnGroups.length}`, 
             10, 10, { align: 'left' });
    
    doc.moveTo(10, 26).lineTo(doc.page.width - 10, 26)
       .strokeColor('#d1d5db').lineWidth(0.5).stroke();
    
    // Calculate column widths based on content
    const columnWidths = headers.map(header => {
      const headerText = header.replace(/_/g, ' ').toUpperCase();
      let maxWidth = headerText.length * 8;
      
      // Check actual data content
      data.forEach(row => {
        const value = String(row[header] || '');
        const contentWidth = Math.min(value.length * 5.5, 250);
        maxWidth = Math.max(maxWidth, contentWidth);
      });
      
      return Math.min(Math.max(maxWidth, 80), 280);
    });
    
    // Scale proportionally to fit page
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    if (totalWidth > pageWidth) {
      const scale = pageWidth / totalWidth;
      columnWidths.forEach((w, i) => {
        columnWidths[i] = Math.max(w * scale, 70);
      });
    } else if (totalWidth < pageWidth * 0.9) {
      const scale = (pageWidth * 0.98) / totalWidth;
      columnWidths.forEach((w, i) => {
        columnWidths[i] = w * scale;
      });
    }
    
    const drawHeader = (y) => {
      let x = startX;
      
      // Draw header cell backgrounds
      headers.forEach((header, i) => {
        doc.rect(x, y, columnWidths[i], headerHeight)
           .fillAndStroke(colors.primary, colors.primary);
        x += columnWidths[i];
      });
      
      // Draw header text
      x = startX;
      headers.forEach((header, i) => {
        const headerText = header.replace(/_/g, ' ').toUpperCase();
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        
        const textHeight = doc.heightOfString(headerText, {
          width: columnWidths[i] - (padding * 2),
          align: 'center',
          lineBreak: true
        });
        const yOffset = (headerHeight - textHeight) / 2;
        
        doc.text(headerText, x + padding, y + yOffset, {
          width: columnWidths[i] - (padding * 2),
          align: 'center',
          lineBreak: true
        });
        
        x += columnWidths[i];
      });
      
      return y + headerHeight;
    };
    
    yPosition = drawHeader(yPosition);
    
    // Draw data rows
    data.forEach((row, rowIndex) => {
      // Calculate required row height
      let maxHeight = minRowHeight;
      
      headers.forEach((header, i) => {
        const value = String(row[header] || '').trim();
        if (!value) return;
        
        doc.fontSize(8).font('Helvetica');
        const textHeight = doc.heightOfString(value, {
          width: columnWidths[i] - (padding * 2),
          lineBreak: true
        });
        
        maxHeight = Math.max(maxHeight, textHeight + (padding * 2) + 4);
      });
      
      // Check for page break
      if (yPosition + maxHeight > doc.page.height - 20) {
        doc.addPage({ 
          size: 'A4', 
          layout: 'landscape',
          margins: { top: 15, bottom: 15, left: 10, right: 10 }
        });
        
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937')
           .text(`Batches Report - Part ${pageIndex + 1} of ${columnGroups.length} (cont.)`, 
                 10, 10, { align: 'left' });
        
        doc.moveTo(10, 26).lineTo(doc.page.width - 10, 26)
           .strokeColor('#d1d5db').lineWidth(0.5).stroke();
        
        yPosition = 30;
        yPosition = drawHeader(yPosition);
      }
      
      const rowBg = rowIndex % 2 === 0 ? '#ecfeff' : '#ffffff';
      let x = startX;
      
      // Draw all cell backgrounds
      headers.forEach((header, i) => {
        doc.rect(x, yPosition, columnWidths[i], maxHeight)
           .fillAndStroke(rowBg, colors.border);
        x += columnWidths[i];
      });
      
      // Draw all cell text
      x = startX;
      headers.forEach((header, i) => {
        let value = row[header];
        if (value === null || value === undefined) value = '';
        value = String(value).trim();
        
        if (value) {
          doc.fillColor(colors.text).fontSize(8).font('Helvetica');
          
          doc.text(value, x + padding, yPosition + padding, {
            width: columnWidths[i] - (padding * 2),
            height: maxHeight - (padding * 2),
            align: 'left',
            lineBreak: true,
            ellipsis: false
          });
        }
        
        x += columnWidths[i];
      });
      
      yPosition += maxHeight;
    });
  });
}

function renderEmploymentPDF(doc, data) {
  const colors = { primary: '#7c3aed', text: '#1f2937', border: '#e9d5ff' };
  const allHeaders = Object.keys(data[0]);
  
  // Group columns into batches (max 8-10 per page)
  const columnsPerPage = 10;
  const columnGroups = [];
  
  for (let i = 0; i < allHeaders.length; i += columnsPerPage) {
    columnGroups.push(allHeaders.slice(i, i + columnsPerPage));
  }
  
  // Render each group of columns on separate pages
  columnGroups.forEach((headers, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage({ 
        size: 'A4', 
        layout: 'landscape',
        margins: { top: 15, bottom: 15, left: 10, right: 10 }
      });
    }
    
    const pageWidth = doc.page.width - 20;
    const startX = 10;
    const headerHeight = 22;
    const minRowHeight = 18;
    let yPosition = 15;
    
    // Calculate widths for this group
    const columnWidths = headers.map(header => {
      const headerText = header.replace(/_/g, ' ').toUpperCase();
      let maxWidth = Math.max(headerText.length * 6, 60);
      
      const sampleSize = Math.min(data.length, 20);
      for (let i = 0; i < sampleSize; i++) {
        const value = String(data[i][header] || '');
        maxWidth = Math.max(maxWidth, Math.min(value.length * 4, 150));
      }
      return maxWidth;
    });
    
    // Scale to fit page
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    if (totalWidth > pageWidth) {
      const scale = pageWidth / totalWidth;
      columnWidths.forEach((w, i) => columnWidths[i] = Math.max(w * scale, 50));
    }
    
    // Draw page header
    doc.fontSize(8).font('Helvetica-Bold')
       .text(`Employment Report - Part ${pageIndex + 1} of ${columnGroups.length}`, 
             10, 10, { align: 'left' });
    
    const drawHeader = (y) => {
      let xPosition = startX;
      headers.forEach((header, i) => {
        doc.rect(xPosition, y, columnWidths[i], headerHeight)
           .fillAndStroke(colors.primary, colors.primary);
        
        const headerText = header.replace(/_/g, ' ').toUpperCase();
        doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold')
           .text(headerText, xPosition + 3, y + 6, {
             width: columnWidths[i] - 6, 
             align: 'center'
           });
        xPosition += columnWidths[i];
      });
      return y + headerHeight;
    };
    
    yPosition = drawHeader(yPosition + 10);
    
    // Draw rows for these columns only
    data.forEach((row, rowIndex) => {
      let maxHeight = minRowHeight;
      
      headers.forEach((header, i) => {
        const value = String(row[header] || '').trim();
        if (!value) return;
        
        const textOptions = { width: columnWidths[i] - 6 };
        const textHeight = doc.fontSize(6).font('Helvetica')
          .heightOfString(value, textOptions);
        
        maxHeight = Math.max(maxHeight, textHeight + 10);
      });
      
      if (yPosition + maxHeight > doc.page.height - 20) {
        doc.addPage({ 
          size: 'A4', 
          layout: 'landscape',
          margins: { top: 15, bottom: 15, left: 10, right: 10 }
        });
        doc.fontSize(8).font('Helvetica-Bold')
           .text(`Employment Report - Part ${pageIndex + 1} of ${columnGroups.length} (cont.)`, 
                 10, 10, { align: 'left' });
        yPosition = 25;
        yPosition = drawHeader(yPosition);
      }
      
      let xPosition = startX;
      const rowBg = rowIndex % 2 === 0 ? '#faf5ff' : '#ffffff';
      
      headers.forEach((header, i) => {
        doc.rect(xPosition, yPosition, columnWidths[i], maxHeight)
           .fillAndStroke(rowBg, colors.border);
        xPosition += columnWidths[i];
      });
      
      xPosition = startX;
      headers.forEach((header, i) => {
        const value = String(row[header] || '');
        doc.fillColor(colors.text).fontSize(6).font('Helvetica')
           .text(value, xPosition + 3, yPosition + 4, {
             width: columnWidths[i] - 6,
             height: maxHeight - 6,
             align: 'left',
             baseline: 'top'
           });
        xPosition += columnWidths[i];
      });
      
      yPosition += maxHeight;
    });
  });
}

// Helper function to get default headers when no data exists
function getDefaultHeaders(reportType) {
  switch (reportType) {
    case 'alumni':
      return ['user_id', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'current_city', 
              'current_country', 'linkedin_url', 'bio', 'degree_level', 'field_of_study', 
              'start_year', 'end_year', 'is_verified', 'registration_date',
              'current_company', 'current_position', 'current_industry', 'employment_type', 'total_connections'];
    case 'events':
      return ['event_id', 'title', 'event_type', 'event_date', 'event_time', 'location', 'venue_name',
              'description', 'total_registered', 'max_attendees', 'organizer_name', 'organizer_email', 'created_date'];
    case 'batches':
      return ['batch_year', 'total_alumni', 'verified_alumni', 'unverified_alumni', 
              'degree_levels', 'alumni_names'];
    case 'employment':
      return ['company_name', 'alumni_count', 'alumni_names', 'positions', 'industries', 'batch_years', 
              'full_time_count', 'part_time_count', 'contract_count', 'internship_count', 'freelance_count',
              'company_location', 'degree_levels', 'fields_of_study', 'alumni_cities'];
    default:
      return [];
  }
}

module.exports = {
  getMySchool: exports.getMySchool,
  getUnverifiedAlumni: exports.getUnverifiedAlumni,
  verifyAlumni: exports.verifyAlumni,
  getSchoolStatistics: exports.getSchoolStatistics,
  getSchoolAlumni: exports.getSchoolAlumni,
  getSchoolEvents: exports.getSchoolEvents,
  getSchoolAnalytics: exports.getSchoolAnalytics,
  exportSchoolReport: exports.exportSchoolReport,
  getSchoolAdminById: exports.getSchoolAdminById  ,
    updateAdminProfilePicture: exports.updateAdminProfilePicture  // ✅ ADD THIS

};