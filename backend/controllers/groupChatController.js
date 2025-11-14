const db = require('../config/database');
const { createNotification } = require('./notificationController');

// @desc    Get all groups for current user (USER-CREATED GROUPS)
// @route   GET /api/groups
// @access  Private
exports.getMyGroups = async (req, res) => {
  try {
    const [groups] = await db.query(
      `SELECT 
        gc.*,
        gm.role as my_role,
        gm.is_muted,
        gm.last_read_at,
        (SELECT COUNT(*) 
         FROM group_members 
         WHERE group_id = gc.group_id AND is_active = TRUE) as member_count,
        (SELECT COUNT(*) 
         FROM group_messages gm2 
         WHERE gm2.group_id = gc.group_id 
           AND gm2.created_at > COALESCE(gm.last_read_at, '2000-01-01')
           AND gm2.sender_id != ?
           AND gm2.deleted_by_sender = FALSE
           AND NOT JSON_CONTAINS(COALESCE(gm2.deleted_by_members, '[]'), CAST(? AS JSON))) as unread_count,
        (SELECT message_text 
         FROM group_messages 
         WHERE group_id = gc.group_id 
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at 
         FROM group_messages 
         WHERE group_id = gc.group_id 
         ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM group_chats gc
       JOIN group_members gm ON gc.group_id = gm.group_id
       WHERE gm.user_id = ? 
         AND gm.is_active = TRUE 
         AND gc.is_active = TRUE
       ORDER BY last_message_time DESC`,
      [req.user.user_id, req.user.user_id, req.user.user_id]
    );

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups',
      error: error.message
    });
  }
};

// @desc    Create new group (USER-CREATED)
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { group_name, group_description, member_ids } = req.body;
    const groupAvatar = req.file;

    if (!group_name || !group_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one member is required'
      });
    }

    // Verify all members are connections
    const [connections] = await db.query(
      `SELECT DISTINCT 
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as user_id
       FROM connections 
       WHERE (sender_id = ? OR receiver_id = ?) 
         AND status = 'accepted'
         AND CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END IN (?)`,
      [req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id, member_ids]
    );

    if (connections.length !== member_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'You can only add your connections to the group'
      });
    }

    // Create group
    const avatarPath = groupAvatar ? `/uploads/groups/${groupAvatar.filename}` : null;
    
    const [result] = await db.query(
      `INSERT INTO group_chats (group_name, group_description, group_avatar, created_by, group_type)
       VALUES (?, ?, ?, ?, 'custom')`,
      [group_name.trim(), group_description || null, avatarPath, req.user.user_id]
    );

    const groupId = result.insertId;

    // Add creator as admin
    await db.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, req.user.user_id, 'admin']
    );

    // Add other members
    const memberPromises = member_ids.map(userId =>
      db.query(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, userId, 'member']
      )
    );
    await Promise.all(memberPromises);

    // Send notifications to invited members
    const notificationPromises = member_ids.map(userId =>
      createNotification(
        userId,
        'system',
        'Added to Group',
        `${req.user.first_name} ${req.user.last_name} added you to "${group_name}"`,
        groupId
      )
    );
    await Promise.all(notificationPromises);

    // Get created group with details
    const [group] = await db.query(
      `SELECT gc.*, 
              (SELECT COUNT(*) FROM group_members WHERE group_id = gc.group_id AND is_active = TRUE) as member_count
       FROM group_chats gc
       WHERE gc.group_id = ?`,
      [groupId]
    );

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group: group[0]
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group',
      error: error.message
    });
  }
};

