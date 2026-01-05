
const db = require('../config/database');
const { createNotification } = require('./notificationController');
const { getAvatarUrl } = require('../utils/profilePictureUtils');
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const baseUrl = process.env.API_URL || 'http://localhost:5000';
  return cleanPath.startsWith('uploads/') 
    ? `${baseUrl}/${cleanPath}` 
    : `${baseUrl}/uploads/${cleanPath}`;
};

// Helper function to determine file type
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

// @desc    Get all groups for current user
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
         WHERE group_id = gc.group_id 
           AND is_active = TRUE) as member_count,
        (SELECT COUNT(*) 
         FROM group_messages gm2 
         WHERE gm2.group_id = gc.group_id 
           AND gm2.created_at > COALESCE(gm.last_read_at, '2000-01-01')
           AND gm2.sender_id != ?
           AND gm2.deleted_by_sender = FALSE) as unread_count,
        (SELECT message_text 
         FROM group_messages 
         WHERE group_id = gc.group_id 
           AND deleted_by_sender = FALSE
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at 
         FROM group_messages 
         WHERE group_id = gc.group_id 
           AND deleted_by_sender = FALSE
         ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM group_chats gc
       JOIN group_members gm ON gc.group_id = gm.group_id
       WHERE gm.user_id = ? 
         AND gm.is_active = TRUE 
         AND gc.is_active = TRUE
       ORDER BY last_message_time DESC`,
      [req.user.user_id, req.user.user_id]
    );

    res.json({
      success: true,
      groups: groups
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

// @desc    Create new group
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

    let memberIds = member_ids;
    if (typeof member_ids === 'string') {
      try {
        memberIds = JSON.parse(member_ids);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid member_ids format'
        });
      }
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one member is required'
      });
    }

    const avatarPath = groupAvatar ? groupAvatar.path.replace(/\\/g, '/').replace(/^uploads\//, '') : null;
    
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
    const memberPromises = memberIds.map(userId =>
      db.query(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, userId, 'member']
      )
    );
    await Promise.all(memberPromises);

    // Send notifications
    const notificationPromises = memberIds.map(userId =>
      createNotification(
        userId,
        'system',
        'Added to Group',
        `${req.user.first_name} ${req.user.last_name} added you to "${group_name}"`,
        groupId
      )
    );
    await Promise.all(notificationPromises);

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

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private (Admin only)
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { group_name, group_description } = req.body;
    const groupAvatar = req.file;

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
      values.push(groupAvatar.path.replace(/\\/g, '/').replace(/^uploads\//, ''));
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

// @desc    Get group details - FIXED
// @route   GET /api/groups/:id
// @access  Private
exports.getGroupDetails = async (req, res) => {
  try {
    const { id } = req.params;

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

    // ✅ FIXED: Format member profile pictures correctly
    const formattedMembers = members.map(member => ({
      ...member,
      profile_picture: member.profile_picture 
        ? getFileUrl(member.profile_picture)
        : null
    }));

    res.json({
      success: true,
      group: {
        ...group[0],
        group_avatar: group[0].group_avatar 
          ? getFileUrl(group[0].group_avatar)
          : null,
        members: formattedMembers,
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

    // ✅ FIX: Ensure all member_ids are integers
    const cleanMemberIds = member_ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (cleanMemberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid member IDs provided'
      });
    }

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

    const [group] = await db.query('SELECT group_name FROM group_chats WHERE group_id = ?', [id]);

    if (!group.length) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // ✅ FIX: Check for ANY existing member record (active or inactive)
    const placeholders = cleanMemberIds.map(() => '?').join(',');
    const [existingMembers] = await db.query(
      `SELECT user_id FROM group_members 
       WHERE group_id = ? AND user_id IN (${placeholders})`,
      [id, ...cleanMemberIds]
    );

    const existingIds = existingMembers.map(e => e.user_id);
    
    // Filter out users who are already in the group (in any state)
    const newMembers = cleanMemberIds.filter(userId => !existingIds.includes(userId));
    
    // Check for users who are already members but inactive
    const inactiveMembers = [];
    for (const userId of existingIds) {
      const [memberStatus] = await db.query(
        'SELECT is_active FROM group_members WHERE group_id = ? AND user_id = ?',
        [id, userId]
      );
      if (memberStatus.length && !memberStatus[0].is_active) {
        inactiveMembers.push(userId);
      }
    }

    if (newMembers.length === 0 && inactiveMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected members are already in the group'
      });
    }

    // ✅ FIX: Check valid users with proper SQL
    const allUserIds = [...newMembers, ...inactiveMembers];
    if (allUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid users found to add'
      });
    }

    // Handle both new members and reactivating inactive members
    const addPromises = [];
    
    // Add new members
    for (const userId of newMembers) {
      addPromises.push(
        db.query(
          'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
          [id, userId, 'member']
        )
      );
    }
    
    // Reactivate inactive members
    for (const userId of inactiveMembers) {
      addPromises.push(
        db.query(
          'UPDATE group_members SET is_active = TRUE, role = ? WHERE group_id = ? AND user_id = ?',
          ['member', id, userId]
        )
      );
    }
    
    await Promise.all(addPromises);

    // Send notifications only to newly added/reactivated members
    const notificationPromises = allUserIds.map(userId =>
      createNotification(
        userId,
        'system',
        'Added to Group',
        `${req.user.first_name} ${req.user.last_name} added you to "${group[0].group_name}"`,
        parseInt(id)
      )
    );
    
    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: `${allUserIds.length} member(s) added successfully`,
      added_members: allUserIds,
      details: {
        new_members: newMembers,
        reactivated_members: inactiveMembers
      }
    });
  } catch (error) {
    console.error('Add members error:', error);
    
    // Provide more specific error message for duplicate entry
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Some members are already in the group. Please refresh and try again.'
      });
    }
    
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

    const [group] = await db.query(
      'SELECT created_by FROM group_chats WHERE group_id = ?',
      [id]
    );

    if (group[0].created_by === parseInt(userId) && role === 'member') {
      return res.status(400).json({
        success: false,
        message: 'Cannot demote the group creator'
      });
    }

    await db.query(
      'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
      [role, id, userId]
    );

    res.json({
      success: true,
      message: `Member ${role === 'admin' ? 'promoted to admin' : 'demoted to member'} successfully`
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

    const [result] = await db.query(
      'INSERT INTO group_messages (group_id, sender_id, message_text, has_attachments) VALUES (?, ?, ?, ?)',
      [id, req.user.user_id, message_text?.trim() || '', files?.length > 0]
    );

    const messageId = result.insertId;

    const attachmentData = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileType = getFileType(file.mimetype);
        const filePath = file.path.replace(/\\/g, '/').replace(/^uploads\//, '');
        
        await db.query(
          `INSERT INTO group_message_attachments 
           (message_id, file_name, file_path, file_type, file_size, mime_type) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [messageId, file.originalname, filePath, fileType, file.size, file.mimetype]
        );

        attachmentData.push({
          file_name: file.originalname,
          file_path: filePath,
          file_url: getFileUrl(filePath),
          file_type: fileType,
          file_size: file.size,
          mime_type: file.mimetype
        });
      }
    }

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

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        ...message[0],
        sender_profile_picture: message[0].sender_profile_picture 
          ? getFileUrl(message[0].sender_profile_picture)
          : null,
        attachments: attachmentData
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

