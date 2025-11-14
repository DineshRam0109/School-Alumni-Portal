const db = require('../config/database');
const { createNotification } = require('./notificationController');

// @desc    Send message with optional attachments
// @route   POST /api/messages/send
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { receiver_id, message_text } = req.body;
    const files = req.files;

    if (!receiver_id || (!message_text?.trim() && !files?.length)) {
      return res.status(400).json({
        success: false,
        message: 'Receiver and message text or attachments are required'
      });
    }

    // Check if receiver exists
    const [receiver] = await db.query(
      'SELECT user_id, first_name, last_name FROM users WHERE user_id = ? AND is_active = TRUE',
      [receiver_id]
    );

    if (!receiver.length) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Check if users are connected
    const [connection] = await db.query(
      `SELECT * FROM connections 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND status = 'accepted'`,
      [req.user.user_id, receiver_id, receiver_id, req.user.user_id]
    );

    if (!connection.length) {
      return res.status(403).json({
        success: false,
        message: 'You can only message your connections'
      });
    }

    // Insert message
    const [result] = await db.query(
      'INSERT INTO messages (sender_id, receiver_id, message_text, has_attachments) VALUES (?, ?, ?, ?)',
      [req.user.user_id, receiver_id, message_text?.trim() || '', files?.length > 0]
    );

    const messageId = result.insertId;

    // Handle file attachments
    if (files && files.length > 0) {
      const attachmentPromises = files.map(file => {
        const fileType = getFileType(file.mimetype);
        return db.query(
          `INSERT INTO message_attachments 
           (message_id, file_name, file_path, file_type, file_size, mime_type) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [messageId, file.originalname, file.path, fileType, file.size, file.mimetype]
        );
      });
      await Promise.all(attachmentPromises);
    }

    // Create notification
    await createNotification(
      receiver_id,
      'message',
      'New Message',
      `${req.user.first_name} ${req.user.last_name} sent you a message`,
      req.user.user_id
    );

    // Get the created message with attachments
    const [message] = await db.query(
      `SELECT m.*, 
              u.first_name as sender_first_name, 
              u.last_name as sender_last_name,
              u.profile_picture as sender_profile_picture
       FROM messages m
       JOIN users u ON m.sender_id = u.user_id
       WHERE m.message_id = ?`,
      [messageId]
    );

    // Get attachments
    const [attachments] = await db.query(
      'SELECT * FROM message_attachments WHERE message_id = ?',
      [messageId]
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        ...message[0],
        attachments
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// @desc    Get conversation with a user
// @route   GET /api/messages/conversation/:userId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if users are connected
    const [connection] = await db.query(
      `SELECT * FROM connections 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND status = 'accepted'`,
      [req.user.user_id, userId, userId, req.user.user_id]
    );

    if (!connection.length) {
      return res.status(403).json({
        success: false,
        message: 'You can only view conversations with your connections'
      });
    }

    // Get messages (exclude deleted messages)
    const [messages] = await db.query(
      `SELECT m.*, 
              sender.first_name as sender_first_name, 
              sender.last_name as sender_last_name,
              sender.profile_picture as sender_profile_picture
       FROM messages m
       JOIN users sender ON m.sender_id = sender.user_id
       WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
         AND NOT (
           (m.sender_id = ? AND m.deleted_for_sender = TRUE) OR
           (m.receiver_id = ? AND m.deleted_for_receiver = TRUE)
         )
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.user_id, userId, userId, req.user.user_id, 
       req.user.user_id, req.user.user_id,
       parseInt(limit), offset]
    );

    // Get attachments for all messages
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.message_id);
      const [attachments] = await db.query(
        `SELECT * FROM message_attachments WHERE message_id IN (?)`,
        [messageIds]
      );

      // Group attachments by message_id
      const attachmentsByMessage = {};
      attachments.forEach(att => {
        if (!attachmentsByMessage[att.message_id]) {
          attachmentsByMessage[att.message_id] = [];
        }
        attachmentsByMessage[att.message_id].push(att);
      });

      // Add attachments to messages
      messages.forEach(msg => {
        msg.attachments = attachmentsByMessage[msg.message_id] || [];
      });
    }

    // Mark messages as read
    await db.query(
      'UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
      [userId, req.user.user_id]
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// @desc    Delete message (for self or both)
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { delete_for } = req.query;

    const [message] = await db.query(
      'SELECT * FROM messages WHERE message_id = ?',
      [id]
    );

    if (!message.length) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const msg = message[0];
    const isSender = msg.sender_id === req.user.user_id;
    const isReceiver = msg.receiver_id === req.user.user_id;

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this message'
      });
    }

    if (delete_for === 'both') {
      if (!isSender) {
        return res.status(403).json({
          success: false,
          message: 'Only sender can delete message for everyone'
        });
      }

      const messageAge = Date.now() - new Date(msg.created_at).getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      
      if (messageAge > fifteenMinutes) {
        return res.status(400).json({
          success: false,
          message: 'You can only delete for everyone within 15 minutes'
        });
      }

      await db.query('DELETE FROM messages WHERE message_id = ?', [id]);
    } else {
      if (isSender) {
        await db.query(
          'UPDATE messages SET deleted_for_sender = TRUE WHERE message_id = ?',
          [id]
        );
      } else {
        await db.query(
          'UPDATE messages SET deleted_for_receiver = TRUE WHERE message_id = ?',
          [id]
        );
      }
    }

    res.json({
      success: true,
      message: delete_for === 'both' ? 'Message deleted for everyone' : 'Message deleted for you'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

// @desc    Get all conversations - FIXED VERSION
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    // Step 1: Get all users the current user has conversations with
    const [conversations] = await db.query(
      `SELECT DISTINCT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as user_id
       FROM messages m
       WHERE (m.sender_id = ? OR m.receiver_id = ?)
         AND NOT (
           (m.sender_id = ? AND m.deleted_for_sender = TRUE) OR
           (m.receiver_id = ? AND m.deleted_for_receiver = TRUE)
         )`,
      [req.user.user_id, req.user.user_id, req.user.user_id, 
       req.user.user_id, req.user.user_id]
    );

    if (conversations.length === 0) {
      return res.json({
        success: true,
        conversations: []
      });
    }

    // Step 2: Get user details and conversation info for each user
    const userIds = conversations.map(c => c.user_id);
    
    const [conversationDetails] = await db.query(
      `SELECT 
        u.user_id,
        u.first_name, 
        u.last_name, 
        u.profile_picture,
        u.current_city,
        (SELECT message_text 
         FROM messages 
         WHERE ((sender_id = ? AND receiver_id = u.user_id) OR (sender_id = u.user_id AND receiver_id = ?))
           AND NOT (
             (sender_id = ? AND deleted_for_sender = TRUE) OR
             (receiver_id = ? AND deleted_for_receiver = TRUE)
           )
         ORDER BY created_at DESC 
         LIMIT 1) as last_message,
        (SELECT created_at 
         FROM messages 
         WHERE ((sender_id = ? AND receiver_id = u.user_id) OR (sender_id = u.user_id AND receiver_id = ?))
           AND NOT (
             (sender_id = ? AND deleted_for_sender = TRUE) OR
             (receiver_id = ? AND deleted_for_receiver = TRUE)
           )
         ORDER BY created_at DESC 
         LIMIT 1) as last_message_time,
        (SELECT COUNT(*) 
         FROM messages 
         WHERE sender_id = u.user_id 
           AND receiver_id = ? 
           AND is_read = FALSE
           AND deleted_for_receiver = FALSE) as unread_count
       FROM users u
       WHERE u.user_id IN (?)
         AND u.is_active = TRUE
       ORDER BY last_message_time DESC`,
      [
        req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id,
        req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id,
        req.user.user_id, userIds
      ]
    );

    res.json({
      success: true,
      conversations: conversationDetails
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const [count] = await db.query(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = ? 
         AND is_read = FALSE 
         AND deleted_for_receiver = FALSE`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      unread_count: count[0].count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
};

// Helper function to determine file type
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}