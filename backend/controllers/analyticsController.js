const db = require('../config/database'); // Adjust path to your database config

exports.getDashboardStats = async (req, res) => {
  try {
    // Total users - FIXED: Only count alumni
    const [totalUsers] = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE is_active = TRUE AND role = "alumni"'
    );

    // Total schools
    const [totalSchools] = await db.query(
      'SELECT COUNT(*) as total FROM schools WHERE is_active = TRUE'
    );

    // Total connections - FIXED: Only between alumni
    const [totalConnections] = await db.query(
      `SELECT COUNT(*) as total FROM connections c
       JOIN users u1 ON c.sender_id = u1.user_id
       JOIN users u2 ON c.receiver_id = u2.user_id
       WHERE c.status = "accepted" 
       AND u1.role = "alumni" 
       AND u2.role = "alumni"`
    );

    // Total events
    const [totalEvents] = await db.query(
      'SELECT COUNT(*) as total FROM events WHERE is_active = TRUE'
    );

    // Total jobs
    const [totalJobs] = await db.query(
      'SELECT COUNT(*) as total FROM jobs WHERE is_active = TRUE'
    );

    // Users by role - FIXED: Exclude super_admin
    const [usersByRole] = await db.query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       WHERE is_active = TRUE AND role = "alumni"
       GROUP BY role`
    );

    // New registrations (last 30 days) - FIXED: Only alumni
    const [newUsers] = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND role = "alumni"
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Active users (logged in last 7 days) - FIXED: Only alumni
    const [activeUsers] = await db.query(
      `SELECT COUNT(DISTINCT al.user_id) as total
       FROM activity_logs al
       JOIN users u ON al.user_id = u.user_id
       WHERE al.activity_type = 'login' 
       AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND u.role = "alumni"`
    );

    // Top schools by alumni count - FIXED: Only count alumni
    const [topSchools] = await db.query(
      `SELECT s.school_name, COUNT(DISTINCT ae.user_id) as alumni_count
       FROM schools s
       JOIN alumni_education ae ON s.school_id = ae.school_id
       JOIN users u ON ae.user_id = u.user_id
       WHERE u.role = "alumni" AND u.is_active = TRUE
       GROUP BY s.school_id
       ORDER BY alumni_count DESC
       LIMIT 10`
    );

    // Top companies - FIXED: Only count alumni
    const [topCompanies] = await db.query(
      `SELECT we.company_name, COUNT(*) as employee_count
       FROM work_experience we
       JOIN users u ON we.user_id = u.user_id
       WHERE we.is_current = TRUE 
       AND u.role = "alumni" 
       AND u.is_active = TRUE
       GROUP BY we.company_name
       ORDER BY employee_count DESC
       LIMIT 10`
    );

    // Recent activity - FIXED: Only show alumni activity
    const [recentActivity] = await db.query(
      `SELECT al.activity_type, al.activity_description, al.created_at,
              u.first_name, u.last_name
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       WHERE u.role = "alumni" OR u.user_id IS NULL
       ORDER BY al.created_at DESC
       LIMIT 20`
    );

    res.json({
      success: true,
      statistics: {
        overview: {
          total_users: totalUsers[0].total,
          total_schools: totalSchools[0].total,
          total_connections: totalConnections[0].total,
          total_events: totalEvents[0].total,
          total_jobs: totalJobs[0].total,
          active_users: activeUsers[0].total
        },
        users_by_role: usersByRole,
        registration_trend: newUsers,
        top_schools: topSchools,
        top_companies: topCompanies,
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Private/Admin
exports.getUserAnalytics = async (req, res) => {
  try {
    // Users by verification status - FIXED: Only alumni
    const [verificationStats] = await db.query(
      `SELECT is_verified, COUNT(*) as count
       FROM users 
       WHERE is_active = TRUE AND role = "alumni"
       GROUP BY is_verified`
    );

    // Users by location (top 20 cities) - FIXED: Only alumni
    const [locationStats] = await db.query(
      `SELECT current_city, current_country, COUNT(*) as count
       FROM users
       WHERE current_city IS NOT NULL 
       AND is_active = TRUE 
       AND role = "alumni"
       GROUP BY current_city, current_country
       ORDER BY count DESC
       LIMIT 20`
    );

    // Registration trend (monthly for last 12 months) - FIXED: Only alumni
    const [registrationTrend] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       AND role = "alumni"
       GROUP BY month
       ORDER BY month ASC`
    );

    // Users by graduation year - FIXED: Only alumni
    const [graduationYearStats] = await db.query(
      `SELECT ae.end_year, COUNT(DISTINCT ae.user_id) as count
       FROM alumni_education ae
       JOIN users u ON ae.user_id = u.user_id
       WHERE u.is_active = TRUE AND u.role = "alumni"
       GROUP BY ae.end_year
       ORDER BY ae.end_year DESC
       LIMIT 20`
    );

    // Profile completion stats - FIXED: Only alumni
    const [profileCompletionStats] = await db.query(
      `SELECT 
         SUM(CASE WHEN profile_picture IS NOT NULL THEN 1 ELSE 0 END) as with_photo,
         SUM(CASE WHEN bio IS NOT NULL THEN 1 ELSE 0 END) as with_bio,
         SUM(CASE WHEN current_city IS NOT NULL THEN 1 ELSE 0 END) as with_location,
         COUNT(*) as total
       FROM users 
       WHERE is_active = TRUE AND role = "alumni"`
    );

    res.json({
      success: true,
      analytics: {
        verification_status: verificationStats,
        location_distribution: locationStats,
        registration_trend: registrationTrend,
        graduation_year_distribution: graduationYearStats,
        profile_completion: profileCompletionStats[0]
      }
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics'
    });
  }
};
// @desc    Get school analytics
// @route   GET /api/analytics/schools/:id
// @access  Private/Admin
exports.getSchoolAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    // Total alumni
    const [totalAlumni] = await db.query(
      'SELECT COUNT(DISTINCT user_id) as total FROM alumni_education WHERE school_id = ?',
      [id]
    );

    // Alumni by batch
    const [batchDistribution] = await db.query(
      `SELECT end_year, COUNT(DISTINCT user_id) as count
       FROM alumni_education
       WHERE school_id = ?
       GROUP BY end_year
       ORDER BY end_year DESC`,
      [id]
    );

    // Alumni by location
    const [locationDistribution] = await db.query(
      `SELECT u.current_city, u.current_country, COUNT(*) as count
       FROM users u
       JOIN alumni_education ae ON u.user_id = ae.user_id
       WHERE ae.school_id = ? AND u.current_city IS NOT NULL
       GROUP BY u.current_city, u.current_country
       ORDER BY count DESC
       LIMIT 15`,
      [id]
    );

    // Employment statistics
    const [employmentStats] = await db.query(
      `SELECT we.company_name, COUNT(*) as count
       FROM work_experience we
       JOIN alumni_education ae ON we.user_id = ae.user_id
       WHERE ae.school_id = ? AND we.is_current = TRUE
       GROUP BY we.company_name
       ORDER BY count DESC
       LIMIT 15`,
      [id]
    );

    // Industry distribution
    const [industryStats] = await db.query(
      `SELECT we.industry, COUNT(*) as count
       FROM work_experience we
       JOIN alumni_education ae ON we.user_id = ae.user_id
       WHERE ae.school_id = ? AND we.is_current = TRUE AND we.industry IS NOT NULL
       GROUP BY we.industry
       ORDER BY count DESC`,
      [id]
    );

    // Connection density (average connections per alumni)
    const [connectionStats] = await db.query(
      `SELECT AVG(connection_count) as avg_connections
       FROM (
         SELECT u.user_id, COUNT(c.connection_id) as connection_count
         FROM users u
         JOIN alumni_education ae ON u.user_id = ae.user_id
         LEFT JOIN connections c ON (u.user_id = c.sender_id OR u.user_id = c.receiver_id) AND c.status = 'accepted'
         WHERE ae.school_id = ?
         GROUP BY u.user_id
       ) as conn_counts`,
      [id]
    );

    // Event participation
    const [eventStats] = await db.query(
      `SELECT COUNT(DISTINCT e.event_id) as total_events,
              COUNT(DISTINCT er.user_id) as total_participants
       FROM events e
       LEFT JOIN event_registrations er ON e.event_id = er.event_id
       WHERE e.school_id = ? AND e.is_active = TRUE`,
      [id]
    );

    // Recent registrations
    const [recentRegistrations] = await db.query(
      `SELECT DATE_FORMAT(u.created_at, '%Y-%m') as month, COUNT(*) as count
       FROM users u
       JOIN alumni_education ae ON u.user_id = ae.user_id
       WHERE ae.school_id = ?
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`,
      [id]
    );

    res.json({
      success: true,
      analytics: {
        total_alumni: totalAlumni[0].total,
        batch_distribution: batchDistribution,
        location_distribution: locationDistribution,
        top_employers: employmentStats,
        industry_distribution: industryStats,
        avg_connections: Math.round(connectionStats[0].avg_connections || 0),
        event_stats: eventStats[0],
        registration_trend: recentRegistrations
      }
    });
  } catch (error) {
    console.error('Get school analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school analytics'
    });
  }
};

