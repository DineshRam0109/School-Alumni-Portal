// controllers/mentorshipController.js
const db = require('../config/database');
const { getAvatarUrl } = require('../utils/profilePictureUtils');
const {
  sendMentorshipRequestEmail,
  sendMentorshipAcceptedEmail,
  sendMentorshipRejectedEmail,
  sendMentorshipCompletedEmail,
  sendSessionScheduledEmail
} = require('../utils/emailService');

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

    if (!area_of_guidance || !area_of_guidance.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Area of guidance is required'
      });
    }

    if (mentor_id === req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request mentorship from yourself'
      });
    }

    const [mentorCheck] = await db.query(
      'SELECT user_id, first_name, last_name, email FROM users WHERE user_id = ? AND is_active = TRUE',
      [mentor_id]
    );

    if (mentorCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    const [existing] = await db.query(
      'SELECT * FROM mentorship WHERE mentor_id = ? AND mentee_id = ? AND status IN ("requested", "active")',
      [mentor_id, req.user.user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: existing[0].status === 'requested' 
          ? 'You already have a pending mentorship request with this mentor'
          : 'You already have an active mentorship with this mentor'
      });
    }

    const [result] = await db.query(
      'INSERT INTO mentorship (mentor_id, mentee_id, area_of_guidance, status) VALUES (?, ?, ?, ?)',
      [mentor_id, req.user.user_id, area_of_guidance.trim(), 'requested']
    );

    const mentorshipId = result.insertId;

    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id) 
       VALUES (?, 'mentorship', 'New Mentorship Request', ?, ?)`,
      [
        mentor_id, 
        `${req.user.first_name} ${req.user.last_name} requested mentorship in: ${area_of_guidance.trim()}`, 
        mentorshipId
      ]
    );

    // ✅ SEND EMAIL
    try {
      await sendMentorshipRequestEmail(
        mentorCheck[0].email,
        `${mentorCheck[0].first_name} ${mentorCheck[0].last_name}`,
        `${req.user.first_name} ${req.user.last_name}`,
        req.user.user_id,
        area_of_guidance.trim(),
        mentorshipId
      );
          } catch (emailError) {
      console.error('❌ Mentorship request email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Mentorship request sent successfully',
      mentorship_id: mentorshipId
    });
  } catch (error) {
    console.error('Request mentorship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send mentorship request'
    });
  }
};




exports.getMentorshipsAsMentor = async (req, res) => {
  try {
    const [mentorships] = await db.query(
      `SELECT m.*, 
              u.first_name, u.last_name, u.profile_picture, u.email, 
              u.position, u.company_name, u.current_city, u.bio,
              s.school_name, ae.end_year
       FROM mentorship m
       JOIN users u ON m.mentee_id = u.user_id
       LEFT JOIN alumni_education ae ON u.user_id = ae.user_id AND ae.is_verified = TRUE
       LEFT JOIN schools s ON ae.school_id = s.school_id
       WHERE m.mentor_id = ?
       ORDER BY 
         CASE m.status
           WHEN 'requested' THEN 1
           WHEN 'active' THEN 2
           WHEN 'completed' THEN 3
           ELSE 4
         END,
         m.created_at DESC`,
      [req.user.user_id]
    );

    const formattedMentorships = mentorships.map(m => ({
      ...m,
      profile_picture: m.profile_picture ? getAvatarUrl(m.profile_picture) : null  // Pass just the string
    }));

    res.json({
      success: true,
      mentorships: formattedMentorships
    });
  } catch (error) {
    console.error('Get mentorships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentorships'
    });
  }
};

exports.getMentorshipsAsMentee = async (req, res) => {
  try {
    const [mentorships] = await db.query(
      `SELECT m.*, 
              u.first_name, u.last_name, u.profile_picture, u.email, 
              u.position, u.company_name, u.current_city, u.bio,
              s.school_name, ae.end_year
       FROM mentorship m
       JOIN users u ON m.mentor_id = u.user_id
       LEFT JOIN alumni_education ae ON u.user_id = ae.user_id AND ae.is_verified = TRUE
       LEFT JOIN schools s ON ae.school_id = s.school_id
       WHERE m.mentee_id = ?
       ORDER BY 
         CASE m.status
           WHEN 'requested' THEN 1
           WHEN 'active' THEN 2
           WHEN 'completed' THEN 3
           ELSE 4
         END,
         m.created_at DESC`,
      [req.user.user_id]
    );

    const formattedMentorships = mentorships.map(m => ({
      ...m,
      profile_picture: m.profile_picture ? getAvatarUrl(m.profile_picture) : null  // Pass just the string
    }));

    res.json({
      success: true,
      mentorships: formattedMentorships
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

    const [mentorship] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.email 
       FROM mentorship m
       JOIN users u ON m.mentee_id = u.user_id
       WHERE m.mentorship_id = ? AND m.mentor_id = ?`,
      [id, req.user.user_id]
    );

    if (mentorship.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship request not found or you are not authorized'
      });
    }

    const mentorshipData = mentorship[0];

    if (mentorshipData.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept mentorship with status: ${mentorshipData.status}`
      });
    }

    await db.query(
      'UPDATE mentorship SET status = "active", start_date = NOW() WHERE mentorship_id = ?',
      [id]
    );

    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id) 
       VALUES (?, 'mentorship', 'Mentorship Request Accepted', ?, ?)`,
      [
        mentorshipData.mentee_id, 
        `${req.user.first_name} ${req.user.last_name} accepted your mentorship request!`, 
        id
      ]
    );

    // ✅ SEND EMAIL
    try {
      await sendMentorshipAcceptedEmail(
        mentorshipData.email,
        `${mentorshipData.first_name} ${mentorshipData.last_name}`,
        `${req.user.first_name} ${req.user.last_name}`,
        req.user.user_id,
        id
      );
          } catch (emailError) {
      console.error('❌ Mentorship accepted email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Mentorship request accepted successfully'
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

    const [mentorship] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.email 
       FROM mentorship m
       JOIN users u ON m.mentee_id = u.user_id
       WHERE m.mentorship_id = ? AND m.mentor_id = ?`,
      [id, req.user.user_id]
    );

    if (mentorship.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship request not found or you are not authorized'
      });
    }

    const mentorshipData = mentorship[0];

    await db.query(
      'UPDATE mentorship SET status = "cancelled" WHERE mentorship_id = ?',
      [id]
    );

    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id) 
       VALUES (?, 'mentorship', 'Mentorship Request Declined', ?, ?)`,
      [
        mentorshipData.mentee_id, 
        `${req.user.first_name} ${req.user.last_name} declined your mentorship request`, 
        id
      ]
    );

    // ✅ SEND EMAIL
    try {
      await sendMentorshipRejectedEmail(
        mentorshipData.email,
        `${mentorshipData.first_name} ${mentorshipData.last_name}`,
        `${req.user.first_name} ${req.user.last_name}`
      );
          } catch (emailError) {
      console.error('❌ Mentorship rejected email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Mentorship request declined'
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

    const [mentorship] = await db.query(
      `SELECT m.*, 
              mentor.first_name as mentor_first_name, mentor.last_name as mentor_last_name, mentor.email as mentor_email,
              mentee.first_name as mentee_first_name, mentee.last_name as mentee_last_name, mentee.email as mentee_email
       FROM mentorship m
       JOIN users mentor ON m.mentor_id = mentor.user_id
       JOIN users mentee ON m.mentee_id = mentee.user_id
       WHERE m.mentorship_id = ? AND (m.mentor_id = ? OR m.mentee_id = ?)`,
      [id, req.user.user_id, req.user.user_id]
    );

    if (mentorship.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship not found or you are not authorized'
      });
    }

    const mentorshipData = mentorship[0];

    if (mentorshipData.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active mentorships can be marked as completed'
      });
    }

    await db.query(
      'UPDATE mentorship SET status = "completed", end_date = NOW() WHERE mentorship_id = ?',
      [id]
    );

    const otherUserId = mentorshipData.mentor_id === req.user.user_id 
      ? mentorshipData.mentee_id 
      : mentorshipData.mentor_id;

    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id) 
       VALUES (?, 'mentorship', 'Mentorship Completed', ?, ?)`,
      [
        otherUserId, 
        `${req.user.first_name} ${req.user.last_name} marked your mentorship as completed`, 
        id
      ]
    );

    // ✅ SEND EMAILS TO BOTH
    try {
      // Email to mentor
      await sendMentorshipCompletedEmail(
        mentorshipData.mentor_email,
        `${mentorshipData.mentor_first_name} ${mentorshipData.mentor_last_name}`,
        `${mentorshipData.mentee_first_name} ${mentorshipData.mentee_last_name}`,
        id
      );
      // Email to mentee
      await sendMentorshipCompletedEmail(
        mentorshipData.mentee_email,
        `${mentorshipData.mentee_first_name} ${mentorshipData.mentee_last_name}`,
        `${mentorshipData.mentor_first_name} ${mentorshipData.mentor_last_name}`,
        id
      );
          } catch (emailError) {
      console.error('❌ Mentorship completed email failed:', emailError);
    }

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

// @desc    Get mentorship sessions
// @route   GET /api/mentorship/:id/sessions
// @access  Private
exports.getMentorshipSessions = async (req, res) => {
  try {
    const { id } = req.params;

    const [mentorship] = await db.query(
      'SELECT * FROM mentorship WHERE mentorship_id = ? AND (mentor_id = ? OR mentee_id = ?)',
      [id, req.user.user_id, req.user.user_id]
    );

    if (mentorship.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this mentorship'
      });
    }

    const [sessions] = await db.query(
      `SELECT ms.*, 
              u.first_name as created_by_first_name, 
              u.last_name as created_by_last_name
       FROM mentorship_sessions ms
       LEFT JOIN users u ON ms.created_by = u.user_id
       WHERE ms.mentorship_id = ? 
       ORDER BY ms.scheduled_date DESC`,
      [id]
    );

    res.json({
      success: true,
      sessions: sessions || []
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
    });
  }
};

// @desc    Schedule mentorship session
// @route   POST /api/mentorship/:id/sessions
// @access  Private
exports.scheduleSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, scheduled_date, duration_minutes, meeting_link } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Session title is required'
      });
    }

    if (!scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date is required'
      });
    }

    const sessionDate = new Date(scheduled_date);
    if (isNaN(sessionDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (sessionDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule session in the past'
      });
    }

    const [mentorship] = await db.query(
      `SELECT m.*, 
              mentor.first_name as mentor_first_name, mentor.last_name as mentor_last_name, mentor.email as mentor_email,
              mentee.first_name as mentee_first_name, mentee.last_name as mentee_last_name, mentee.email as mentee_email
       FROM mentorship m
       JOIN users mentor ON m.mentor_id = mentor.user_id
       JOIN users mentee ON m.mentee_id = mentee.user_id
       WHERE m.mentorship_id = ? AND (m.mentor_id = ? OR m.mentee_id = ?)`,
      [id, req.user.user_id, req.user.user_id]
    );

    if (mentorship.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship not found or you are not authorized'
      });
    }

    const mentorshipData = mentorship[0];

    if (mentorshipData.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Mentorship must be active to schedule sessions'
      });
    }

    const finalDuration = duration_minutes && !isNaN(parseInt(duration_minutes)) 
      ? parseInt(duration_minutes) 
      : 60;

    const [result] = await db.query(
      `INSERT INTO mentorship_sessions 
       (mentorship_id, session_title, session_description, scheduled_date, duration_minutes, meeting_link, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [
        id, 
        title.trim(), 
        description?.trim() || '', 
        scheduled_date, 
        finalDuration, 
        meeting_link?.trim() || null,
        req.user.user_id
      ]
    );

    const [newSession] = await db.query(
      `SELECT ms.*, 
              u.first_name as created_by_first_name, 
              u.last_name as created_by_last_name
       FROM mentorship_sessions ms
       LEFT JOIN users u ON ms.created_by = u.user_id
       WHERE ms.session_id = ?`,
      [result.insertId]
    );

    const otherUserId = mentorshipData.mentor_id === req.user.user_id 
      ? mentorshipData.mentee_id 
      : mentorshipData.mentor_id;

    const otherUserName = mentorshipData.mentor_id === req.user.user_id
      ? `${mentorshipData.mentee_first_name} ${mentorshipData.mentee_last_name}`
      : `${mentorshipData.mentor_first_name} ${mentorshipData.mentor_last_name}`;

    const otherUserEmail = mentorshipData.mentor_id === req.user.user_id
      ? mentorshipData.mentee_email
      : mentorshipData.mentor_email;

    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id) 
       VALUES (?, 'mentorship', 'New Session Scheduled', ?, ?)`,
      [
        otherUserId, 
        `${req.user.first_name} ${req.user.last_name} scheduled a session: ${title.trim()}`, 
        id
      ]
    );

    // ✅ SEND EMAIL TO OTHER USER
    try {
      await sendSessionScheduledEmail(
        otherUserEmail,
        otherUserName,
        `${req.user.first_name} ${req.user.last_name}`,
        {
          session_title: title.trim(),
          scheduled_date: scheduled_date,
          duration_minutes: finalDuration,
          meeting_link: meeting_link?.trim() || null,
          session_description: description?.trim() || ''
        }
      );
          } catch (emailError) {
      console.error('❌ Session scheduled email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Session scheduled successfully',
      session: newSession[0]
    });
  } catch (error) {
    console.error('Schedule session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule session'
    });
  }
};






// @desc    Complete session
// @route   POST /api/mentorship/sessions/:sessionId/complete
// @access  Private
exports.completeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [session] = await db.query(
      `SELECT ms.*, m.mentor_id, m.mentee_id
       FROM mentorship_sessions ms
       JOIN mentorship m ON ms.mentorship_id = m.mentorship_id
       WHERE ms.session_id = ? AND (m.mentor_id = ? OR m.mentee_id = ?)`,
      [sessionId, req.user.user_id, req.user.user_id]
    );

    if (session.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or you are not authorized'
      });
    }

    if (session[0].status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session is already marked as completed'
      });
    }

    if (session[0].status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete a cancelled session'
      });
    }

    await db.query(
      `UPDATE mentorship_sessions SET status = 'completed', completed_at = NOW() 
       WHERE session_id = ?`,
      [sessionId]
    );

    res.json({
      success: true,
      message: 'Session marked as completed'
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete session'
    });
  }
};

// @desc    Get mentorship goals
// @route   GET /api/mentorship/:id/goals
// @access  Private
exports.getMentorshipGoals = async (req, res) => {
  try {
    const { id } = req.params;

    const [mentorship] = await db.query(
      'SELECT * FROM mentorship WHERE mentorship_id = ? AND (mentor_id = ? OR mentee_id = ?)',
      [id, req.user.user_id, req.user.user_id]
    );

    if (mentorship.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this mentorship'
      });
    }

    const [goals] = await db.query(
      `SELECT mg.*,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM mentorship_goals mg
       LEFT JOIN users u ON mg.created_by = u.user_id
       WHERE mg.mentorship_id = ? 
       ORDER BY mg.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      goals: goals || []
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals'
    });
  }
};