// @desc    Get group messages - FIXED
// @route   GET /api/groups/:id/messages
// @access  Private
// @desc    Get group messages - FIXED
// @route   GET /api/groups/:id/messages
// @access  Private
exports.getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check membership
    const [membership] = await db.query(
      `SELECT gm.*, gc.is_active as group_active
       FROM group_members gm 
       JOIN group_chats gc ON gm.group_id = gc.group_id 
       WHERE gm.group_id = ? 
         AND gm.user_id = ? 
         AND gm.is_active = TRUE 
         AND gc.is_active = TRUE`,
      [id, req.user.user_id]
    );

    if (!membership.length) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group or the group is inactive'
      });
    }

    // Get messages - IMPORTANT: Filter based on deletion status
    const [messages] = await db.query(
      `SELECT gm.*, 
              u.first_name as sender_first_name, 
              u.last_name as sender_last_name,
              u.profile_picture as sender_profile_picture
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.user_id
       WHERE gm.group_id = ?
         AND (
           -- Show message if not deleted by sender (for sender's own messages)
           (gm.sender_id = ? AND gm.deleted_by_sender = FALSE)
           OR
           -- Show message if not deleted by current member (for other's messages)
           (gm.sender_id != ? AND (
             gm.deleted_by_members IS NULL 
             OR 
             NOT JSON_CONTAINS(gm.deleted_by_members, CAST(? AS JSON))
           ))
         )
       ORDER BY gm.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, req.user.user_id, req.user.user_id, JSON.stringify(req.user.user_id), parseInt(limit), offset]
    );

    // ✅ FIXED: Format sender profile pictures
    const formattedMessages = messages.map(msg => ({
      ...msg,
      sender_profile_picture: msg.sender_profile_picture 
        ? getFileUrl(msg.sender_profile_picture)
        : null
    }));

    // Get attachments
    if (formattedMessages.length > 0) {
      const messageIds = formattedMessages.map(m => m.message_id);
      
      const [attachments] = await db.query(
        `SELECT * FROM group_message_attachments WHERE message_id IN (?)`,
        [messageIds]
      );

      const attachmentsByMessage = {};
      attachments.forEach(att => {
        if (!attachmentsByMessage[att.message_id]) {
          attachmentsByMessage[att.message_id] = [];
        }
        attachmentsByMessage[att.message_id].push({
          ...att,
          file_url: getFileUrl(att.file_path)
        });
      });

      formattedMessages.forEach(msg => {
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
      messages: formattedMessages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedMessages.length
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
      // Only sender can delete for everyone
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

      // Delete for everyone (actually delete from database)
      await db.query('DELETE FROM group_message_attachments WHERE message_id = ?', [messageId]);
      await db.query('DELETE FROM group_messages WHERE message_id = ?', [messageId]);
      
    } else {
      // Delete for self (soft delete)
      if (msg.sender_id === req.user.user_id) {
        // Sender deleting for themselves
        await db.query(
          'UPDATE group_messages SET deleted_by_sender = TRUE WHERE message_id = ?',
          [messageId]
        );
      } else {
        // Non-sender deleting for themselves
        // Check if already deleted by this member
        let deletedByMembers = [];
        
        if (msg.deleted_by_members) {
          try {
            deletedByMembers = JSON.parse(msg.deleted_by_members);
          } catch (e) {
            console.error('Error parsing deleted_by_members:', e);
            deletedByMembers = [];
          }
        }
        
        // Check if current user already marked this message as deleted
        if (!deletedByMembers.includes(req.user.user_id)) {
          deletedByMembers.push(req.user.user_id);
          
          await db.query(
            'UPDATE group_messages SET deleted_by_members = ? WHERE message_id = ?',
            [JSON.stringify(deletedByMembers), messageId]
          );
        }
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

module.exports = exports;