const db = require('../config/database');

// @desc    Add work experience
// @route   POST /api/work
// @access  Private
exports.addWorkExperience = async (req, res) => {
  try {
    const {
      company_name,
      position,
      location,
      employment_type,
      industry,
      start_date,
      end_date,
      is_current,
      description
    } = req.body;

    if (!company_name || !position || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Company name, position, and start date are required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO work_experience (user_id, company_name, position, location, employment_type, industry, start_date, end_date, is_current, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        company_name,
        position,
        location,
        employment_type || 'full_time',
        industry,
        start_date,
        end_date || null,
        is_current || false,
        description
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Work experience added successfully',
      experience_id: result.insertId
    });
  } catch (error) {
    console.error('Add work experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add work experience'
    });
  }
};

// @desc    Get my work experience
// @route   GET /api/work/my
// @access  Private
exports.getMyWorkExperience = async (req, res) => {
  try {
    const [work] = await db.query(
      `SELECT * FROM work_experience 
       WHERE user_id = ? 
       ORDER BY start_date DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      work_experience: work
    });
  } catch (error) {
    console.error('Get work experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work experience'
    });
  }
};

// @desc    Update work experience
// @route   PUT /api/work/:id
// @access  Private
exports.updateWorkExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_name,
      position,
      location,
      employment_type,
      industry,
      start_date,
      end_date,
      is_current,
      description
    } = req.body;

    await db.query(
      `UPDATE work_experience SET
        company_name = COALESCE(?, company_name),
        position = COALESCE(?, position),
        location = COALESCE(?, location),
        employment_type = COALESCE(?, employment_type),
        industry = COALESCE(?, industry),
        start_date = COALESCE(?, start_date),
        end_date = ?,
        is_current = COALESCE(?, is_current),
        description = COALESCE(?, description)
       WHERE experience_id = ? AND user_id = ?`,
      [
        company_name,
        position,
        location,
        employment_type,
        industry,
        start_date,
        end_date,
        is_current,
        description,
        id,
        req.user.user_id
      ]
    );

    res.json({
      success: true,
      message: 'Work experience updated successfully'
    });
  } catch (error) {
    console.error('Update work experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update work experience'
    });
  }
};

// @desc    Delete work experience
// @route   DELETE /api/work/:id
// @access  Private
exports.deleteWorkExperience = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM work_experience WHERE experience_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Work experience deleted successfully'
    });
  } catch (error) {
    console.error('Delete work experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete work experience'
    });
  }
};