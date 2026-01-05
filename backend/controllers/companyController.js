const db = require('../config/database');
const { getAvatarUrl } = require('../utils/profilePictureUtils');

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

exports.getCompanyAlumni = async (req, res) => {
  try {
    const { companyName } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const decodedCompanyName = decodeURIComponent(companyName);

    const [alumni] = await db.query(
      `SELECT DISTINCT
        u.user_id, 
        u.first_name, 
        u.last_name, 
        u.profile_picture, 
        u.email,
        u.current_city, 
        u.current_country,
        we.position, 
        we.start_date, 
        we.is_current,
        (
          SELECT s.school_name
          FROM alumni_education ae2
          JOIN schools s ON ae2.school_id = s.school_id
          WHERE ae2.user_id = u.user_id
          ORDER BY ae2.end_year DESC
          LIMIT 1
        ) AS school_name,
        (
          SELECT ae2.end_year
          FROM alumni_education ae2
          WHERE ae2.user_id = u.user_id
          ORDER BY ae2.end_year DESC
          LIMIT 1
        ) AS end_year
      FROM users u
      JOIN work_experience we ON u.user_id = we.user_id
      WHERE LOWER(we.company_name) = LOWER(?)
        AND u.is_active = TRUE
      ORDER BY we.is_current DESC, we.start_date DESC
      LIMIT ? OFFSET ?`,
      [decodedCompanyName, limitNum, offset]
    );

    const formattedAlumni = alumni.map(a => ({
  ...a,
  profile_picture: a.profile_picture ? getAvatarUrl(a.profile_picture) : null
}));

    const [[countResult]] = await db.query(
      `SELECT COUNT(DISTINCT u.user_id) AS total
       FROM users u
       JOIN work_experience we ON u.user_id = we.user_id
       WHERE LOWER(we.company_name) = LOWER(?)
         AND u.is_active = TRUE`,
      [decodedCompanyName]
    );

    const [stats] = await db.query(
      `SELECT 
        we.industry,
        COUNT(DISTINCT CASE WHEN we.is_current = TRUE THEN we.user_id END) AS current_employees,
        COUNT(DISTINCT CASE WHEN we.is_current = FALSE THEN we.user_id END) AS past_employees,
        GROUP_CONCAT(DISTINCT we.position SEPARATOR ', ') AS positions
      FROM work_experience we
      WHERE LOWER(we.company_name) = LOWER(?)
        AND we.industry IS NOT NULL
      GROUP BY we.industry`,
      [decodedCompanyName]
    );

    res.json({
      success: true,
      company_name: decodedCompanyName,
      stats: stats[0] || {},
      alumni: formattedAlumni,
      pagination: {
        total: countResult.total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(countResult.total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get company alumni error:', error);
    res.status(500).json({
      success: false,
      message: error.message
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