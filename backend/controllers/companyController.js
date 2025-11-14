const db = require('../config/database');

// @desc    Get all companies with alumni count
// @route   GET /api/companies
// @access  Private
exports.getAllCompanies = async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    let query = `
      SELECT 
        we.company_name,
        we.industry,
        COUNT(DISTINCT we.user_id) as alumni_count,
        GROUP_CONCAT(DISTINCT we.position SEPARATOR ', ') as positions
      FROM work_experience we
      WHERE we.is_current = TRUE
    `;
    const params = [];

    if (search) {
      query += ` AND we.company_name LIKE ?`;
      params.push(`%${search}%`);
    }

    query += `
      GROUP BY we.company_name, we.industry
      ORDER BY alumni_count DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [companies] = await db.query(query, params);

    res.json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies'
    });
  }
};

// @desc    Get alumni by company
// @route   GET /api/companies/:companyName/alumni
// @access  Private
exports.getCompanyAlumni = async (req, res) => {
  try {
    const { companyName } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [alumni] = await db.query(
      `SELECT 
        u.user_id, u.first_name, u.last_name, u.profile_picture, u.email,
        u.current_city, u.current_country,
        we.position, we.start_date, we.is_current,
        ae.school_name, ae.end_year
       FROM users u
       JOIN work_experience we ON u.user_id = we.user_id
       LEFT JOIN (
         SELECT ae.user_id, s.school_name, ae.end_year
         FROM alumni_education ae
         JOIN schools s ON ae.school_id = s.school_id
         ORDER BY ae.end_year DESC
         LIMIT 1
       ) ae ON u.user_id = ae.user_id
       WHERE we.company_name = ? AND u.is_active = TRUE
       ORDER BY we.is_current DESC, we.start_date DESC
       LIMIT ? OFFSET ?`,
      [companyName, parseInt(limit), offset]
    );

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(DISTINCT u.user_id) as total
       FROM users u
       JOIN work_experience we ON u.user_id = we.user_id
       WHERE we.company_name = ? AND u.is_active = TRUE`,
      [companyName]
    );

    // Get company stats
    const [stats] = await db.query(
      `SELECT 
        we.industry,
        COUNT(DISTINCT CASE WHEN we.is_current = TRUE THEN we.user_id END) as current_employees,
        COUNT(DISTINCT CASE WHEN we.is_current = FALSE THEN we.user_id END) as past_employees,
        GROUP_CONCAT(DISTINCT we.position SEPARATOR ', ') as positions
       FROM work_experience we
       WHERE we.company_name = ?
       GROUP BY we.industry`,
      [companyName]
    );

    res.json({
      success: true,
      company_name: companyName,
      stats: stats[0] || {},
      alumni,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get company alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company alumni'
    });
  }
};

// @desc    Get industry-wise alumni distribution
// @route   GET /api/companies/industries
// @access  Private
exports.getIndustryDistribution = async (req, res) => {
  try {
    const [industries] = await db.query(
      `SELECT 
        we.industry,
        COUNT(DISTINCT we.user_id) as alumni_count,
        COUNT(DISTINCT we.company_name) as company_count
       FROM work_experience we
       WHERE we.is_current = TRUE AND we.industry IS NOT NULL
       GROUP BY we.industry
       ORDER BY alumni_count DESC`
    );

    res.json({
      success: true,
      industries
    });
  } catch (error) {
    console.error('Get industries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch industries'
    });
  }
};