// @desc    Get event analytics
// @route   GET /api/analytics/events
// @access  Private/Admin
exports.getEventAnalytics = async (req, res) => {
  try {
    // Total events
    const [totalEvents] = await db.query(
      'SELECT COUNT(*) as total FROM events WHERE is_active = TRUE'
    );

    // Upcoming events
    const [upcomingEvents] = await db.query(
      'SELECT COUNT(*) as total FROM events WHERE event_date >= NOW() AND is_active = TRUE'
    );

    // Total registrations
    const [totalRegistrations] = await db.query(
      'SELECT COUNT(*) as total FROM event_registrations WHERE registration_status = "registered"'
    );

    // Events by type
    const [eventsByType] = await db.query(
      `SELECT event_type, COUNT(*) as count
       FROM events WHERE is_active = TRUE
       GROUP BY event_type`
    );

    // Top attended events
    const [topEvents] = await db.query(
      `SELECT e.title, e.event_date, e.location, COUNT(er.registration_id) as attendee_count
       FROM events e
       LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.registration_status = 'registered'
       WHERE e.is_active = TRUE
       GROUP BY e.event_id
       ORDER BY attendee_count DESC
       LIMIT 10`
    );

    // Monthly event trend
    const [eventTrend] = await db.query(
      `SELECT DATE_FORMAT(event_date, '%Y-%m') as month, COUNT(*) as count
       FROM events
       WHERE event_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month
       ORDER BY month ASC`
    );

    res.json({
      success: true,
      analytics: {
        total_events: totalEvents[0].total,
        upcoming_events: upcomingEvents[0].total,
        total_registrations: totalRegistrations[0].total,
        events_by_type: eventsByType,
        top_events: topEvents,
        event_trend: eventTrend
      }
    });
  } catch (error) {
    console.error('Get event analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event analytics'
    });
  }
};

