const db = require('../config/database');
const PDFDocument = require('pdfkit');

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers] = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE is_active = TRUE AND role = "alumni"'
    );

    const [totalSchools] = await db.query(
      'SELECT COUNT(*) as total FROM schools WHERE is_active = TRUE'
    );

    const [totalConnections] = await db.query(
      `SELECT COUNT(*) as total FROM connections c
       JOIN users u1 ON c.sender_id = u1.user_id
       JOIN users u2 ON c.receiver_id = u2.user_id
       WHERE c.status = "accepted" 
       AND u1.role = "alumni" 
       AND u2.role = "alumni"`
    );

    const [totalEvents] = await db.query(
      'SELECT COUNT(*) as total FROM events WHERE is_active = TRUE'
    );

    const [totalJobs] = await db.query(
      'SELECT COUNT(*) as total FROM jobs WHERE is_active = TRUE'
    );

    const [usersByRole] = await db.query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       WHERE is_active = TRUE AND role = "alumni"
       GROUP BY role`
    );

    const [newUsers] = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND role = "alumni"
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    const [activeUsers] = await db.query(
      `SELECT COUNT(DISTINCT al.user_id) as total
       FROM activity_logs al
       JOIN users u ON al.user_id = u.user_id
       WHERE al.activity_type = 'login' 
       AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND u.role = "alumni"`
    );

    const [topSchools] = await db.query(
      `SELECT s.school_name, COUNT(DISTINCT ae.user_id) as alumni_count
       FROM schools s
       JOIN alumni_education ae ON s.school_id = ae.school_id
       JOIN users u ON ae.user_id = u.user_id
       WHERE u.role = "alumni" AND u.is_active = TRUE
       GROUP BY s.school_id, s.school_name
       ORDER BY alumni_count DESC
       LIMIT 10`
    );

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

exports.getUserAnalytics = async (req, res) => {
  try {
    const [verificationStats] = await db.query(
      `SELECT is_verified, COUNT(*) as count
       FROM users 
       WHERE is_active = TRUE AND role = "alumni"
       GROUP BY is_verified`
    );

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

    const [registrationTrend] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       AND role = "alumni"
       GROUP BY month
       ORDER BY month ASC`
    );

    const [graduationYearStats] = await db.query(
      `SELECT ae.end_year, COUNT(DISTINCT ae.user_id) as count
       FROM alumni_education ae
       JOIN users u ON ae.user_id = u.user_id
       WHERE u.is_active = TRUE AND u.role = "alumni"
       GROUP BY ae.end_year
       ORDER BY ae.end_year DESC
       LIMIT 20`
    );

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