// @desc    Update group (NAME, DESCRIPTION, AVATAR)
// @route   PUT /api/groups/:id
// @access  Private (Admin only)
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { group_name, group_description } = req.body;
    const groupAvatar = req.file;

    // Check if user is admin
    const [membership] = await db.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = TRUE',
      [id, req.user.user_id]
    );

    if (!membership.length || membership[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group details'
      });
    }

    const updates = [];
    const values = [];

    if (group_name !== undefined) {
      updates.push('group_name = ?');
      values.push(group_name.trim());
    }

    if (group_description !== undefined) {
      updates.push('group_description = ?');
      values.push(group_description || null);
    }

    if (groupAvatar) {
      updates.push('group_avatar = ?');
      values.push(`/uploads/groups/${groupAvatar.filename}`);
    }

    if (updates.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE group_chats SET ${updates.join(', ')} WHERE group_id = ?`,
        values
      );
    }

    res.json({
      success: true,
      message: 'Group updated successfully'
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group',
      error: error.message
    });
  }
};

// @desc    Get group details
// @route   GET /api/groups/:id
// @access  Private
exports.getGroupDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is member
    const [membership] = await db.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = TRUE',
      [id, req.user.user_id]
    );

    if (!membership.length) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Get group details
    const [group] = await db.query(
      `SELECT gc.*,
              u.first_name as creator_first_name,
              u.last_name as creator_last_name
       FROM group_chats gc
       LEFT JOIN users u ON gc.created_by = u.user_id
       WHERE gc.group_id = ?`,
      [id]
    );

    if (!group.length) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Get members
    const [members] = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.profile_picture, 
              u.current_city, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.user_id
       WHERE gm.group_id = ? AND gm.is_active = TRUE
       ORDER BY 
         CASE gm.role 
           WHEN 'admin' THEN 1 
           ELSE 2 
         END,
         u.first_name`,
      [id]
    );

    res.json({
      success: true,
      group: {
        ...group[0],
        members,
        my_role: membership[0].role
      }
    });
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group details',
      error: error.message
    });
  }
};

// @desc    Add members to group
// @route   POST /api/groups/:id/members
// @access  Private (Admin only)
exports.addGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { member_ids } = req.body;

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Member IDs are required'
      });
    }

    // Check if requester is admin
    const [requester] = await db.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = TRUE',
      [id, req.user.user_id]
    );

    if (!requester.length || requester[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add members'
      });
    }

    // Get group name for notifications
    const [group] = await db.query('SELECT group_name FROM group_chats WHERE group_id = ?', [id]);

    if (!group.length) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verify all members are connections of the admin
    const [connections] = await db.query(
      `SELECT DISTINCT 
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as user_id
       FROM connections 
       WHERE (sender_id = ? OR receiver_id = ?) 
         AND status = 'accepted'
         AND CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END IN (?)`,
      [req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id, member_ids]
    );

    const validMembers = connections.map(c => c.user_id);

    // Check who's already in the group
    const [existing] = await db.query(
      'SELECT user_id FROM group_members WHERE group_id = ? AND user_id IN (?)',
      [id, validMembers]
    );

    const existingIds = existing.map(e => e.user_id);
    const newMembers = validMembers.filter(userId => !existingIds.includes(userId));

    if (newMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected members are already in the group'
      });
    }

    // Add new members
    const addPromises = newMembers.map(userId =>
      db.query(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [id, userId, 'member']
      )
    );
    await Promise.all(addPromises);

    // Send notifications
    const notificationPromises = newMembers.map(userId =>
      createNotification(
        userId,
        'system',
        'Added to Group',
        `${req.user.first_name} ${req.user.last_name} added you to "${group[0].group_name}"`,
        id
      )
    );
    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: `${newMembers.length} member(s) added successfully`
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add members',
      error: error.message
    });
  }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private (Admin only)
exports.removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if requester is admin
    const [requester] = await db.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = TRUE',
      [id, req.user.user_id]
    );

    if (!requester.length || requester[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members'
      });
    }

    // Check if target is the creator
    const [group] = await db.query(
      'SELECT created_by FROM group_chats WHERE group_id = ?',
      [id]
    );

    if (group[0].created_by === parseInt(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the group creator'
      });
    }

    // Remove member
    await db.query(
      'UPDATE group_members SET is_active = FALSE WHERE group_id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
};

// @desc    Update member role
// @route   PUT /api/groups/:id/members/:userId/role
// @access  Private (Admin only)
exports.updateMemberRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if requester is admin
    const [requester] = await db.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = TRUE',
      [id, req.user.user_id]
    );

    if (!requester.length || requester[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update member roles'
      });
    }

    // Update role
    await db.query(
      'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
      [role, id, userId]
    );

    res.json({
      success: true,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member role',
      error: error.message
    });
  }
};

