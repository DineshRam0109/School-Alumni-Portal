const db = require('../config/database');
const { getFileUrl } = require('../utils/profilePictureUtils');

// @desc    Advanced alumni search - EXCLUDE CURRENT USER
// @route   GET /api/search/alumni
// @access  Private
// @desc    Advanced alumni search - EXCLUDE CURRENT USER
// @route   GET /api/search/alumni
// @access  Private
exports.searchAlumni = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      school_id,
      batch_year,
      city,
      country,
      company,
      profession,
      degree_level
    } = req.query;
    
    const offset = (page - 1) * limit;
    const currentUserId = req.user.user_id;

    // DEBUG: Log the request
    console.log('Search request:', { 
      user: req.user.user_id, 
      role: req.user.role,
      filters: { search, school_id, batch_year, city, country, company, profession, degree_level }
    });

    // Base query - Get DISTINCT users (avoid duplicates for multiple schools)
    // EXCLUDE CURRENT USER
    let query = `
      SELECT DISTINCT
        u.user_id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.profile_picture,
        u.current_city, 
        u.current_country, 
        u.bio,
        u.linkedin_url
      FROM users u
      WHERE u.is_active = TRUE
        AND u.role = 'alumni'
        AND u.user_id != ?
    `;

    const params = [currentUserId];
    const conditions = [];

    // Name search
    if (search && search.trim()) {
      conditions.push(`(u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)`);
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Location filters
    if (city && city.trim()) {
      conditions.push(`u.current_city = ?`);
      params.push(city.trim());
    }

    if (country && country.trim()) {
      conditions.push(`u.current_country = ?`);
      params.push(country.trim());
    }

    // Education filters - FIXED: Better handling of optional filters
    if (school_id || batch_year || degree_level) {
      let eduSubquery = `u.user_id IN (
        SELECT DISTINCT ae.user_id 
        FROM alumni_education ae
        WHERE ae.is_verified = TRUE`;
      
      const eduConditions = [];
      
      if (school_id) {
        eduConditions.push(`ae.school_id = ?`);
        params.push(parseInt(school_id));
      }
      if (batch_year) {
        eduConditions.push(`ae.end_year = ?`);
        params.push(parseInt(batch_year));
      }
      if (degree_level) {
        eduConditions.push(`ae.degree_level = ?`);
        params.push(degree_level);
      }
      
      if (eduConditions.length > 0) {
        eduSubquery += ` AND ` + eduConditions.join(' AND ');
      }
      eduSubquery += `)`;
      conditions.push(eduSubquery);
    }

    // Work filters - FIXED: Better handling of optional filters
    if (company || profession) {
      let workSubquery = `u.user_id IN (
        SELECT DISTINCT we.user_id 
        FROM work_experience we
        WHERE we.is_current = TRUE`;
      
      const workConditions = [];
      
      if (company && company.trim()) {
        workConditions.push(`we.company_name LIKE ?`);
        params.push(`%${company.trim()}%`);
      }
      if (profession && profession.trim()) {
        workConditions.push(`(we.position LIKE ? OR we.industry LIKE ?)`);
        params.push(`%${profession.trim()}%`, `%${profession.trim()}%`);
      }
      
      if (workConditions.length > 0) {
        workSubquery += ` AND ` + workConditions.join(' AND ');
      }
      workSubquery += `)`;
      conditions.push(workSubquery);
    }

    // Add conditions to query
    if (conditions.length > 0) {
      query += ` AND ` + conditions.join(' AND ');
    }

    query += ` ORDER BY u.first_name ASC, u.last_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('SQL Query:', query);
    console.log('SQL Params:', params);

    const [users] = await db.query(query, params);

    // Get details for each user
    const alumni = await Promise.all(users.map(async (user) => {
      try {
        let primaryEducationQuery = `
          SELECT ae.*, s.school_name, s.city as school_city
          FROM alumni_education ae
          INNER JOIN schools s ON ae.school_id = s.school_id
          WHERE ae.user_id = ? AND ae.is_verified = TRUE
        `;
        const eduParams = [user.user_id];
        
        if (school_id) {
          primaryEducationQuery += ` ORDER BY (ae.school_id = ?) DESC, ae.end_year DESC LIMIT 1`;
          eduParams.push(parseInt(school_id));
        } else {
          primaryEducationQuery += ` ORDER BY ae.end_year DESC LIMIT 1`;
        }
        
        const [primaryEducation] = await db.query(primaryEducationQuery, eduParams);

        const [allSchools] = await db.query(
          `SELECT s.school_name, ae.start_year, ae.end_year, ae.degree_level
           FROM alumni_education ae
           INNER JOIN schools s ON ae.school_id = s.school_id
           WHERE ae.user_id = ? AND ae.is_verified = TRUE
           ORDER BY ae.start_year`,
          [user.user_id]
        );

        const [work] = await db.query(
          `SELECT company_name, position, industry, location
           FROM work_experience
           WHERE user_id = ? AND is_current = TRUE
           ORDER BY start_date DESC
           LIMIT 1`,
          [user.user_id]
        );

        return {
          ...user,
          profile_picture: user.profile_picture 
            ? `${req.protocol}://${req.get('host')}/uploads/${user.profile_picture.replace(/^uploads\//, '')}`
            : null,
          school_name: primaryEducation[0]?.school_name || null,
          school_city: primaryEducation[0]?.school_city || null,
          start_year: primaryEducation[0]?.start_year || null,
          end_year: primaryEducation[0]?.end_year || null,
          degree_level: primaryEducation[0]?.degree_level || null,
          field_of_study: primaryEducation[0]?.field_of_study || null,
          all_schools: allSchools || [],
          schools_count: allSchools?.length || 0,
          company_name: work[0]?.company_name || null,
          position: work[0]?.position || null,
          industry: work[0]?.industry || null,
          work_location: work[0]?.location || null
        };
      } catch (error) {
        console.error(`Error fetching details for user ${user.user_id}:`, error);
        return {
          ...user,
          profile_picture: null,
          all_schools: [],
          schools_count: 0
        };
      }
    }));

    // Get total count (same filters, exclude current user)
    let countQuery = `
      SELECT COUNT(DISTINCT u.user_id) as total
      FROM users u
      WHERE u.is_active = TRUE
        AND u.role = 'alumni'
        AND u.user_id != ?
    `;

    const countParams = [currentUserId];
    const countConditions = [];

    // Replicate the same conditions for count
    if (search && search.trim()) {
      countConditions.push(`(u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)`);
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (city && city.trim()) {
      countConditions.push(`u.current_city = ?`);
      countParams.push(city.trim());
    }

    if (country && country.trim()) {
      countConditions.push(`u.current_country = ?`);
      countParams.push(country.trim());
    }

    if (school_id || batch_year || degree_level) {
      let eduSubquery = `u.user_id IN (SELECT DISTINCT ae.user_id FROM alumni_education ae WHERE ae.is_verified = TRUE`;
      const eduConditions = [];
      
      if (school_id) {
        eduConditions.push(`ae.school_id = ?`);
        countParams.push(parseInt(school_id));
      }
      if (batch_year) {
        eduConditions.push(`ae.end_year = ?`);
        countParams.push(parseInt(batch_year));
      }
      if (degree_level) {
        eduConditions.push(`ae.degree_level = ?`);
        countParams.push(degree_level);
      }
      
      if (eduConditions.length > 0) {
        eduSubquery += ` AND ` + eduConditions.join(' AND ');
      }
      eduSubquery += `)`;
      countConditions.push(eduSubquery);
    }

    if (company || profession) {
      let workSubquery = `u.user_id IN (SELECT DISTINCT we.user_id FROM work_experience we WHERE we.is_current = TRUE`;
      const workConditions = [];
      
      if (company && company.trim()) {
        workConditions.push(`we.company_name LIKE ?`);
        countParams.push(`%${company.trim()}%`);
      }
      if (profession && profession.trim()) {
        workConditions.push(`(we.position LIKE ? OR we.industry LIKE ?)`);
        countParams.push(`%${profession.trim()}%`, `%${profession.trim()}%`);
      }
      
      if (workConditions.length > 0) {
        workSubquery += ` AND ` + workConditions.join(' AND ');
      }
      workSubquery += `)`;
      countConditions.push(workSubquery);
    }

    if (countConditions.length > 0) {
      countQuery += ` AND ` + countConditions.join(' AND ');
    }

    console.log('Count Query:', countQuery);
    console.log('Count Params:', countParams);

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      alumni,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Search alumni error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search alumni',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Find batch-mates - EXCLUDE CURRENT USER
// @route   GET /api/search/batch-mates
// @access  Private
exports.findBatchMates = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;

    const [myEducation] = await db.query(
      `SELECT school_id, start_year, end_year, degree_level 
       FROM alumni_education 
       WHERE user_id = ? AND is_verified = TRUE`,
      [currentUserId]
    );

    if (!myEducation.length) {
      return res.json({
        success: true,
        batch_mates: [],
        message: 'No verified education records found'
      });
    }

    const batchMates = [];
    const seenUserIds = new Set();

    for (const edu of myEducation) {
      const [mates] = await db.query(
        `SELECT DISTINCT 
          u.user_id, 
          u.first_name, 
          u.last_name, 
          u.profile_picture,
          u.current_city,
          u.current_country,
          ae.start_year, 
          ae.end_year,
          ae.degree_level,
          s.school_name
         FROM users u
         INNER JOIN alumni_education ae ON u.user_id = ae.user_id
         INNER JOIN schools s ON ae.school_id = s.school_id
         WHERE ae.school_id = ? 
           AND ae.start_year = ? 
           AND ae.end_year = ?
           AND u.user_id != ?
           AND u.is_active = TRUE
           AND u.role = 'alumni'
           AND ae.is_verified = TRUE
         ORDER BY u.first_name ASC, u.last_name ASC`,
        [edu.school_id, edu.start_year, edu.end_year, currentUserId]
      );

      for (const mate of mates) {
        if (!seenUserIds.has(mate.user_id)) {
          seenUserIds.add(mate.user_id);
          
          const [work] = await db.query(
            `SELECT company_name, position, industry 
             FROM work_experience 
             WHERE user_id = ? AND is_current = TRUE 
             ORDER BY start_date DESC
             LIMIT 1`,
            [mate.user_id]
          );
          
          batchMates.push({
            ...mate,
            company_name: work[0]?.company_name || null,
            position: work[0]?.position || null,
            industry: work[0]?.industry || null
          });
        }
      }
    }

    res.json({
      success: true,
      batch_mates: batchMates,
      count: batchMates.length
    });
  } catch (error) {
    console.error('Find batch-mates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find batch-mates',
      error: error.message
    });
  }
};

