const db = require('../config/database');
const { createNotification } = require('./notificationController');
const { getAvatarUrl } = require('../utils/profilePictureUtils');
const { 
  sendConnectionRequestEmail, 
  sendConnectionAcceptedEmail 
} = require('../utils/emailService');

exports.sendRequest = async (req, res) => {
  try {
    const { receiver_id } = req.body;
    const sender_id = req.user.user_id;

    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot send connection requests. This feature is for alumni networking only.'
      });
    }

    if (!receiver_id) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    if (sender_id === parseInt(receiver_id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send connection request to yourself'
      });
    }

    // Check if receiver exists and is active
    const [receiver] = await db.query(
      'SELECT user_id, first_name, last_name, email, role FROM users WHERE user_id = ? AND is_active = TRUE',
      [receiver_id]
    );

    if (!receiver.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (receiver[0].role === 'school_admin' || receiver[0].role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot send connection requests to administrators'
      });
    }

    // Check if connection already exists
    const [existing] = await db.query(
      `SELECT connection_id, status, sender_id, receiver_id FROM connections 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)`,
      [sender_id, receiver_id, receiver_id, sender_id]
    );

    if (existing.length > 0) {
      const existingConn = existing[0];
      if (existingConn.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: existingConn.sender_id === sender_id 
            ? 'Connection request already pending' 
            : 'This user has already sent you a connection request'
        });
      } else if (existingConn.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'Already connected with this user'
        });
      }
    }

    // Create connection request
    const [result] = await db.query(
      'INSERT INTO connections (sender_id, receiver_id, status) VALUES (?, ?, ?)',
      [sender_id, receiver_id, 'pending']
    );

    // Create notification
    try {
      await createNotification(
        receiver_id,
        'connection_request',
        'New Connection Request',
        `${req.user.first_name} ${req.user.last_name} sent you a connection request`,
        sender_id,
        'connection'
      );
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }

    // ✅ SEND EMAIL
    try {
      await sendConnectionRequestEmail(
        receiver[0].email,
        `${receiver[0].first_name} ${receiver[0].last_name}`,
        `${req.user.first_name} ${req.user.last_name}`,
        sender_id
      );
      console.log('✓ Connection request email sent to:', receiver[0].email);
    } catch (emailError) {
      console.error('❌ Connection request email failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      connection_id: result.insertId
    });
  } catch (error) {
    console.error('Send connection request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send connection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// @desc    Get connection status with a user
// @route   GET /api/connections/status/:userId
// @access  Private
exports.getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.user_id;

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID is required'
      });
    }

    if (parseInt(userId) === currentUserId) {
      return res.json({
        success: true,
        status: 'self'
      });
    }

    // Check if target user is admin
    const [targetUser] = await db.query(
      'SELECT role FROM users WHERE user_id = ?',
      [userId]
    );

    if (targetUser.length > 0 && 
        (targetUser[0].role === 'school_admin' || targetUser[0].role === 'super_admin')) {
      return res.json({
        success: true,
        status: 'admin'
      });
    }

    // If current user is admin
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.json({
        success: true,
        status: 'admin_user'
      });
    }

    // Check for connection
    const [connections] = await db.query(
      `SELECT 
        connection_id,
        sender_id,
        receiver_id,
        status
       FROM connections 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)`,
      [currentUserId, userId, userId, currentUserId]
    );

    // Check for mentorship relationship
    const [mentorship] = await db.query(
      `SELECT 
        mentorship_id,
        mentor_id,
        mentee_id,
        status
       FROM mentorship 
       WHERE (mentor_id = ? AND mentee_id = ?) 
          OR (mentor_id = ? AND mentee_id = ?)
         AND status IN ('requested', 'active', 'completed')`,
      [currentUserId, userId, userId, currentUserId]
    );

    // If has mentorship, return that info
    if (mentorship.length > 0) {
      return res.json({
        success: true,
        status: connections.length > 0 && connections[0].status === 'accepted' ? 'accepted' : 'none',
        mentorship_relationship: true,
        mentorship_status: mentorship[0].status,
        is_mentor: mentorship[0].mentor_id === currentUserId
      });
    }

    // Handle connection status
    if (!connections.length) {
      return res.json({
        success: true,
        status: 'none',
        mentorship_relationship: false
      });
    }

    const connection = connections[0];

    if (connection.status === 'accepted') {
      return res.json({
        success: true,
        status: 'accepted',
        connection_id: connection.connection_id,
        mentorship_relationship: false
      });
    }

    if (connection.status === 'pending') {
      if (connection.sender_id === currentUserId) {
        return res.json({
          success: true,
          status: 'sent',
          connection_id: connection.connection_id,
          mentorship_relationship: false
        });
      } else {
        return res.json({
          success: true,
          status: 'received',
          connection_id: connection.connection_id,
          mentorship_relationship: false
        });
      }
    }

    return res.json({
      success: true,
      status: 'none',
      mentorship_relationship: false
    });
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Accept connection request
// @route   PUT /api/connections/:id/accept
// @access  Private (Alumni only)
exports.acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot manage connection requests'
      });
    }

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Valid connection ID is required'
      });
    }

    const [connections] = await db.query(
      `SELECT c.*, u.first_name, u.last_name, u.email, u.role 
       FROM connections c
       JOIN users u ON c.sender_id = u.user_id
       WHERE c.connection_id = ? AND u.is_active = TRUE`,
      [id]
    );

    if (!connections.length) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    const connection = connections[0];

    if (connection.role === 'school_admin' || connection.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot accept connection from administrators'
      });
    }

    if (connection.receiver_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this request'
      });
    }

    if (connection.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Connection already accepted'
      });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Connection request is no longer pending'
      });
    }

    await db.query(
      'UPDATE connections SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE connection_id = ?',
      ['accepted', id]
    );

    // Create notification
    try {
      await createNotification(
        connection.sender_id,
        'connection_accepted',
        'Connection Accepted',
        `${req.user.first_name} ${req.user.last_name} accepted your connection request`,
        req.user.user_id,
        'connection'
      );
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }

    // ✅ SEND EMAIL
    try {
      await sendConnectionAcceptedEmail(
        connection.email,
        `${connection.first_name} ${connection.last_name}`,
        `${req.user.first_name} ${req.user.last_name}`,
        req.user.user_id
      );
      console.log('✓ Connection accepted email sent to:', connection.email);
    } catch (emailError) {
      console.error('❌ Connection accepted email failed:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Connection request accepted successfully'
    });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept connection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// @desc    Reject connection request