// @desc    Get job analytics
// @route   GET /api/analytics/jobs
// @access  Private/Admin
exports.getJobAnalytics = async (req, res) => {
  try {
    // Total active jobs
    const [totalJobs] = await db.query(
      'SELECT COUNT(*) as total FROM jobs WHERE is_active = TRUE'
    );

    // Total applications
    const [totalApplications] = await db.query(
      'SELECT COUNT(*) as total FROM job_applications'
    );

    // Jobs by type
    const [jobsByType] = await db.query(
      `SELECT job_type, COUNT(*) as count
       FROM jobs WHERE is_active = TRUE
       GROUP BY job_type`
    );

    // Jobs by experience level
    const [jobsByLevel] = await db.query(
      `SELECT experience_level, COUNT(*) as count
       FROM jobs WHERE is_active = TRUE
       GROUP BY experience_level`
    );

    // Top hiring companies
    const [topCompanies] = await db.query(
      `SELECT company_name, COUNT(*) as job_count
       FROM jobs WHERE is_active = TRUE
       GROUP BY company_name
       ORDER BY job_count DESC
       LIMIT 10`
    );

    // Application status distribution
    const [applicationStatus] = await db.query(
      `SELECT status, COUNT(*) as count
       FROM job_applications
       GROUP BY status`
    );

    // Most applied jobs
    const [topJobs] = await db.query(
      `SELECT j.job_title, j.company_name, COUNT(ja.application_id) as application_count
       FROM jobs j
       LEFT JOIN job_applications ja ON j.job_id = ja.job_id
       WHERE j.is_active = TRUE
       GROUP BY j.job_id
       ORDER BY application_count DESC
       LIMIT 10`
    );

    // Job posting trend
    const [jobTrend] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
       FROM jobs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month
       ORDER BY month ASC`
    );

    res.json({
      success: true,
      analytics: {
        total_jobs: totalJobs[0].total,
        total_applications: totalApplications[0].total,
        jobs_by_type: jobsByType,
        jobs_by_experience_level: jobsByLevel,
        top_hiring_companies: topCompanies,
        application_status: applicationStatus,
        most_applied_jobs: topJobs,
        job_posting_trend: jobTrend
      }
    });
  } catch (error) {
    console.error('Get job analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job analytics'
    });
  }
};

// @desc    Generate and export report
// @route   POST /api/analytics/export
// @access  Private/Admin
exports.exportReport = async (req, res) => {
  try {
    const { report_type, format = 'csv' } = req.body;

    let data = [];
    let filename = '';

    switch (report_type) {
      case 'users':
        [data] = await db.query(
          `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, 
                  u.current_city, u.current_country, u.is_verified, 
                  DATE_FORMAT(u.created_at, '%Y-%m-%d') as created_at
           FROM users u
           WHERE u.is_active = TRUE
           ORDER BY u.created_at DESC`
        );
        filename = `users_report_${Date.now()}`;
        break;

      case 'schools':
        [data] = await db.query(
          `SELECT s.school_id, s.school_name, s.city, s.country,
                  COUNT(DISTINCT ae.user_id) as alumni_count
           FROM schools s
           LEFT JOIN alumni_education ae ON s.school_id = ae.school_id
           WHERE s.is_active = TRUE
           GROUP BY s.school_id
           ORDER BY alumni_count DESC`
        );
        filename = `schools_report_${Date.now()}`;
        break;

      case 'events':
        [data] = await db.query(
          `SELECT e.event_id, e.title, e.event_type, 
                  DATE_FORMAT(e.event_date, '%Y-%m-%d') as event_date, 
                  e.location,
                  s.school_name, COUNT(DISTINCT er.registration_id) as registered_count
           FROM events e
           LEFT JOIN schools s ON e.school_id = s.school_id
           LEFT JOIN event_registrations er ON e.event_id = er.event_id
           WHERE e.is_active = TRUE
           GROUP BY e.event_id
           ORDER BY e.event_date DESC`
        );
        filename = `events_report_${Date.now()}`;
        break;

      case 'jobs':
        [data] = await db.query(
          `SELECT j.job_id, j.job_title, j.company_name, j.job_type, j.location,
                  DATE_FORMAT(j.created_at, '%Y-%m-%d') as created_at, 
                  COUNT(DISTINCT ja.application_id) as application_count
           FROM jobs j
           LEFT JOIN job_applications ja ON j.job_id = ja.job_id
           WHERE j.is_active = TRUE
           GROUP BY j.job_id
           ORDER BY j.created_at DESC`
        );
        filename = `jobs_report_${Date.now()}`;
        break;

      case 'connections':
        [data] = await db.query(
          `SELECT u.user_id, u.first_name, u.last_name, u.email,
                  COUNT(c.connection_id) as connection_count
           FROM users u
           LEFT JOIN connections c ON (u.user_id = c.sender_id OR u.user_id = c.receiver_id) 
                                   AND c.status = 'accepted'
           WHERE u.is_active = TRUE
           GROUP BY u.user_id
           ORDER BY connection_count DESC`
        );
        filename = `connections_report_${Date.now()}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV manually
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data available for export'
        });
      }

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
        generated_at: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or json'
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