exports.getSearchFilters = async (req, res) => {
  try {
    console.log('Fetching search filters...');
    
    const [schools, cities, countries, companies, batchYears] = await Promise.all([
      // Get schools with alumni count (don't filter by current user)
      db.query(
        `SELECT 
          s.school_id, 
          s.school_name,
          s.city as school_city,
          COUNT(DISTINCT ae.user_id) as alumni_count
         FROM schools s
         LEFT JOIN alumni_education ae ON s.school_id = ae.school_id
         LEFT JOIN users u ON ae.user_id = u.user_id 
         WHERE s.is_active = TRUE
         GROUP BY s.school_id, s.school_name, s.city
         ORDER BY s.school_name ASC`
      ),
      
      // Get all cities where alumni are located
      db.query(
        `SELECT DISTINCT u.current_city
         FROM users u
         WHERE u.current_city IS NOT NULL 
           AND u.current_city != ''
           AND u.is_active = TRUE 
           AND u.role = 'alumni'
         ORDER BY u.current_city ASC
         LIMIT 200`
      ),
      
      // Get all countries
      db.query(
        `SELECT DISTINCT u.current_country
         FROM users u
         WHERE u.current_country IS NOT NULL 
           AND u.current_country != ''
           AND u.is_active = TRUE 
           AND u.role = 'alumni'
         ORDER BY u.current_country ASC`
      ),
      
      // Get companies
      db.query(
        `SELECT DISTINCT we.company_name, COUNT(DISTINCT we.user_id) as employee_count
         FROM work_experience we
         INNER JOIN users u ON we.user_id = u.user_id
         WHERE we.company_name IS NOT NULL 
           AND we.company_name != ''
           AND we.is_current = TRUE 
           AND u.role = 'alumni'
           AND u.is_active = TRUE
         GROUP BY we.company_name
         ORDER BY employee_count DESC, we.company_name ASC
         LIMIT 200`
      ),
      
      // Get batch years
      db.query(
        `SELECT DISTINCT ae.end_year, COUNT(DISTINCT ae.user_id) as count
         FROM alumni_education ae
         INNER JOIN users u ON ae.user_id = u.user_id
         WHERE ae.end_year IS NOT NULL 
           AND u.role = 'alumni'
           AND u.is_active = TRUE
         GROUP BY ae.end_year
         ORDER BY ae.end_year DESC`
      )
    ]);

    console.log('Schools found:', schools[0].length);
    console.log('Cities found:', cities[0].length);
    console.log('Countries found:', countries[0].length);
    console.log('Companies found:', companies[0].length);
    console.log('Batch years found:', batchYears[0].length);

    res.json({
      success: true,
      filters: {
        schools: schools[0],
        cities: cities[0].map(c => c.current_city),
        countries: countries[0].map(c => c.current_country),
        companies: companies[0].map(c => c.company_name),
        batch_years: batchYears[0].map(b => b.end_year),
        degree_levels: [
          { value: 'primary', label: 'Primary' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'higher_secondary', label: 'Higher Secondary' },
          { value: 'diploma', label: 'Diploma' },
          { value: 'undergraduate', label: 'Undergraduate' },
          { value: 'postgraduate', label: 'Postgraduate' },
          { value: 'doctorate', label: 'Doctorate' }
        ]
      }
    });
  } catch (error) {
    console.error('Get search filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search filters',
      error: error.message
    });
  }
};