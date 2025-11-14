const db = require('../config/database');

// @desc    Create job posting
// @route   POST /api/jobs
// @access  Private
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

    // Validation
    if (!company_name || !job_title || !job_description) {
      return res.status(400).json({
        success: false,
        message: 'Company name, job title, and description are required'
      });
    }

    // Handle empty date - convert empty string to NULL
    const deadline = application_deadline && application_deadline.trim() !== '' 
      ? application_deadline 
      : null;

    const [result] = await db.query(
      `INSERT INTO jobs (posted_by, company_name, job_title, job_description, job_type,
                        experience_level, location, is_remote, salary_range, skills_required,
                        application_deadline, application_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
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
        application_url || null
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

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
exports.getAllJobs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      job_type, 
      experience_level, 
      location, 
      is_remote,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT j.*, 
             u.first_name, 
             u.last_name, 
             u.profile_picture,
             (SELECT COUNT(*) FROM job_applications WHERE job_id = j.job_id) as application_count
      FROM jobs j
      JOIN users u ON j.posted_by = u.user_id
      WHERE j.is_active = TRUE
    `;
    const params = [];

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

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM jobs j WHERE j.is_active = TRUE`;
    const countParams = [];

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

// @desc    Get job by ID
// @route   GET /api/jobs/:id
// @access  Public
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const [jobs] = await db.query(
      `SELECT j.*, 
              u.first_name, 
              u.last_name, 
              u.profile_picture,
              u.email,
              (SELECT COUNT(*) FROM job_applications WHERE job_id = j.job_id) as application_count
       FROM jobs j
       JOIN users u ON j.posted_by = u.user_id
       WHERE j.job_id = ? AND j.is_active = TRUE`,
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Increment view count
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

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
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

    // Check if user owns this job
    const [jobs] = await db.query(
      'SELECT posted_by FROM jobs WHERE job_id = ?',
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (jobs[0].posted_by !== req.user.user_id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    // Handle empty date
    const deadline = application_deadline && application_deadline.trim() !== '' 
      ? application_deadline 
      : null;

    await db.query(
      `UPDATE jobs SET
        company_name = COALESCE(?, company_name),
        job_title = COALESCE(?, job_title),
        job_description = COALESCE(?, job_description),
        job_type = COALESCE(?, job_type),
        experience_level = COALESCE(?, experience_level),
        location = ?,
        is_remote = COALESCE(?, is_remote),
        salary_range = ?,
        skills_required = ?,
        application_deadline = ?,
        application_url = ?
       WHERE job_id = ?`,
      [
        company_name,
        job_title,
        job_description,
        job_type,
        experience_level,
        location,
        is_remote,
        salary_range,
        skills_required,
        deadline,
        application_url,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Job updated successfully'
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
      error: error.message
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const [jobs] = await db.query(
      'SELECT posted_by FROM jobs WHERE job_id = ?',
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (jobs[0].posted_by !== req.user.user_id && req.user.role !== 'super_admin') {
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

// @desc    Apply for job
// @route   POST /api/jobs/:id/apply
// @access  Private
exports.applyForJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { cover_letter } = req.body;

    // Check if job exists
    const [jobs] = await db.query(
      'SELECT job_id FROM jobs WHERE job_id = ? AND is_active = TRUE',
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if already applied
    const [existing] = await db.query(
      'SELECT application_id FROM job_applications WHERE job_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Get resume URL from uploaded file or use existing
    const resume_url = req.file ? `/uploads/resumes/${req.file.filename}` : null;

    if (!resume_url && !req.user.resume_url) {
      return res.status(400).json({
        success: false,
        message: 'Resume is required for job application'
      });
    }

    const finalResumeUrl = resume_url || req.user.resume_url;

    await db.query(
      'INSERT INTO job_applications (job_id, user_id, cover_letter, resume_url) VALUES (?, ?, ?, ?)',
      [id, req.user.user_id, cover_letter, finalResumeUrl]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

// @desc    Get my job applications
// @route   GET /api/jobs/my-applications
// @access  Private
exports.getMyApplications = async (req, res) => {
  try {
    const [applications] = await db.query(
      `SELECT ja.*, j.job_title, j.company_name, j.location, j.job_type,
              u.first_name as poster_first_name, u.last_name as poster_last_name
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.job_id
       JOIN users u ON j.posted_by = u.user_id
       WHERE ja.user_id = ?
       ORDER BY ja.applied_at DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// @desc    Get applications for my job postings
// @route   GET /api/jobs/:id/applications
// @access  Private
exports.getJobApplications = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns this job
    const [jobs] = await db.query(
      'SELECT posted_by FROM jobs WHERE job_id = ?',
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (jobs[0].posted_by !== req.user.user_id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view applications'
      });
    }

    const [applications] = await db.query(
      `SELECT ja.*, 
              u.first_name, u.last_name, u.email, u.phone, u.profile_picture,
              u.current_city, u.current_country
       FROM job_applications ja
       JOIN users u ON ja.user_id = u.user_id
       WHERE ja.job_id = ?
       ORDER BY ja.applied_at DESC`,
      [id]
    );

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// @desc    Update application status
// @route   PATCH /api/jobs/applications/:id/status
// @access  Private
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['applied', 'shortlisted', 'interviewed', 'offered', 'rejected', 'withdrawn'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if user owns the job this application belongs to
    const [applications] = await db.query(
      `SELECT ja.application_id, j.posted_by 
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.job_id
       WHERE ja.application_id = ?`,
      [id]
    );

    if (!applications.length) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (applications[0].posted_by !== req.user.user_id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    await db.query(
      'UPDATE job_applications SET status = ? WHERE application_id = ?',
      [status, id]
    );

    res.json({
      success: true,
      message: 'Application status updated successfully'
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

// @desc    Refer for job - MISSING FUNCTION
// @route   POST /api/jobs/:id/refer
// @access  Private
exports.referForJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { referred_email, message } = req.body;

    // Check if job exists
    const [jobs] = await db.query(
      'SELECT job_id, job_title, company_name FROM jobs WHERE job_id = ? AND is_active = TRUE',
      [id]
    );

    if (!jobs.length) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Create job referral record
    await db.query(
      'INSERT INTO job_referrals (job_id, referrer_id, referred_email, message) VALUES (?, ?, ?, ?)',
      [id, req.user.user_id, referred_email, message]
    );

    res.status(201).json({
      success: true,
      message: 'Job referral sent successfully'
    });
  } catch (error) {
    console.error('Refer for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send job referral',
      error: error.message
    });
  }
};

// @desc    Create job alert - MISSING FUNCTION
// @route   POST /api/jobs/alerts
// @access  Private
exports.createJobAlert = async (req, res) => {
  try {
    const { keywords, job_type, location, is_remote, frequency } = req.body;

    if (!keywords) {
      return res.status(400).json({
        success: false,
        message: 'Keywords are required for job alert'
      });
    }

    await db.query(
      'INSERT INTO job_alerts (user_id, keywords, job_type, location, is_remote, frequency) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.user_id, keywords, job_type, location, is_remote || false, frequency || 'daily']
    );

    res.status(201).json({
      success: true,
      message: 'Job alert created successfully'
    });
  } catch (error) {
    console.error('Create job alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job alert',
      error: error.message
    });
  }
};

// @desc    Get companies with alumni - MISSING FUNCTION
// @route   GET /api/jobs/companies/alumni
// @access  Private
exports.getCompaniesWithAlumni = async (req, res) => {
  try {
    const [companies] = await db.query(
      `SELECT DISTINCT we.company_name, COUNT(DISTINCT we.user_id) as alumni_count
       FROM work_experience we
       JOIN users u ON we.user_id = u.user_id
       WHERE u.is_active = TRUE AND we.company_name IS NOT NULL
       GROUP BY we.company_name
       HAVING alumni_count > 0
       ORDER BY alumni_count DESC
       LIMIT 50`
    );

    res.json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Get companies with alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
};