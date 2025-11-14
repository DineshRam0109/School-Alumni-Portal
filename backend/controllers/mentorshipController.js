const db = require('../config/database');

// @desc    Request mentorship
// @route   POST /api/mentorship/request
// @access  Private
exports.requestMentorship = async (req, res) => {
  try {
    const { mentor_id, area_of_guidance } = req.body;

    if (!mentor_id) {
      return res.status(400).json({
        success: false,
        message: 'Mentor ID is required'
      });
    }

    // Check if already requested
    const [existing] = await db.query(
      'SELECT * FROM mentorship WHERE mentor_id = ? AND mentee_id = ? AND status IN ("requested", "active")',
      [mentor_id, req.user.user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mentorship request already exists'
      });
    }

    await db.query(
      'INSERT INTO mentorship (mentor_id, mentee_id, area_of_guidance, status) VALUES (?, ?, ?, ?)',
      [mentor_id, req.user.user_id, area_of_guidance, 'requested']
    );

    // Create notification
    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id)
       VALUES (?, 'mentorship', 'New Mentorship Request', ?, ?)`,
      [mentor_id, `${req.user.first_name} ${req.user.last_name} requested mentorship`, req.user.user_id]
    );

    res.status(201).json({
      success: true,
      message: 'Mentorship request sent successfully'
    });
  } catch (error) {
    console.error('Request mentorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send mentorship request'
    });
  }
};

// @desc    Get my mentorships as mentor
// @route   GET /api/mentorship/as-mentor
// @access  Private
exports.getMentorshipsAsMentor = async (req, res) => {
  try {
    const [mentorships] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.profile_picture, u.email
       FROM mentorship m
       JOIN users u ON m.mentee_id = u.user_id
       WHERE m.mentor_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      mentorships
    });
  } catch (error) {
    console.error('Get mentorships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentorships'
    });
  }
};

// @desc    Get my mentorships as mentee
// @route   GET /api/mentorship/as-mentee
// @access  Private
exports.getMentorshipsAsMentee = async (req, res) => {
  try {
    const [mentorships] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.profile_picture, u.email
       FROM mentorship m
       JOIN users u ON m.mentor_id = u.user_id
       WHERE m.mentee_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      mentorships
    });
  } catch (error) {
    console.error('Get mentorships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentorships'
    });
  }
};

// @desc    Accept mentorship
// @route   PUT /api/mentorship/:id/accept
// @access  Private
exports.acceptMentorship = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE mentorship SET status = "active", start_date = NOW() WHERE mentorship_id = ? AND mentor_id = ?',
      [id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Mentorship accepted'
    });
  } catch (error) {
    console.error('Accept mentorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept mentorship'
    });
  }
};

// @desc    Reject mentorship
// @route   PUT /api/mentorship/:id/reject
// @access  Private
exports.rejectMentorship = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE mentorship SET status = "cancelled" WHERE mentorship_id = ? AND mentor_id = ?',
      [id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Mentorship rejected'
    });
  } catch (error) {
    console.error('Reject mentorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject mentorship'
    });
  }
};

// @desc    Complete mentorship
// @route   PUT /api/mentorship/:id/complete
// @access  Private
exports.completeMentorship = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE mentorship SET status = "completed", end_date = NOW() WHERE mentorship_id = ? AND (mentor_id = ? OR mentee_id = ?)',
      [id, req.user.user_id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Mentorship marked as completed'
    });
  } catch (error) {
    console.error('Complete mentorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete mentorship'
    });
  }
};