// @desc    Create mentorship goal
// @route   POST /api/mentorship/:id/goals
// @access  Private
exports.createGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, target_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required'
      });
    }

    const [mentorship] = await db.query(
      'SELECT * FROM mentorship WHERE mentorship_id = ? AND (mentor_id = ? OR mentee_id = ?)',
      [id, req.user.user_id, req.user.user_id]
    );

    if (mentorship.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship not found or you are not authorized'
      });
    }

    if (mentorship[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Mentorship must be active to create goals'
      });
    }

    const [result] = await db.query(
      `INSERT INTO mentorship_goals 
       (mentorship_id, goal_title, goal_description, target_date, status, progress_percentage, created_by) 
       VALUES (?, ?, ?, ?, 'not_started', 0, ?)`,
      [
        id, 
        title.trim(), 
        description?.trim() || '', 
        target_date || null,
        req.user.user_id
      ]
    );

    const [newGoal] = await db.query(
      `SELECT mg.*,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM mentorship_goals mg
       LEFT JOIN users u ON mg.created_by = u.user_id
       WHERE mg.goal_id = ?`,
      [result.insertId]
    );

    const otherUserId = mentorship[0].mentor_id === req.user.user_id 
      ? mentorship[0].mentee_id 
      : mentorship[0].mentor_id;

    await db.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id) 
       VALUES (?, 'mentorship', 'New Goal Created', ?, ?)`,
      [
        otherUserId, 
        `${req.user.first_name} ${req.user.last_name} created a new goal: ${title.trim()}`, 
        id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      goal: newGoal[0]
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create goal'
    });
  }
};



// @desc    Update goal progress
// @route   PUT /api/mentorship/goals/:goalId/progress
// @access  Private
exports.updateGoalProgress = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { progress_percentage } = req.body;

    if (progress_percentage === undefined || progress_percentage === null) {
      return res.status(400).json({
        success: false,
        message: 'Progress percentage is required'
      });
    }

    const progress = parseInt(progress_percentage);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    const [goal] = await db.query(
      `SELECT mg.*, m.mentor_id, m.mentee_id
       FROM mentorship_goals mg
       JOIN mentorship m ON mg.mentorship_id = m.mentorship_id
       WHERE mg.goal_id = ? AND (m.mentor_id = ? OR m.mentee_id = ?)`,
      [goalId, req.user.user_id, req.user.user_id]
    );

    if (goal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found or you are not authorized'
      });
    }

    await db.query(
      `UPDATE mentorship_goals 
       SET progress_percentage = ?,
           status = CASE 
             WHEN ? = 100 THEN 'completed'
             WHEN ? > 0 THEN 'in_progress'
             ELSE 'not_started'
           END
       WHERE goal_id = ?`,
      [progress, progress, progress, goalId]
    );

    const [updatedGoal] = await db.query(
      `SELECT mg.*,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM mentorship_goals mg
       LEFT JOIN users u ON mg.created_by = u.user_id
       WHERE mg.goal_id = ?`,
      [goalId]
    );

    res.json({
      success: true,
      message: 'Goal progress updated',
      goal: updatedGoal[0]
    });
  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goal progress'
    });
  }
};

// @desc    Delete goal
// @route   DELETE /api/mentorship/goals/:goalId
// @access  Private
exports.deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;

    const [goal] = await db.query(
      `SELECT mg.*, m.mentor_id, m.mentee_id
       FROM mentorship_goals mg
       JOIN mentorship m ON mg.mentorship_id = m.mentorship_id
       WHERE mg.goal_id = ? AND mg.created_by = ?`,
      [goalId, req.user.user_id]
    );

    if (goal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found or you can only delete goals you created'
      });
    }

    await db.query('DELETE FROM mentorship_goals WHERE goal_id = ?', [goalId]);

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal'
    });
  }
};

// @desc    Delete session
// @route   DELETE /api/mentorship/sessions/:sessionId
// @access  Private
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [session] = await db.query(
      `SELECT ms.*, m.mentor_id, m.mentee_id
       FROM mentorship_sessions ms
       JOIN mentorship m ON ms.mentorship_id = m.mentorship_id
       WHERE ms.session_id = ? AND ms.created_by = ?`,
      [sessionId, req.user.user_id]
    );

    if (session.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or you can only delete sessions you created'
      });
    }

    await db.query('DELETE FROM mentorship_sessions WHERE session_id = ?', [sessionId]);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session'
    });
  }
};