// @desc    Send group message
// @route   POST /api/groups/:id/messages
// @access  Private
exports.sendGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message_text } = req.body;
    const files = req.files;

    // Check if user is member
    const [membership] = await db.query(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = TRUE',
      [id, req.user.user_id]
    );

    if (!membership.length) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    if (!message_text?.trim() && !files?.length) {
      return res.status(400).json({
        success: false,
        message: 'Message text or attachments are required'
      });
    }

    // Insert message
    const [result] = await db.query(
      'INSERT INTO group_messages (group_id, sender_id, message_text, has_attachments) VALUES (?, ?, ?, ?)',
      [id, req.user.user_id, message_text?.trim() || '', files?.length > 0]
    );

    const messageId = result.insertId;

    // Handle file attachments
    if (files && files.length > 0) {
      const attachmentPromises = files.map(file => {
        const fileType = getFileType(file.mimetype);
        return db.query(
          `INSERT INTO group_message_attachments 
           (message_id, file_name, file_path, file_type, file_size, mime_type) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [messageId, file.originalname, file.path, fileType, file.size, file.mimetype]
        );
      });
      await Promise.all(attachmentPromises);
    }

    // Get the created message
    const [message] = await db.query(
      `SELECT gm.*, 
              u.first_name as sender_first_name, 
              u.last_name as sender_last_name,
              u.profile_picture as sender_profile_picture
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.user_id
       WHERE gm.message_id = ?`,
      [messageId]
    );

    // Get attachments
    const [attachments] = await db.query(
      'SELECT * FROM group_message_attachments WHERE message_id = ?',
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
    console.error('Send group message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// @desc    Get group messages
// @route   GET /api/groups/:id/messages
// @access  Private
exports.getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is member
    const [membership] = await db.query(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = TRUE',
      [id, req.user.user_id]
    );

    if (!membership.length) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Get messages
    const [messages] = await db.query(
      `SELECT gm.*, 
              u.first_name as sender_first_name, 
              u.last_name as sender_last_name,
              u.profile_picture as sender_profile_picture
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.user_id
       WHERE gm.group_id = ?
         AND NOT (gm.deleted_by_sender = TRUE AND gm.sender_id = ?)
         AND NOT (
           gm.deleted_by_members IS NOT NULL 
           AND JSON_CONTAINS(gm.deleted_by_members, CAST(? AS JSON))
         )
       ORDER BY gm.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, req.user.user_id, req.user.user_id, parseInt(limit), offset]
    );

    // Get attachments for all messages
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.message_id);
      const [attachments] = await db.query(
        `SELECT * FROM group_message_attachments WHERE message_id IN (?)`,
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

      messages.forEach(msg => {
        msg.attachments = attachmentsByMessage[msg.message_id] || [];
      });
    }

    // Update last read time
    await db.query(
      'UPDATE group_members SET last_read_at = NOW() WHERE group_id = ? AND user_id = ?',
      [id, req.user.user_id]
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
    console.error('Get group messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// @desc    Delete group message
// @route   DELETE /api/groups/messages/:messageId
// @access  Private
exports.deleteGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { delete_for } = req.query;

    const [message] = await db.query(
      'SELECT * FROM group_messages WHERE message_id = ?',
      [messageId]
    );

    if (!message.length) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const msg = message[0];

    if (delete_for === 'everyone') {
      if (msg.sender_id !== req.user.user_id) {
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

      await db.query('DELETE FROM group_messages WHERE message_id = ?', [messageId]);
    } else {
      if (msg.sender_id === req.user.user_id) {
        await db.query(
          'UPDATE group_messages SET deleted_by_sender = TRUE WHERE message_id = ?',
          [messageId]
        );
      } else {
        const deletedBy = msg.deleted_by_members ? JSON.parse(msg.deleted_by_members) : [];
        if (!deletedBy.includes(req.user.user_id)) {
          deletedBy.push(req.user.user_id);
        }
        
        await db.query(
          'UPDATE group_messages SET deleted_by_members = ? WHERE message_id = ?',
          [JSON.stringify(deletedBy), messageId]
        );
      }
    }

    res.json({
      success: true,
      message: delete_for === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you'
    });
  } catch (error) {
    console.error('Delete group message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

// @desc    Leave group
// @route   DELETE /api/groups/:id/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is the creator
    const [group] = await db.query(
      'SELECT created_by FROM group_chats WHERE group_id = ?',
      [id]
    );

    if (group[0].created_by === req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: 'Group creator cannot leave. Delete the group instead.'
      });
    }

    await db.query(
      'UPDATE group_members SET is_active = FALSE WHERE group_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group',
      error: error.message
    });
  }
};

// @desc    Delete group (Creator only)
// @route   DELETE /api/groups/:id
// @access  Private
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is the creator
    const [group] = await db.query(
      'SELECT created_by FROM group_chats WHERE group_id = ?',
      [id]
    );

    if (!group.length) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group[0].created_by !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can delete the group'
      });
    }

    // Soft delete the group
    await db.query(
      'UPDATE group_chats SET is_active = FALSE WHERE group_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete group',
      error: error.message
    });
  }
};

// Helper function
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

module.exports = exports;