// @route   PUT /api/connections/:id/reject
// @access  Private (Alumni only)
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // FIXED: Prevent admins from rejecting connection requests
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot manage connection requests'
      });
    }

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Valid connection ID is required'
      });
    }

    const [connections] = await db.query(
      `SELECT c.*, u.first_name, u.last_name 
       FROM connections c
       JOIN users u ON c.sender_id = u.user_id
       WHERE c.connection_id = ? AND c.status = "pending"`,
      [id]
    );

    if (!connections.length) {
      return res.status(404).json({
        success: false,
        message: 'Pending connection request not found'
      });
    }

    if (connections[0].receiver_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this request'
      });
    }

    await db.query('DELETE FROM connections WHERE connection_id = ?', [id]);

    res.json({
      success: true,
      message: 'Connection request rejected successfully'
    });
  } catch (error) {
    console.error('Reject connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject connection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getMyConnections = async (req, res) => {
  try {
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.json({
        success: true,
        connections: [],
        pagination: {
          total: 0,
          limit: parseInt(req.query.limit || 50),
          offset: parseInt(req.query.offset || 0)
        }
      });
    }

    const { search, limit = 50, offset = 0 } = req.query;
    const userId = req.user.user_id;

    let query = `
      SELECT 
        c.connection_id,
        c.status,
        c.created_at,
        CASE 
          WHEN c.sender_id = ? THEN u2.user_id
          ELSE u1.user_id
        END as connection_user_id,
        CASE 
          WHEN c.sender_id = ? THEN u2.first_name
          ELSE u1.first_name
        END as first_name,
        CASE 
          WHEN c.sender_id = ? THEN u2.last_name
          ELSE u1.last_name
        END as last_name,
        CASE 
          WHEN c.sender_id = ? THEN u2.profile_picture
          ELSE u1.profile_picture
        END as profile_picture,
        CASE 
          WHEN c.sender_id = ? THEN u2.current_city
          ELSE u1.current_city
        END as current_city,
        CASE 
          WHEN c.sender_id = ? THEN u2.current_country
          ELSE u1.current_country
        END as current_country,
        we.company_name,
        we.position,
        s.school_name,
        ae.end_year as graduation_year
      FROM connections c
      JOIN users u1 ON c.sender_id = u1.user_id
      JOIN users u2 ON c.receiver_id = u2.user_id
      LEFT JOIN work_experience we ON (
        CASE 
          WHEN c.sender_id = ? THEN u2.user_id
          ELSE u1.user_id
        END = we.user_id AND we.is_current = TRUE
      )
      LEFT JOIN alumni_education ae ON (
        CASE 
          WHEN c.sender_id = ? THEN u2.user_id
          ELSE u1.user_id
        END = ae.user_id AND ae.is_verified = TRUE
      )
      LEFT JOIN schools s ON ae.school_id = s.school_id
      WHERE (c.sender_id = ? OR c.receiver_id = ?) 
        AND c.status = 'accepted'
        AND u1.is_active = TRUE 
        AND u2.is_active = TRUE
        AND u1.role = 'alumni'
        AND u2.role = 'alumni'
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM connections c
      JOIN users u1 ON c.sender_id = u1.user_id
      JOIN users u2 ON c.receiver_id = u2.user_id
      WHERE (c.sender_id = ? OR c.receiver_id = ?) 
        AND c.status = 'accepted'
        AND u1.is_active = TRUE 
        AND u2.is_active = TRUE
        AND u1.role = 'alumni'
        AND u2.role = 'alumni'
    `;

    const queryParams = [
      userId, userId, userId, userId, userId, userId,
      userId, userId, userId, userId
    ];

    const countParams = [userId, userId];

    if (search) {
      const searchCondition = `
        AND (CONCAT(
          CASE 
            WHEN c.sender_id = ? THEN u2.first_name
            ELSE u1.first_name
          END, ' ',
          CASE 
            WHEN c.sender_id = ? THEN u2.last_name
            ELSE u1.last_name
          END
        ) LIKE ? OR we.company_name LIKE ? OR s.school_name LIKE ?)
      `;
      query += searchCondition;
      countQuery += searchCondition;
      
      const searchTerm = `%${search}%`;
      queryParams.push(userId, userId, searchTerm, searchTerm, searchTerm);
      countParams.push(userId, userId, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const [connections] = await db.query(query, queryParams);
    const [totalResult] = await db.query(countQuery, countParams);

   

const formattedConnections = connections.map(conn => ({
      ...conn,
      profile_picture: conn.profile_picture ? getAvatarUrl(conn.profile_picture) : null
    }));

    res.json({
      success: true,
      connections: formattedConnections,
      pagination: {
        total: totalResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get my connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get pending connection requests
// @route   GET /api/connections/pending
// @access  Private (Alumni only - admins return empty)
exports.getPendingRequests = async (req, res) => {
  try {
    // FIXED: Admins don't receive connection requests
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.json({
        success: true,
        requests: [],
        pagination: {
          total: 0,
          limit: parseInt(req.query.limit || 20),
          offset: parseInt(req.query.offset || 0)
        }
      });
    }

    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.user_id;

    const [requests] = await db.query(
      `SELECT 
        c.connection_id,
        c.created_at,
        u.user_id,
        u.first_name,
        u.last_name,
        u.profile_picture,
        u.current_city,
        u.current_country,
        u.bio,
        we.company_name,
        we.position,
        s.school_name,
        ae.end_year as graduation_year
       FROM connections c
       JOIN users u ON c.sender_id = u.user_id AND u.is_active = TRUE AND u.role = 'alumni'
       LEFT JOIN work_experience we ON u.user_id = we.user_id AND we.is_current = TRUE
       LEFT JOIN alumni_education ae ON u.user_id = ae.user_id AND ae.is_verified = TRUE
       LEFT JOIN schools s ON ae.school_id = s.school_id
       WHERE c.receiver_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const [totalResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM connections c
       JOIN users u ON c.sender_id = u.user_id
       WHERE c.receiver_id = ? AND c.status = 'pending' AND u.is_active = TRUE AND u.role = 'alumni'`,
      [userId]
    );

    res.json({
      success: true,
      requests,
      pagination: {
        total: totalResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Remove connection
// @route   DELETE /api/connections/:id
// @access  Private (Alumni only)
exports.removeConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // FIXED: Prevent admins from removing connections
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot manage connections'
      });
    }

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Valid connection ID is required'
      });
    }

    const [connections] = await db.query(
      'SELECT sender_id, receiver_id FROM connections WHERE connection_id = ? AND status = "accepted"',
      [id]
    );

    if (!connections.length) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }

    const connection = connections[0];

    if (connection.sender_id !== userId && connection.receiver_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove this connection'
      });
    }

    await db.query('DELETE FROM connections WHERE connection_id = ?', [id]);

    res.json({
      success: true,
      message: 'Connection removed successfully'
    });
  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove connection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get connections with school and batch information
// @route   GET /api/connections/with-details
// @access  Private (Alumni only)
// @desc    Get connections with school and batch information
// @route   GET /api/connections/with-details
// @access  Private (Alumni only)
exports.getConnectionsWithDetails = async (req, res) => {
  try {
    // FIXED: Admins return empty connections
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.json({
        success: true,
        connections: []
      });
    }

    const userId = req.user.user_id;

    const [connections] = await db.query(
      `SELECT DISTINCT
        u.user_id as connection_user_id,
        u.first_name,
        u.last_name,
        u.profile_picture,
        u.current_city,
        u.current_country,
        ae.school_id,
        s.school_name,
        ae.end_year as graduation_year,
        ae.end_year as batch_year
       FROM connections c
       INNER JOIN users u ON (
         CASE 
           WHEN c.sender_id = ? THEN c.receiver_id 
           ELSE c.sender_id 
         END = u.user_id
       )
       LEFT JOIN alumni_education ae ON u.user_id = ae.user_id AND ae.is_verified = TRUE
       LEFT JOIN schools s ON ae.school_id = s.school_id
       WHERE c.status = 'accepted'
         AND (c.sender_id = ? OR c.receiver_id = ?)
         AND u.is_active = TRUE
         AND u.role = 'alumni'
       ORDER BY u.first_name, u.last_name`,
      [userId, userId, userId]
    );

    res.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('Get connections with details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel pending connection request
// @route   DELETE /api/connections/request/:id/cancel
// @access  Private (Alumni only)
exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // FIXED: Prevent admins from canceling requests
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot manage connection requests'
      });
    }

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Valid connection ID is required'
      });
    }

    const [connections] = await db.query(
      'SELECT sender_id FROM connections WHERE connection_id = ? AND status = "pending"',
      [id]
    );

    if (!connections.length) {
      return res.status(404).json({
        success: false,
        message: 'Pending connection request not found'
      });
    }

    if (connections[0].sender_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    await db.query('DELETE FROM connections WHERE connection_id = ?', [id]);

    res.json({
      success: true,
      message: 'Connection request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel connection request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};





// @desc    Respond to connection request (combined accept/reject)
// @route   PUT /api/connections/:id/respond
// @access  Private (Alumni only)
exports.respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // FIXED: Prevent admins from responding to requests
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot manage connection requests'
      });
    }

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "accepted" or "rejected"'
      });
    }

    const [connection] = await db.query(
      'SELECT * FROM connections WHERE connection_id = ? AND receiver_id = ? AND status = "pending"',
      [id, req.user.user_id]
    );

    if (!connection.length) {
      return res.status(404).json({
        success: false,
        message: 'Pending connection request not found'
      });
    }

    if (status === 'accepted') {
      await db.query(
        'UPDATE connections SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE connection_id = ?',
        [status, id]
      );

      await createNotification(
        connection[0].sender_id,
        'connection_accepted',
        'Connection Accepted',
        `${req.user.first_name} ${req.user.last_name} accepted your connection request`,
        req.user.user_id,
        'connection'
      );
    } else {
      await db.query('DELETE FROM connections WHERE connection_id = ?', [id]);
    }

    res.json({
      success: true,
      message: `Connection request ${status}`
    });
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to connection request'
    });
  }
};