// @desc    Generate comprehensive report
// @route   POST /api/analytics/reports/generate
// @access  Private/Admin
exports.generateComprehensiveReport = async (req, res) => {
  try {
    const { report_type, format = 'csv', filters = {} } = req.body;

    let data = [];
    let filename = '';

    switch (report_type) {
      case 'users_detailed':
        [data] = await db.query(
          `SELECT 
            u.user_id, 
            CONCAT(u.first_name, ' ', u.last_name) as name,
            u.email, 
            u.role,
            s.school_name,
            ae.end_year as batch,
            u.current_city,
            we.company_name,
            we.position,
            u.is_verified,
            DATE_FORMAT(u.created_at, '%Y-%m-%d') as joined_date
           FROM users u
           LEFT JOIN alumni_education ae ON u.user_id = ae.user_id
           LEFT JOIN schools s ON ae.school_id = s.school_id
           LEFT JOIN work_experience we ON u.user_id = we.user_id AND we.is_current = TRUE
           WHERE u.is_active = TRUE
           ORDER BY u.created_at DESC`
        );
        filename = `users_detailed_report_${Date.now()}`;
        break;

      case 'schools_detailed':
        [data] = await db.query(
          `SELECT 
            s.school_id,
            s.school_name,
            s.city,
            s.state,
            s.country,
            COUNT(DISTINCT ae.user_id) as total_alumni,
            COUNT(DISTINCT CASE WHEN u.is_verified = TRUE THEN ae.user_id END) as verified_alumni,
            COUNT(DISTINCT c.connection_id) as active_connections,
            COUNT(DISTINCT e.event_id) as events_hosted,
            s.established_year
           FROM schools s
           LEFT JOIN alumni_education ae ON s.school_id = ae.school_id
           LEFT JOIN users u ON ae.user_id = u.user_id
           LEFT JOIN connections c ON (u.user_id = c.sender_id OR u.user_id = c.receiver_id) AND c.status = 'accepted'
           LEFT JOIN events e ON s.school_id = e.school_id
           WHERE s.is_active = TRUE
           GROUP BY s.school_id
           ORDER BY total_alumni DESC`
        );
        filename = `schools_detailed_report_${Date.now()}`;
        break;

      case 'connections_network':
        [data] = await db.query(
          `SELECT 
            u.user_id,
            CONCAT(u.first_name, ' ', u.last_name) as name,
            u.email,
            s.school_name,
            COUNT(DISTINCT CASE WHEN c.status = 'accepted' THEN c.connection_id END) as total_connections,
            COUNT(DISTINCT CASE WHEN c.sender_id = u.user_id AND c.status = 'pending' THEN c.connection_id END) as pending_sent,
            COUNT(DISTINCT CASE WHEN c.receiver_id = u.user_id AND c.status = 'pending' THEN c.connection_id END) as pending_received
           FROM users u
           LEFT JOIN alumni_education ae ON u.user_id = ae.user_id
           LEFT JOIN schools s ON ae.school_id = s.school_id
           LEFT JOIN connections c ON u.user_id = c.sender_id OR u.user_id = c.receiver_id
           WHERE u.is_active = TRUE
           GROUP BY u.user_id
           ORDER BY total_connections DESC`
        );
        filename = `connections_network_report_${Date.now()}`;
        break;

      case 'events_attendance':
        [data] = await db.query(
          `SELECT 
            e.event_id,
            e.title,
            e.event_type,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') as event_date,
            s.school_name,
            COUNT(DISTINCT er.registration_id) as registrations,
            COUNT(DISTINCT CASE WHEN er.registration_status = 'attended' THEN er.registration_id END) as attended,
            SUM(er.payment_amount) as revenue
           FROM events e
           LEFT JOIN schools s ON e.school_id = s.school_id
           LEFT JOIN event_registrations er ON e.event_id = er.event_id
           WHERE e.is_active = TRUE
           GROUP BY e.event_id
           ORDER BY e.event_date DESC`
        );
        filename = `events_attendance_report_${Date.now()}`;
        break;

      case 'jobs_performance':
        [data] = await db.query(
          `SELECT 
            j.job_id,
            j.job_title,
            j.company_name,
            j.job_type,
            DATE_FORMAT(j.created_at, '%Y-%m-%d') as posted_date,
            COUNT(DISTINCT ja.application_id) as applications,
            COUNT(DISTINCT CASE WHEN ja.status = 'shortlisted' THEN ja.application_id END) as shortlisted,
            COUNT(DISTINCT CASE WHEN ja.status = 'interviewed' THEN ja.application_id END) as interviewed,
            COUNT(DISTINCT CASE WHEN ja.status = 'offered' THEN ja.application_id END) as offered
           FROM jobs j
           LEFT JOIN job_applications ja ON j.job_id = ja.job_id
           WHERE j.is_active = TRUE
           GROUP BY j.job_id
           ORDER BY j.created_at DESC`
        );
        filename = `jobs_performance_report_${Date.now()}`;
        break;

      case 'companies_alumni':
        [data] = await db.query(
          `SELECT 
            we.company_name,
            we.industry,
            COUNT(DISTINCT CASE WHEN we.is_current = TRUE THEN we.user_id END) as current_employees,
            COUNT(DISTINCT CASE WHEN we.is_current = FALSE THEN we.user_id END) as past_employees,
            COUNT(DISTINCT we.user_id) as total_alumni
           FROM work_experience we
           LEFT JOIN alumni_education ae ON we.user_id = ae.user_id
           LEFT JOIN schools s ON ae.school_id = s.school_id
           GROUP BY we.company_name, we.industry
           ORDER BY total_alumni DESC
           LIMIT 100`
        );
        filename = `companies_alumni_report_${Date.now()}`;
        break;

      case 'mentorship_program':
        [data] = await db.query(
          `SELECT 
            m.mentorship_id,
            CONCAT(mentor.first_name, ' ', mentor.last_name) as mentor_name,
            CONCAT(mentee.first_name, ' ', mentee.last_name) as mentee_name,
            m.status,
            m.area_of_guidance,
            DATE_FORMAT(m.start_date, '%Y-%m-%d') as start_date,
            DATE_FORMAT(m.end_date, '%Y-%m-%d') as end_date,
            DATEDIFF(COALESCE(m.end_date, NOW()), m.start_date) as duration_days
           FROM mentorship m
           JOIN users mentor ON m.mentor_id = mentor.user_id
           JOIN users mentee ON m.mentee_id = mentee.user_id
           ORDER BY m.created_at DESC`
        );
        filename = `mentorship_program_report_${Date.now()}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Generate CSV
    if (format === 'csv') {
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data available for export'
        });
      }

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
    } 
    // Generate JSON
    else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        data: data,
        count: data.length,
        report_type: report_type,
        generated_at: new Date().toISOString()
      });
    } 
    else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or json'
      });
    }
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};