exports.getEventAnalytics = async (req, res) => {
  try {
    const [totalEvents] = await db.query(
      'SELECT COUNT(*) as total FROM events WHERE is_active = TRUE'
    );

    const [upcomingEvents] = await db.query(
      'SELECT COUNT(*) as total FROM events WHERE event_date >= NOW() AND is_active = TRUE'
    );

    const [totalRegistrations] = await db.query(
      'SELECT COUNT(*) as total FROM event_registrations WHERE registration_status = "registered"'
    );

    const [eventsByType] = await db.query(
      `SELECT event_type, COUNT(*) as count
       FROM events WHERE is_active = TRUE
       GROUP BY event_type`
    );

    const [topEvents] = await db.query(
      `SELECT e.title, e.event_date, e.location, COUNT(er.registration_id) as attendee_count
       FROM events e
       LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.registration_status = 'registered'
       WHERE e.is_active = TRUE
       GROUP BY e.event_id, e.title, e.event_date, e.location
       ORDER BY attendee_count DESC
       LIMIT 10`
    );

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

exports.getJobAnalytics = async (req, res) => {
  try {
    const [totalJobs] = await db.query(
      'SELECT COUNT(*) as total FROM jobs WHERE is_active = TRUE'
    );

    const [totalApplications] = await db.query(
      'SELECT COUNT(*) as total FROM job_applications'
    );

    const [jobsByType] = await db.query(
      `SELECT job_type, COUNT(*) as count
       FROM jobs WHERE is_active = TRUE
       GROUP BY job_type`
    );

    const [jobsByPostedBy] = await db.query(
      `SELECT 
         CASE 
           WHEN j.posted_by_type = 'alumni' THEN 'Alumni'
           WHEN j.posted_by_type = 'school_admin' THEN 'School Admin'
           ELSE j.posted_by_type
         END as posted_by,
         COUNT(*) as count
       FROM jobs j
       WHERE j.is_active = TRUE
       GROUP BY j.posted_by_type`
    );

    const [topJobLocations] = await db.query(
      `SELECT location, COUNT(*) as job_count
       FROM jobs 
       WHERE is_active = TRUE AND location IS NOT NULL
       GROUP BY location
       ORDER BY job_count DESC
       LIMIT 10`
    );

    const [jobsByLevel] = await db.query(
      `SELECT experience_level, COUNT(*) as count
       FROM jobs WHERE is_active = TRUE
       GROUP BY experience_level`
    );

    const [topCompanies] = await db.query(
      `SELECT company_name, COUNT(*) as job_count
       FROM jobs WHERE is_active = TRUE
       GROUP BY company_name
       ORDER BY job_count DESC
       LIMIT 10`
    );

    const [applicationStatus] = await db.query(
      `SELECT status, COUNT(*) as count
       FROM job_applications
       GROUP BY status`
    );

    const [topJobs] = await db.query(
      `SELECT j.job_title, j.company_name, COUNT(ja.application_id) as application_count
       FROM jobs j
       LEFT JOIN job_applications ja ON j.job_id = ja.job_id
       WHERE j.is_active = TRUE
       GROUP BY j.job_id, j.job_title, j.company_name
       ORDER BY application_count DESC
       LIMIT 10`
    );

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
        jobs_by_posted_by: jobsByPostedBy,
        top_job_locations: topJobLocations,
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

const generatePDF = (data, reportType, res) => {
  const PDFDocument = require('pdfkit');
  
  const doc = new PDFDocument({ 
    margin: 15, 
    size: 'A4',
    layout: 'landscape'
  });
  const filename = `${reportType}_report_${Date.now()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Header colors
  const headerColors = {
    users: { bg: '#059669', text: '#ecfdf5' },
    school_admins: { bg: '#7c3aed', text: '#faf5ff' },
    schools: { bg: '#dc2626', text: '#fef2f2' },
    events: { bg: '#ea580c', text: '#fff7ed' },
    jobs: { bg: '#0891b2', text: '#ecfeff' },
    connections: { bg: '#4f46e5', text: '#eef2ff' },
    companies_alumni: { bg: '#c026d3', text: '#fdf4ff' }
  };

  const colors = headerColors[reportType] || { bg: '#059669', text: '#ecfdf5' };

  if (data.length === 0) {
    // Draw header
    doc.rect(0, 0, doc.page.width, 45).fill(colors.bg);
    doc.fontSize(16).fillColor(colors.text)
       .text('AlumniHub Management System', 15, 10, { align: 'center' });
    doc.fontSize(11)
       .text(`${reportType.toUpperCase().replace(/_/g, ' ')} REPORT`, 15, 28, { align: 'center' });
    
    doc.moveDown(3);
    doc.fontSize(14).fillColor('#dc2626').text('No data available for this report', { align: 'center' });
    
    // Draw footer
    const footerY = doc.page.height - 25;
    doc.rect(0, footerY, doc.page.width, 25).fill('#f3f4f6');
    doc.fontSize(7).fillColor('#6b7280')
       .text(`Page 1`, 15, footerY + 9, { align: 'left' });
    doc.text(`Total Records: 0`, 0, footerY + 9, { align: 'right', width: doc.page.width - 15 });
    
    doc.end();
    return;
  }

  const allHeaders = Object.keys(data[0]);
  const pageWidth = doc.page.width - 30;
  const startX = 15;
  const headerHeight = 28;
  
  // Calculate column widths intelligently
  const columnWidths = allHeaders.map(header => {
    const headerText = header.replace(/_/g, ' ').toUpperCase();
    let maxWidth = headerText.length * 5;
    
    // Sample data to estimate width (check first 100 rows)
    const sampleSize = Math.min(data.length, 100);
    for (let i = 0; i < sampleSize; i++) {
      const value = String(data[i][header] || '');
      // Estimate based on word length, not character count
      const words = value.split(/\s+/);
      const longestWord = Math.max(...words.map(w => w.length));
      maxWidth = Math.max(maxWidth, longestWord * 4);
    }
    
    return Math.min(Math.max(maxWidth, 45), 180);
  });

  // Scale columns to fit page width
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  if (totalWidth > pageWidth) {
    const scale = pageWidth / totalWidth;
    columnWidths.forEach((w, i) => columnWidths[i] = w * scale);
  }

  // Function to draw table header
  const drawTableHeader = (y, pageNum, isFirstPage) => {
    // Draw page header
    if (isFirstPage) {
      doc.rect(0, 0, doc.page.width, 45).fill(colors.bg);
      doc.fontSize(16).fillColor(colors.text)
         .text('AlumniHub Management System', 15, 10, { align: 'center' });
      doc.fontSize(11)
         .text(`${reportType.toUpperCase().replace(/_/g, ' ')} REPORT`, 15, 28, { align: 'center' });
    } else {
      doc.rect(0, 0, doc.page.width, 30).fill(colors.bg);
      doc.fontSize(12).fillColor(colors.text)
         .text(`${reportType.toUpperCase().replace(/_/g, ' ')} REPORT - Page ${pageNum}`, 15, 10, { align: 'center' });
    }
    
    // Draw column headers
    let xPosition = startX;
    
    allHeaders.forEach((header, i) => {
      doc.rect(xPosition, y, columnWidths[i], headerHeight)
         .fillAndStroke(colors.bg, colors.bg);
      
      const headerText = header.replace(/_/g, ' ').toUpperCase();
      doc.fillColor('#ffffff')
         .fontSize(5.5)
         .font('Helvetica-Bold')
         .text(headerText, xPosition + 3, y + 4, {
           width: columnWidths[i] - 6,
           height: headerHeight - 8,
           align: 'left'
         });
      
      xPosition += columnWidths[i];
    });
    
    return y + headerHeight;
  };

  // Function to draw footer
  const drawFooter = (pageNum) => {
    const footerY = doc.page.height - 25;
    doc.rect(0, footerY, doc.page.width, 25).fill('#f3f4f6');
    
    doc.fontSize(7).fillColor('#6b7280')
       .text(`Page ${pageNum}`, 15, footerY + 9, { align: 'left' });
    doc.text(`Total Records: ${data.length}`, 0, footerY + 9, 
       { align: 'right', width: doc.page.width - 15 });
  };

  // First page setup
  let pageNum = 1;
  let yPosition = 55;
  yPosition = drawTableHeader(yPosition, pageNum, true);

  // Draw data rows
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    
    // Calculate needed height for this row with proper word wrapping
    let maxHeight = 16;
    allHeaders.forEach((header, i) => {
      const value = String(row[header] || '');
      if (value.length === 0) return;
      
      // Estimate lines needed with word wrapping
      const words = value.split(/\s+/);
      const avgCharsPerLine = Math.floor(columnWidths[i] / 3.2);
      let currentLineLength = 0;
      let lines = 1;
      
      words.forEach(word => {
        if (currentLineLength + word.length + 1 > avgCharsPerLine) {
          lines++;
          currentLineLength = word.length;
        } else {
          currentLineLength += word.length + 1;
        }
      });
      
      const neededHeight = Math.max(16, lines * 8 + 4);
      maxHeight = Math.max(maxHeight, neededHeight);
    });

    // Check if new page needed
    if (yPosition + maxHeight > doc.page.height - 35) {
      // Draw footer on current page
      drawFooter(pageNum);
      
      // Create new page
      doc.addPage({ layout: 'landscape', margin: 15 });
      pageNum++;
      
      // Draw headers on new page
      yPosition = 40;
      yPosition = drawTableHeader(yPosition, pageNum, false);
    }

    let xPosition = startX;
    const rowBg = rowIndex % 2 === 0 ? '#f9fafb' : '#ffffff';
    const borderColor = '#d1d5db';
    
    allHeaders.forEach((header, i) => {
      doc.rect(xPosition, yPosition, columnWidths[i], maxHeight)
         .fillAndStroke(rowBg, borderColor);
      
      let value = row[header];
      if (value === null || value === undefined) value = '';
      value = String(value);
      
      // Use PDFKit's built-in word wrapping
      doc.fillColor('#1f2937')
         .fontSize(5.5)
         .font('Helvetica')
         .text(value, xPosition + 3, yPosition + 3, {
           width: columnWidths[i] - 6,
           height: maxHeight - 6,
           align: 'left',
           baseline: 'top'
         });
      
      xPosition += columnWidths[i];
    });

    yPosition += maxHeight;
  }

  // Draw footer on last page
  drawFooter(pageNum);

  doc.end();
};


exports.exportReport = async (req, res) => {
  try {
    const { report_type, format = 'csv' } = req.body;

    if (!report_type) {
      return res.status(400).json({
        success: false,
        message: 'report_type is required'
      });
    }

    let data = [];
    let filename = '';

    switch (report_type) {
      case 'users':
        [data] = await db.query(
          `SELECT 
            u.user_id as 'User ID', 
            u.first_name as 'First Name',
            u.last_name as 'Last Name',
            u.email as 'Email',
            u.phone as 'Phone',
            u.current_city as 'City', 
            u.current_country as 'Country',
            u.gender as 'Gender',
            DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as 'DOB',
            CASE WHEN u.is_verified = 1 THEN 'Yes' ELSE 'No' END as 'Verified',
            DATE_FORMAT(u.created_at, '%Y-%m-%d') as 'Registered',
            (SELECT GROUP_CONCAT(DISTINCT s2.school_name SEPARATOR '; ')
             FROM alumni_education ae2
             LEFT JOIN schools s2 ON ae2.school_id = s2.school_id
             WHERE ae2.user_id = u.user_id) as 'Schools',
            (SELECT GROUP_CONCAT(DISTINCT CONCAT(ae3.start_year, '-', ae3.end_year) SEPARATOR '; ')
             FROM alumni_education ae3
             WHERE ae3.user_id = u.user_id) as 'Batch',
            (SELECT we2.company_name
             FROM work_experience we2
             WHERE we2.user_id = u.user_id AND we2.is_current = TRUE
             LIMIT 1) as 'Company',
            (SELECT we3.position
             FROM work_experience we3
             WHERE we3.user_id = u.user_id AND we3.is_current = TRUE
             LIMIT 1) as 'Position'
           FROM users u
           WHERE u.is_active = TRUE AND u.role = 'alumni'
           ORDER BY u.created_at DESC`
        );
        filename = `alumni_report_${Date.now()}`;
        break;

      case 'school_admins':
        [data] = await db.query(
          `SELECT 
            sa.admin_id as 'Admin ID',
            sa.first_name as 'First Name',
            sa.last_name as 'Last Name',
            sa.email as 'Email',
            sa.phone as 'Phone',
            s.school_name as 'School',
            CONCAT(s.city, ', ', s.state) as 'Location',
            CASE WHEN sa.is_active = 1 THEN 'Active' ELSE 'Inactive' END as 'Status',
            DATE_FORMAT(sa.created_at, '%Y-%m-%d') as 'Created'
           FROM school_admins sa
           JOIN schools s ON sa.school_id = s.school_id
           ORDER BY sa.created_at DESC`
        );
        filename = `school_admins_report_${Date.now()}`;
        break;

      case 'schools':
        [data] = await db.query(
          `SELECT 
            s.school_id as 'ID', 
            s.school_name as 'School Name', 
            s.school_code as 'Code',
            CONCAT(s.city, ', ', s.state) as 'Location',
            s.country as 'Country',
            s.established_year as 'Est Year',
            COUNT(DISTINCT ae.user_id) as 'Alumni',
            COUNT(DISTINCT sa.admin_id) as 'Admins',
            COUNT(DISTINCT e.event_id) as 'Events',
            CASE WHEN s.is_active = 1 THEN 'Active' ELSE 'Inactive' END as 'Status'
           FROM schools s
           LEFT JOIN alumni_education ae ON s.school_id = ae.school_id
           LEFT JOIN users u ON ae.user_id = u.user_id AND u.role = 'alumni'
           LEFT JOIN school_admins sa ON s.school_id = sa.school_id AND sa.is_active = TRUE
           LEFT JOIN events e ON s.school_id = e.school_id AND e.is_active = TRUE
           GROUP BY s.school_id, s.school_name, s.school_code, s.city, s.state, s.country, s.established_year, s.is_active
           ORDER BY COUNT(DISTINCT ae.user_id) DESC`
        );
        filename = `schools_report_${Date.now()}`;
        break;

      case 'events':
        [data] = await db.query(
          `SELECT 
            e.event_id AS 'ID',
            e.title AS 'Event Title',
            e.event_type AS 'Type',
            DATE_FORMAT(e.event_date, '%Y-%m-%d %H:%i') AS 'Date Time',
            e.location AS 'Location',
            CASE WHEN e.is_online = 1 THEN 'Yes' ELSE 'No' END AS 'Online',
            CONCAT('$', e.ticket_price) AS 'Price',
            (SELECT s2.school_name FROM schools s2 WHERE s2.school_id = e.school_id) AS 'School',
            (SELECT CONCAT(u2.first_name, ' ', u2.last_name) FROM users u2 WHERE u2.user_id = e.created_by) AS 'Created By',
            COUNT(DISTINCT er.registration_id) AS 'Registrations',
            CONCAT('$', COALESCE(SUM(er.payment_amount), 0)) AS 'Revenue',
            SUBSTRING((SELECT GROUP_CONCAT(DISTINCT CONCAT(u3.first_name, ' ', u3.last_name) SEPARATOR ', ')
             FROM event_registrations er2
             LEFT JOIN users u3 ON er2.user_id = u3.user_id
             WHERE er2.event_id = e.event_id), 1, 100) AS 'Attendees'
           FROM events e
           LEFT JOIN event_registrations er ON e.event_id = er.event_id
           WHERE e.is_active = TRUE
           GROUP BY e.event_id, e.title, e.event_type, e.event_date, e.location, e.is_online, e.ticket_price, e.school_id, e.created_by
           ORDER BY e.event_date DESC`
        );
        filename = `events_report_${Date.now()}`;
        break;

      case 'jobs':
        [data] = await db.query(
          `SELECT 
            j.job_id as 'ID', 
            j.job_title as 'Job Title', 
            j.company_name as 'Company', 
            j.job_type as 'Type', 
            j.experience_level as 'Level',
            j.location as 'Location',
            CASE WHEN j.is_remote = 1 THEN 'Yes' ELSE 'No' END as 'Remote',
            j.salary_range as 'Salary',
            (SELECT CONCAT(u2.first_name, ' ', u2.last_name) FROM users u2 WHERE u2.user_id = j.posted_by) as 'Posted By',
            CASE 
              WHEN j.posted_by_type = 'alumni' THEN 'Alumni'
              WHEN j.posted_by_type = 'school_admin' THEN 'School Admin'
              ELSE j.posted_by_type
            END as 'Posted Type',
            COUNT(DISTINCT ja.application_id) as 'Applications',
            DATE_FORMAT(j.application_deadline, '%Y-%m-%d') as 'Deadline',
            DATE_FORMAT(j.created_at, '%Y-%m-%d') as 'Posted Date',
            CASE WHEN j.is_active = 1 THEN 'Active' ELSE 'Inactive' END as 'Status'
           FROM jobs j
           LEFT JOIN job_applications ja ON j.job_id = ja.job_id
           GROUP BY j.job_id, j.job_title, j.company_name, j.job_type, j.experience_level, 
                    j.location, j.is_remote, j.salary_range, j.posted_by, j.posted_by_type, 
                    j.application_deadline, j.created_at, j.is_active
           ORDER BY j.created_at DESC`
        );
        filename = `jobs_report_${Date.now()}`;
        break;

      case 'connections':
        [data] = await db.query(
          `SELECT 
            u.user_id as 'User ID',
            u.first_name as 'First Name',
            u.last_name as 'Last Name',
            u.email as 'Email',
            CONCAT(u.current_city, ', ', u.current_country) as 'Location',
            (SELECT GROUP_CONCAT(DISTINCT s2.school_name SEPARATOR '; ')
             FROM alumni_education ae2
             LEFT JOIN schools s2 ON ae2.school_id = s2.school_id
             WHERE ae2.user_id = u.user_id) as 'Schools',
            (SELECT COUNT(DISTINCT c2.connection_id)
             FROM connections c2
             WHERE (c2.sender_id = u.user_id OR c2.receiver_id = u.user_id) AND c2.status = 'accepted') as 'Connections',
            (SELECT COUNT(DISTINCT c3.connection_id)
             FROM connections c3
             WHERE c3.sender_id = u.user_id AND c3.status = 'pending') as 'Sent',
            (SELECT COUNT(DISTINCT c4.connection_id)
             FROM connections c4
             WHERE c4.receiver_id = u.user_id AND c4.status = 'pending') as 'Received'
           FROM users u
           WHERE u.is_active = TRUE AND u.role = 'alumni'
           ORDER BY (SELECT COUNT(DISTINCT c5.connection_id)
                     FROM connections c5
                     WHERE (c5.sender_id = u.user_id OR c5.receiver_id = u.user_id) AND c5.status = 'accepted') DESC`
        );
        filename = `connections_report_${Date.now()}`;
        break;

      case 'companies_alumni':
        [data] = await db.query(
          `SELECT 
            we.company_name as 'Company',
            we.industry as 'Industry',
            COUNT(DISTINCT we.user_id) as 'Alumni Count',
            SUBSTRING(GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name, ' - ', we.position) SEPARATOR '; '), 1, 150) as 'Employees',
            SUBSTRING(GROUP_CONCAT(DISTINCT u.email SEPARATOR '; '), 1, 150) as 'Emails',
            SUBSTRING(GROUP_CONCAT(DISTINCT CONCAT(u.current_city, ', ', u.current_country) SEPARATOR '; '), 1, 100) as 'Locations'
           FROM work_experience we
           LEFT JOIN users u ON we.user_id = u.user_id
           WHERE u.role = 'alumni' AND u.is_active = TRUE AND we.is_current = TRUE
           GROUP BY we.company_name, we.industry
           ORDER BY COUNT(DISTINCT we.user_id) DESC
           LIMIT 100`
        );
        filename = `companies_alumni_report_${Date.now()}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data available for export'
        });
      }

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
    } else if (format === 'pdf') {
      generatePDF(data, report_type, res);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or pdf'
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

exports.getSchoolAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const [totalAlumni] = await db.query(
      'SELECT COUNT(DISTINCT user_id) as total FROM alumni_education WHERE school_id = ?',
      [id]
    );

    const [batchDistribution] = await db.query(
      `SELECT end_year, COUNT(DISTINCT user_id) as count
       FROM alumni_education
       WHERE school_id = ?
       GROUP BY end_year
       ORDER BY end_year DESC`,
      [id]
    );

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

    const [industryStats] = await db.query(
      `SELECT we.industry, COUNT(*) as count
       FROM work_experience we
       JOIN alumni_education ae ON we.user_id = ae.user_id
       WHERE ae.school_id = ? AND we.is_current = TRUE AND we.industry IS NOT NULL
       GROUP BY we.industry
       ORDER BY count DESC`,
      [id]
    );

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

    const [eventStats] = await db.query(
      `SELECT COUNT(DISTINCT e.event_id) as total_events,
              COUNT(DISTINCT er.user_id) as total_participants
       FROM events e
       LEFT JOIN event_registrations er ON e.event_id = er.event_id
       WHERE e.school_id = ? AND e.is_active = TRUE`,
      [id]
    );

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