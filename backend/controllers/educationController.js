const db = require('../config/database');

// @desc    Add education
// @route   POST /api/education
// @access  Private
exports.addEducation = async (req, res) => {
  try {
    const { school_id, degree_level, field_of_study, start_year, end_year } = req.body;

    if (!school_id || !start_year || !end_year) {
      return res.status(400).json({
        success: false,
        message: 'School, start year, and end year are required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO alumni_education (user_id, school_id, degree_level, field_of_study, start_year, end_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, school_id, degree_level || 'secondary', field_of_study, start_year, end_year]
    );

    res.status(201).json({
      success: true,
      message: 'Education added successfully',
      education_id: result.insertId
    });
  } catch (error) {
    console.error('Add education error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add education'
    });
  }
};

// @desc    Get my education
// @route   GET /api/education/my
// @access  Private
exports.getMyEducation = async (req, res) => {
  try {
    const [education] = await db.query(
      `SELECT ae.*, s.school_name, s.city, s.logo
       FROM alumni_education ae
       JOIN schools s ON ae.school_id = s.school_id
       WHERE ae.user_id = ?
       ORDER BY ae.start_year DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      education
    });
  } catch (error) {
    console.error('Get education error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch education'
    });
  }
};

// @desc    Update education
// @route   PUT /api/education/:id
// @access  Private
exports.updateEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id, degree_level, field_of_study, start_year, end_year } = req.body;

    await db.query(
      `UPDATE alumni_education SET
        school_id = COALESCE(?, school_id),
        degree_level = COALESCE(?, degree_level),
        field_of_study = COALESCE(?, field_of_study),
        start_year = COALESCE(?, start_year),
        end_year = COALESCE(?, end_year)
       WHERE education_id = ? AND user_id = ?`,
      [school_id, degree_level, field_of_study, start_year, end_year, id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Education updated successfully'
    });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update education'
    });
  }
};

// @desc    Delete education
// @route   DELETE /api/education/:id
// @access  Private
exports.deleteEducation = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM alumni_education WHERE education_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Education deleted successfully'
    });
  } catch (error) {
    console.error('Delete education error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete education'
    });
  }
};