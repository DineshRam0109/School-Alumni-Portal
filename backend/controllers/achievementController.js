const db = require('../config/database');

// @desc    Add achievement
// @route   POST /api/achievements
// @access  Private
exports.addAchievement = async (req, res) => {
  try {
    const { title, description, achievement_date, category } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO achievements (user_id, title, description, achievement_date, category)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.user_id, title, description, achievement_date, category]
    );

    res.status(201).json({
      success: true,
      message: 'Achievement added successfully',
      achievement_id: result.insertId
    });
  } catch (error) {
    console.error('Add achievement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add achievement'
    });
  }
};

// @desc    Get my achievements
// @route   GET /api/achievements/my
// @access  Private
exports.getMyAchievements = async (req, res) => {
  try {
    const [achievements] = await db.query(
      `SELECT * FROM achievements 
       WHERE user_id = ? 
       ORDER BY achievement_date DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      achievements
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements'
    });
  }
};

// @desc    Update achievement
// @route   PUT /api/achievements/:id
// @access  Private
exports.updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, achievement_date, category } = req.body;

    await db.query(
      `UPDATE achievements SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        achievement_date = COALESCE(?, achievement_date),
        category = COALESCE(?, category)
       WHERE achievement_id = ? AND user_id = ?`,
      [title, description, achievement_date, category, id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Achievement updated successfully'
    });
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update achievement'
    });
  }
};

// @desc    Delete achievement
// @route   DELETE /api/achievements/:id
// @access  Private
exports.deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'DELETE FROM achievements WHERE achievement_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Achievement deleted successfully'
    });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete achievement'
    });
  }
};