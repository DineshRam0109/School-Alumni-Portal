const db = require('../config/database');

exports.createJob = async (req, res) => {
  try {
    const {
      company_name,
      job_title,
      job_description,
      job_type,
      experience_level,
      location,
      is_remote,
      salary_range,
      skills_required,
      application_deadline,
      application_url
    } = req.body;

    if (req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super administrators cannot post jobs. Only alumni and school administrators can post jobs.'
      });
    }

    if (!company_name || !job_title || !job_description) {
      return res.status(400).json({
        success: false,
        message: 'Company name, job title, and description are required'
      });
    }

    if (!application_url || application_url.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Application URL is required'
      });
    }

    try {
      new URL(application_url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid application URL'
      });
    }

    const deadline = application_deadline && application_deadline.trim() !== '' 
      ? application_deadline 
      : null;

    let posterId;
    if (req.user.role === 'school_admin') {
      posterId = req.user.admin_id || req.user.user_id;
    } else {
      posterId = req.user.user_id;
    }
    const posterType = req.user.role;

    const [result] = await db.query(
      `INSERT INTO jobs (posted_by, posted_by_type, company_name, job_title, job_description, job_type,
                        experience_level, location, is_remote, salary_range, skills_required,
                        application_deadline, application_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        posterId,
        posterType,
        company_name,
        job_title,
        job_description,
        job_type || 'full_time',
        experience_level || 'entry',
        location || null,
        is_remote || false,
        salary_range || null,
        skills_required || null,
        deadline,
        application_url
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job_id: result.insertId
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job posting',
      error: error.message
    });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      job_type, 
      experience_level, 
      location, 
      is_remote,
      search,
      school_id,
      show_past = 'false'
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
             j.job_id,
             j.posted_by,
             j.posted_by_type,
             j.company_name,
             j.job_title,
             j.job_description,
             j.job_type,
             j.experience_level,
             j.location,
             j.is_remote,
             j.salary_range,
             j.skills_required,
             j.application_deadline,
             j.application_url,
             j.is_active,
             j.views_count,
             j.created_at,
             j.updated_at,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN NULL
               WHEN j.posted_by_type = 'super_admin' THEN NULL
               WHEN j.posted_by_type = 'alumni' THEN u.first_name
               ELSE NULL
             END as first_name,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN NULL
               WHEN j.posted_by_type = 'super_admin' THEN NULL
               WHEN j.posted_by_type = 'alumni' THEN u.last_name
               ELSE NULL
             END as last_name,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN sa.profile_picture
               WHEN j.posted_by_type = 'super_admin' THEN su.profile_picture
               WHEN j.posted_by_type = 'alumni' THEN u.profile_picture
               ELSE NULL
             END as profile_picture,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN sa.email
               WHEN j.posted_by_type = 'super_admin' THEN su.email
               WHEN j.posted_by_type = 'alumni' THEN u.email
               ELSE NULL
             END as email,
             s.school_id as poster_school_id,
             s.school_name as poster_school_name,
             ae.school_id as alumni_school_id,
             s2.school_name as alumni_school_name,
             (SELECT COUNT(*) FROM job_applications ja2 WHERE ja2.job_id = j.job_id) as application_count,
             CASE 
               WHEN j.application_deadline IS NOT NULL AND j.application_deadline < CURDATE() THEN TRUE
               ELSE FALSE
             END as is_past_deadline
      FROM jobs j
      LEFT JOIN school_admins sa ON j.posted_by = sa.admin_id AND j.posted_by_type = 'school_admin'
      LEFT JOIN users u ON j.posted_by = u.user_id AND j.posted_by_type = 'alumni'
      LEFT JOIN users su ON j.posted_by = su.user_id AND j.posted_by_type = 'super_admin'
      LEFT JOIN schools s ON sa.school_id = s.school_id
      LEFT JOIN (
        SELECT user_id, school_id 
        FROM alumni_education 
        GROUP BY user_id, school_id
      ) ae ON u.user_id = ae.user_id AND j.posted_by_type = 'alumni'
      LEFT JOIN schools s2 ON ae.school_id = s2.school_id
      WHERE j.is_active = TRUE
    `;
    const params = [];

    // ✅ FIXED: Deadline comparison - past jobs only if deadline is before today
    if (show_past === 'true') {
      query += ` AND (j.application_deadline IS NOT NULL AND j.application_deadline < CURDATE())`;
    } else {
      query += ` AND (j.application_deadline IS NULL OR j.application_deadline >= CURDATE())`;
    }

    if (req.user && req.user.role === 'school_admin') {
      query += ` AND (sa.school_id = ? OR ae.school_id = ?)`;
      params.push(req.user.school_id, req.user.school_id);
    } 
    else if (school_id) {
      query += ` AND (sa.school_id = ? OR ae.school_id = ?)`;
      params.push(school_id, school_id);
    }

    if (job_type) {
      query += ` AND j.job_type = ?`;
      params.push(job_type);
    }

    if (experience_level) {
      query += ` AND j.experience_level = ?`;
      params.push(experience_level);
    }

    if (location) {
      query += ` AND j.location LIKE ?`;
      params.push(`%${location}%`);
    }

    if (is_remote === 'true') {
      query += ` AND j.is_remote = TRUE`;
    }

    if (search) {
      query += ` AND (j.job_title LIKE ? OR j.company_name LIKE ? OR j.job_description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY j.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [jobs] = await db.query(query, params);

    let countQuery = `
      SELECT COUNT(DISTINCT j.job_id) as total 
      FROM jobs j
      LEFT JOIN school_admins sa ON j.posted_by = sa.admin_id AND j.posted_by_type = 'school_admin'
      LEFT JOIN users u ON j.posted_by = u.user_id AND j.posted_by_type = 'alumni'
      LEFT JOIN users su ON j.posted_by = su.user_id AND j.posted_by_type = 'super_admin'
      LEFT JOIN schools s ON sa.school_id = s.school_id
      LEFT JOIN (
        SELECT user_id, school_id 
        FROM alumni_education 
        GROUP BY user_id, school_id
      ) ae ON u.user_id = ae.user_id AND j.posted_by_type = 'alumni'
      WHERE j.is_active = TRUE
    `;
    const countParams = [];

    // ✅ FIXED: Same deadline logic for count
    if (show_past === 'true') {
      countQuery += ` AND (j.application_deadline IS NOT NULL AND j.application_deadline < CURDATE())`;
    } else {
      countQuery += ` AND (j.application_deadline IS NULL OR j.application_deadline >= CURDATE())`;
    }

    if (req.user && req.user.role === 'school_admin') {
      countQuery += ` AND (sa.school_id = ? OR ae.school_id = ?)`;
      countParams.push(req.user.school_id, req.user.school_id);
    } else if (school_id) {
      countQuery += ` AND (sa.school_id = ? OR ae.school_id = ?)`;
      countParams.push(school_id, school_id);
    }

    if (job_type) {
      countQuery += ` AND j.job_type = ?`;
      countParams.push(job_type);
    }

    if (experience_level) {
      countQuery += ` AND j.experience_level = ?`;
      countParams.push(experience_level);
    }

    if (location) {
      countQuery += ` AND j.location LIKE ?`;
      countParams.push(`%${location}%`);
    }

    if (is_remote === 'true') {
      countQuery += ` AND j.is_remote = TRUE`;
    }

    if (search) {
      countQuery += ` AND (j.job_title LIKE ? OR j.company_name LIKE ? OR j.job_description LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      jobs,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
             j.job_id,
             j.posted_by,
             j.posted_by_type,
             j.company_name,
             j.job_title,
             j.job_description,
             j.job_type,
             j.experience_level,
             j.location,
             j.is_remote,
             j.salary_range,
             j.skills_required,
             j.application_deadline,
             j.application_url,
             j.is_active,
             j.views_count,
             j.created_at,
             j.updated_at,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN NULL
               WHEN j.posted_by_type = 'super_admin' THEN NULL
               WHEN j.posted_by_type = 'alumni' THEN u.first_name
               ELSE NULL
             END as first_name,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN NULL
               WHEN j.posted_by_type = 'super_admin' THEN NULL
               WHEN j.posted_by_type = 'alumni' THEN u.last_name
               ELSE NULL
             END as last_name,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN sa.profile_picture
               WHEN j.posted_by_type = 'super_admin' THEN su.profile_picture
               WHEN j.posted_by_type = 'alumni' THEN u.profile_picture
               ELSE NULL
             END as profile_picture,
             CASE 
               WHEN j.posted_by_type = 'school_admin' THEN sa.email
               WHEN j.posted_by_type = 'super_admin' THEN su.email
               WHEN j.posted_by_type = 'alumni' THEN u.email
               ELSE NULL
             END as email,
             s.school_id as poster_school_id,
             s.school_name as poster_school_name,
             ae.school_id as alumni_school_id,
             s2.school_name as alumni_school_name,
             (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = j.job_id) as application_count,
             CASE 
               WHEN j.application_deadline IS NOT NULL AND j.application_deadline < CURDATE() THEN TRUE
               ELSE FALSE
             END as is_past_deadline
      FROM jobs j
      LEFT JOIN school_admins sa ON j.posted_by = sa.admin_id AND j.posted_by_type = 'school_admin'
      LEFT JOIN users u ON j.posted_by = u.user_id AND j.posted_by_type = 'alumni'
      LEFT JOIN users su ON j.posted_by = su.user_id AND j.posted_by_type = 'super_admin'
      LEFT JOIN schools s ON sa.school_id = s.school_id
      LEFT JOIN (
        SELECT user_id, school_id 
        FROM alumni_education 
        GROUP BY user_id, school_id
        LIMIT 1
      ) ae ON u.user_id = ae.user_id AND j.posted_by_type = 'alumni'
      LEFT JOIN schools s2 ON ae.school_id = s2.school_id
      WHERE j.job_id = ? AND j.is_active = TRUE
    `;

    const [jobs] = await db.query(query, [id]);

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await db.query(
      'UPDATE jobs SET views_count = views_count + 1 WHERE job_id = ?',
      [id]
    );

    res.json({
      success: true,
      job: jobs[0]
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const [jobs] = await db.query(
      'SELECT posted_by, posted_by_type FROM jobs WHERE job_id = ?',
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    let posterId;
    if (req.user.role === 'school_admin') {
      posterId = req.user.admin_id || req.user.user_id;
    } else {
      posterId = req.user.user_id;
    }
    
    if (jobs[0].posted_by !== posterId || jobs[0].posted_by_type !== req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }

    await db.query(
      'UPDATE jobs SET is_active = FALSE WHERE job_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message
    });
  }
};

