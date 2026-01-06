// notificationController.js - FIXED: Correct role-based notifications

const db = require('../config/database');

// @desc    Get user notifications with proper filtering - ROLE-BASED
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, is_read, type } = req.query;
    const offset = (page - 1) * limit;

    // Define allowed notification types per role
    const allowedTypes = {
      alumni: ['connection_request', 'connection_accepted', 'message', 'event', 'job', 'mentorship', 'system'],
      school_admin: ['system', 'event', 'verification_request', 'school_update', 'job_application'], // ADDED job_application
      super_admin: [] // REMOVED all notifications for super_admin
    };

    const userAllowedTypes = allowedTypes[req.user.role] || allowedTypes.alumni;

    // If super_admin has no allowed types, return empty
    if (userAllowedTypes.length === 0) {
      return res.json({
        success: true,
        notifications: [],
        unread_count: 0,
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0
        }
      });
    }

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
        AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})
    `;
    const params = [req.user.user_id, ...userAllowedTypes];

    if (is_read !== undefined) {
      query += ` AND is_read = ?`;
      params.push(is_read === 'true' || is_read === '1');
    }

    if (type && userAllowedTypes.includes(type)) {
      query += ` AND notification_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [notifications] = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM notifications 
      WHERE user_id = ? 
        AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})
    `;
    const countParams = [req.user.user_id, ...userAllowedTypes];
    
    if (is_read !== undefined) {
      countQuery += ' AND is_read = ?';
      countParams.push(is_read === 'true' || is_read === '1');
    }

    if (type && userAllowedTypes.includes(type)) {
      countQuery += ' AND notification_type = ?';
      countParams.push(type);
    }

    const [countResult] = await db.query(countQuery, countParams);

    // Get unread count
    const [unreadCount] = await db.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? 
         AND is_read = FALSE
         AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})`,
      [req.user.user_id, ...userAllowedTypes]
    );

    res.json({
      success: true,
      notifications,
      unread_count: parseInt(unreadCount[0].count) || 0,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      unread_count: 0
    });
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const allowedTypes = {
      alumni: ['connection_request', 'connection_accepted', 'message', 'event', 'job', 'mentorship', 'system'],
      school_admin: ['system', 'event', 'verification_request', 'school_update', 'job_application'], // ADDED job_application
      super_admin: [] // REMOVED all notifications
    };

    const userAllowedTypes = allowedTypes[req.user.role] || allowedTypes.alumni;

    // If super_admin, always return 0
    if (userAllowedTypes.length === 0) {
      return res.json({
        success: true,
        unread_count: 0
      });
    }

    const [count] = await db.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? 
         AND is_read = FALSE
         AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})`,
      [req.user.user_id, ...userAllowedTypes]
    );

    const unreadCount = parseInt(count[0]?.count) || 0;

    res.json({
      success: true,
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(200).json({
      success: true,
      unread_count: 0
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const [notification] = await db.query(
      'SELECT is_read FROM notifications WHERE notification_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (!notification[0].is_read) {
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
        [id, req.user.user_id]
      );
    }

    const allowedTypes = {
      alumni: ['connection_request', 'connection_accepted', 'message', 'event', 'job', 'mentorship', 'system'],
      school_admin: ['system', 'event', 'verification_request', 'school_update', 'job_application'],
      super_admin: []
    };

    const userAllowedTypes = allowedTypes[req.user.role] || allowedTypes.alumni;

    if (userAllowedTypes.length === 0) {
      return res.json({
        success: true,
        message: 'Notification marked as read',
        unread_count: 0
      });
    }

    const [count] = await db.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? 
         AND is_read = FALSE
         AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})`,
      [req.user.user_id, ...userAllowedTypes]
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
      unread_count: parseInt(count[0]?.count) || 0
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const allowedTypes = {
      alumni: ['connection_request', 'connection_accepted', 'message', 'event', 'job', 'mentorship', 'system'],
      school_admin: ['system', 'event', 'verification_request', 'school_update', 'job_application'],
      super_admin: []
    };

    const userAllowedTypes = allowedTypes[req.user.role] || allowedTypes.alumni;

    if (userAllowedTypes.length === 0) {
      return res.json({
        success: true,
        message: 'All notifications marked as read',
        unread_count: 0
      });
    }

    await db.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = ? 
         AND is_read = FALSE
         AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})`,
      [req.user.user_id, ...userAllowedTypes]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      unread_count: 0
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const [notification] = await db.query(
      'SELECT is_read FROM notifications WHERE notification_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await db.query(
      'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    const allowedTypes = {
      alumni: ['connection_request', 'connection_accepted', 'message', 'event', 'job', 'mentorship', 'system'],
      school_admin: ['system', 'event', 'verification_request', 'school_update', 'job_application'],
      super_admin: []
    };

    const userAllowedTypes = allowedTypes[req.user.role] || allowedTypes.alumni;

    if (userAllowedTypes.length === 0) {
      return res.json({
        success: true,
        message: 'Notification deleted',
        unread_count: 0
      });
    }

    const [count] = await db.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? 
         AND is_read = FALSE
         AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})`,
      [req.user.user_id, ...userAllowedTypes]
    );

    res.json({
      success: true,
      message: 'Notification deleted',
      unread_count: parseInt(count[0]?.count) || 0
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/delete-all
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
  try {
    const allowedTypes = {
      alumni: ['connection_request', 'connection_accepted', 'message', 'event', 'job', 'mentorship', 'system'],
      school_admin: ['system', 'event', 'verification_request', 'school_update', 'job_application'],
      super_admin: []
    };

    const userAllowedTypes = allowedTypes[req.user.role] || allowedTypes.alumni;

    if (userAllowedTypes.length === 0) {
      return res.json({
        success: true,
        message: 'All notifications deleted successfully',
        deleted_count: 0,
        unread_count: 0
      });
    }

    const [result] = await db.query(
      `DELETE FROM notifications 
       WHERE user_id = ?
         AND notification_type IN (${userAllowedTypes.map(() => '?').join(',')})`,
      [req.user.user_id, ...userAllowedTypes]
    );

    
    res.json({
      success: true,
      message: 'All notifications deleted successfully',
      deleted_count: result.affectedRows,
      unread_count: 0
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
      error: error.message
    });
  }
};

// Helper function to create notification - ROLE-AWARE
exports.createNotification = async (userId, type, title, message, relatedId = null, category = null) => {
  try {
    // Get user role to determine if notification should be created
    const [user] = await db.query('SELECT role FROM users WHERE user_id = ?', [userId]);
    
    if (!user.length) {
      const [admin] = await db.query('SELECT "school_admin" as role FROM school_admins WHERE admin_id = ?', [userId]);
      if (!admin.length) return;
    }

    const userRole = user.length ? user[0].role : 'school_admin';

    // Define which notification types are allowed for each role
    const allowedTypes = {
      alumni: ['connection_request', 'connection_accepted', 'message', 'event', 'job', 'mentorship', 'system'],
      school_admin: ['system', 'event', 'verification_request', 'school_update', 'job_application'],
      super_admin: [] // No notifications for super_admin
    };

    // Only create notification if type is allowed for user's role
    if (allowedTypes[userRole] && allowedTypes[userRole].includes(type)) {
      await db.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, related_id, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, type, title, message, relatedId, category]
      );
    }
  } catch (error) {
    console.error('Create notification error:', error);
  }
};