import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaPaperPlane, FaSearch, FaUsers, FaPlus, FaTimes, 
  FaPaperclip, FaFile, FaTrash, FaDownload,
  FaUserPlus, FaSignOutAlt, FaCog, FaUserMinus, FaEdit,
  FaCheckCircle, FaCamera, FaUser, FaArrowLeft,
  FaComments, FaUserFriends, FaCrown, FaAngleDoubleDown
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl, getFileUrl } from '../utils/profilePictureUtils';

// Constants
const MAX_FILES_PER_MESSAGE = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const MESSAGE_POLL_INTERVAL = 3000;
const SCROLL_THRESHOLD = 100;
const DELETE_FOR_EVERYONE_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes

const GroupChat = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  // State management
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  
  const [groupDetails, setGroupDetails] = useState(null);
  const [connections, setConnections] = useState([]);
  const [schools, setSchools] = useState([]);
  const [batchYears, setBatchYears] = useState([]);
  
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState(null);
  
  const [createFilters, setCreateFilters] = useState({
    search: '',
    school_id: '',
    batch_year: '',
    selectAll: false
  });
  
  const [addMemberFilters, setAddMemberFilters] = useState({
    search: '',
    school_id: '',
    batch_year: '',
    selectAll: false
  });
  
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const messagePollingInterval = useRef(null);
  const messagesContainerRef = useRef(null);

  // Memoized filtered groups
  const filteredGroups = useMemo(() => 
    groups.filter(group =>
      group.group_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [groups, searchTerm]
  );

  // Memoized filter functions
  const getFilteredConnectionsForCreate = useMemo(() => {
    let filtered = [...connections];

    if (createFilters.search) {
      const searchLower = createFilters.search.toLowerCase().trim();
      filtered = filtered.filter(conn => {
        const fullName = `${conn.first_name || ''} ${conn.last_name || ''}`.toLowerCase();
        return fullName.includes(searchLower) || 
               (conn.school_name && conn.school_name.toLowerCase().includes(searchLower));
      });
    }

    if (createFilters.school_id && createFilters.school_id !== '') {
      filtered = filtered.filter(conn => 
        conn.school_id && conn.school_id === parseInt(createFilters.school_id)
      );
    }

    if (createFilters.batch_year && createFilters.batch_year !== '') {
      const selectedYear = parseInt(createFilters.batch_year);
      filtered = filtered.filter(conn => {
        const connYear = conn.batch_year ? parseInt(conn.batch_year) : null;
        return connYear && connYear === selectedYear;
      });
    }

    return filtered;
  }, [connections, createFilters]);

  const getFilteredConnectionsForAddMembers = useMemo(() => {
    let filtered = [...connections];

    if (addMemberFilters.search) {
      const searchLower = addMemberFilters.search.toLowerCase().trim();
      filtered = filtered.filter(conn => {
        const fullName = `${conn.first_name || ''} ${conn.last_name || ''}`.toLowerCase();
        return fullName.includes(searchLower) || 
               (conn.school_name && conn.school_name.toLowerCase().includes(searchLower));
      });
    }

    if (addMemberFilters.school_id && addMemberFilters.school_id !== '') {
      filtered = filtered.filter(conn => 
        conn.school_id && conn.school_id === parseInt(addMemberFilters.school_id)
      );
    }

    if (addMemberFilters.batch_year && addMemberFilters.batch_year !== '') {
      const selectedYear = parseInt(addMemberFilters.batch_year);
      filtered = filtered.filter(conn => {
        const connYear = conn.batch_year ? parseInt(conn.batch_year) : null;
        return connYear && connYear === selectedYear;
      });
    }

    if (groupDetails) {
      filtered = filtered.filter(conn => 
        !groupDetails.members?.some(m => m.user_id === conn.connection_user_id)
      );
    }

    return filtered;
  }, [connections, addMemberFilters, groupDetails]);

  // Cleanup function for URLs
  const cleanupUrls = useCallback(() => {
    previewUrls.forEach(preview => URL.revokeObjectURL(preview.url));
    if (groupAvatarPreview) {
      URL.revokeObjectURL(groupAvatarPreview);
    }
  }, [previewUrls, groupAvatarPreview]);

  // Fetch functions
  const fetchSchoolsAndBatches = useCallback(async () => {
    try {
      const [schoolsRes, connectionsRes] = await Promise.all([
        api.get('/schools?limit=1000'),
        api.get('/connections/with-details')
      ]);
      
      const schoolsList = schoolsRes.data.schools || [];
      setSchools(schoolsList);
      
      const batchYearsSet = new Set();
      
      if (connectionsRes.data.connections) {
        connectionsRes.data.connections.forEach(conn => {
          const year = conn.batch_year || conn.graduation_year || conn.end_year;
          if (year) {
            const yearNum = parseInt(year);
            if (!isNaN(yearNum) && yearNum > 1900 && yearNum < 2100) {
              batchYearsSet.add(yearNum);
            }
          }
        });
      }
      
      if (user?.batch_year) {
        const userYear = parseInt(user.batch_year);
        if (!isNaN(userYear)) {
          batchYearsSet.add(userYear);
        }
      }
      
      const batchYearsArray = Array.from(batchYearsSet).sort((a, b) => b - a);
      setBatchYears(batchYearsArray);
      
    } catch (error) {
      console.error('Failed to load schools/batches:', error);
      toast.error('Failed to load filter options');
    }
  }, [user]);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups || []);
      if (response.data.groups?.length > 0 && !selectedGroup) {
        setSelectedGroup(response.data.groups[0]);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await api.get('/connections/with-details');
      const connectionsData = response.data.connections || [];
      
      const transformedConnections = connectionsData.map(conn => ({
        connection_user_id: conn.connection_user_id,
        first_name: conn.first_name || '',
        last_name: conn.last_name || '',
        profile_picture: conn.profile_picture || null,
        school_id: conn.school_id || null,
        school_name: conn.school_name || null,
        batch_year: conn.batch_year || conn.graduation_year ? parseInt(conn.batch_year || conn.graduation_year) : null,
        current_city: conn.current_city || null,
        current_country: conn.current_country || null,
      }));
      
      setConnections(transformedConnections);
    } catch (error) {
      console.error('Failed to load connections:', error);
      toast.error('Failed to load connections');
    }
  }, []);

  const fetchMessages = useCallback(async (groupId, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get(`/groups/${groupId}/messages?limit=100`);
      setMessages(response.data.messages || []);
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load messages');
      }
      console.error('Failed to load messages:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchGroupDetails = useCallback(async (groupId) => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroupDetails(response.data.group);
      setShowGroupDetails(true);
    } catch (error) {
      toast.error('Failed to load group details');
      console.error('Failed to load group details:', error);
    }
  }, []);

  // Scroll functions
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
      setShouldAutoScroll(isNearBottom);
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  const scrollToBottomManual = useCallback(() => {
    setShouldAutoScroll(true);
    scrollToBottom();
    setShowScrollButton(false);
  }, [scrollToBottom]);

  // Form handlers
  const resetCreateForm = useCallback(() => {
    setGroupName('');
    setGroupDescription('');
    setSelectedMembers([]);
    setCreateFilters({
      search: '',
      school_id: '',
      batch_year: '',
      selectAll: false
    });
    setGroupAvatar(null);
    if (groupAvatarPreview) {
      URL.revokeObjectURL(groupAvatarPreview);
      setGroupAvatarPreview(null);
    }
  }, [groupAvatarPreview]);

  const openCreateModal = useCallback(() => {
    resetCreateForm();
    setShowCreateModal(true);
  }, [resetCreateForm]);

  const openEditModal = useCallback(() => {
    setGroupName(selectedGroup.group_name);
    setGroupDescription(selectedGroup.group_description || '');
    setGroupAvatar(null);
    if (groupAvatarPreview) {
      URL.revokeObjectURL(groupAvatarPreview);
      setGroupAvatarPreview(null);
    }
    setShowGroupDetails(false);
    setShowEditGroupModal(true);
  }, [selectedGroup, groupAvatarPreview]);

  const openAddMembersModal = useCallback(() => {
    setSelectedMembers([]);
    setAddMemberFilters({
      search: '',
      school_id: '',
      batch_year: '',
      selectAll: false
    });
    setShowGroupDetails(false);
    setShowAddMembersModal(true);
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('group_name', groupName.trim());
      formData.append('group_description', groupDescription.trim());
      formData.append('member_ids', JSON.stringify(selectedMembers.map(m => m.connection_user_id)));
      
      if (groupAvatar) {
        formData.append('group_avatar', groupAvatar);
      }

      await api.post('/groups', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Group created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group');
      console.error('Failed to create group:', error);
    }
  }, [groupName, groupDescription, selectedMembers, groupAvatar, resetCreateForm, fetchGroups]);

  const handleEditGroup = useCallback(async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('group_name', groupName.trim());
      formData.append('group_description', groupDescription.trim());
      
      if (groupAvatar) {
        formData.append('group_avatar', groupAvatar);
      }

      await api.put(`/groups/${selectedGroup.group_id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Group updated successfully!');
      setShowEditGroupModal(false);
      
      setGroupName('');
      setGroupDescription('');
      setGroupAvatar(null);
      if (groupAvatarPreview) {
        URL.revokeObjectURL(groupAvatarPreview);
        setGroupAvatarPreview(null);
      }
      
      fetchGroups();
      if (selectedGroup) {
        fetchGroupDetails(selectedGroup.group_id);
        setShowGroupDetails(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update group');
      console.error('Failed to update group:', error);
    }
  }, [groupName, groupDescription, groupAvatar, selectedGroup, groupAvatarPreview, fetchGroups, fetchGroupDetails]);

  const handleAddMembers = useCallback(async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      await api.post(`/groups/${selectedGroup.group_id}/members`, {
        member_ids: selectedMembers.map(m => m.connection_user_id)
      });
      
      toast.success(`${selectedMembers.length} member(s) added successfully!`);
      setShowAddMembersModal(false);
      setSelectedMembers([]);
      setAddMemberFilters({
        search: '',
        school_id: '',
        batch_year: '',
        selectAll: false
      });
      fetchGroupDetails(selectedGroup.group_id);
      fetchGroups();
      setShowGroupDetails(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add members');
      console.error('Failed to add members:', error);
    }
  }, [selectedMembers, selectedGroup, fetchGroupDetails, fetchGroups]);

  const handleRemoveMember = useCallback(async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    const admins = groupDetails.members.filter(m => m.role === 'admin');
    const memberToRemove = groupDetails.members.find(m => m.user_id === userId);
    
    if (memberToRemove.role === 'admin' && admins.length === 1) {
      toast.error('Cannot remove the last admin. Promote another member to admin first.');
      return;
    }

    try {
      await api.delete(`/groups/${selectedGroup.group_id}/members/${userId}`);
      toast.success('Member removed successfully');
      fetchGroupDetails(selectedGroup.group_id);
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
      console.error('Failed to remove member:', error);
    }
  }, [groupDetails, selectedGroup, fetchGroupDetails, fetchGroups]);

  const handleMakeAdmin = useCallback(async (userId) => {
    try {
      await api.put(`/groups/${selectedGroup.group_id}/members/${userId}/role`, {
        role: 'admin'
      });
      toast.success('Member promoted to admin');
      fetchGroupDetails(selectedGroup.group_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update member role');
      console.error('Failed to update member role:', error);
    }
  }, [selectedGroup, fetchGroupDetails]);

  const handleRemoveAdmin = useCallback(async (userId) => {
    const admins = groupDetails.members.filter(m => m.role === 'admin');
    
    if (admins.length === 1) {
      toast.error('Cannot demote the last admin. Promote another member to admin first.');
      return;
    }

    if (!window.confirm('Remove admin privileges from this member?')) {
      return;
    }

    try {
      await api.put(`/groups/${selectedGroup.group_id}/members/${userId}/role`, {
        role: 'member'
      });
      toast.success('Admin privileges removed');
      fetchGroupDetails(selectedGroup.group_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update member role');
      console.error('Failed to update member role:', error);
    }
  }, [groupDetails, selectedGroup, fetchGroupDetails]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + attachments.length > MAX_FILES_PER_MESSAGE) {
      toast.error('Maximum 5 files per message');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum 10MB per file`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrls(prev => [...prev, { file: file.name, url }]);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachments]);

  const handleAvatarSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_AVATAR_SIZE) {
        toast.error('Image too large. Maximum 5MB');
        return;
      }
      
      if (groupAvatarPreview) {
        URL.revokeObjectURL(groupAvatarPreview);
      }
      
      setGroupAvatar(file);
      setGroupAvatarPreview(URL.createObjectURL(file));
    }

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  }, [groupAvatarPreview]);

  const removeAttachment = useCallback((index) => {
    const file = attachments[index];
    setAttachments(prev => prev.filter((_, i) => i !== index));
    
    const previewIndex = previewUrls.findIndex(p => p.file === file.name);
    if (previewIndex !== -1) {
      URL.revokeObjectURL(previewUrls[previewIndex].url);
      setPreviewUrls(prev => prev.filter((_, i) => i !== previewIndex));
    }
  }, [attachments, previewUrls]);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    const formData = new FormData();
    formData.append('message_text', newMessage.trim());
    
    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    const messageText = newMessage.trim();
    const oldAttachments = [...attachments];
    
    const tempMessage = {
      message_id: `temp-${Date.now()}`,
      sender_id: user.user_id,
      message_text: messageText,
      created_at: new Date().toISOString(),
      sender_first_name: user.first_name,
      sender_last_name: user.last_name,
      sender_profile_picture: user.profile_picture,
      attachments: attachments.map(file => ({
        file_name: file.name,
        file_type: file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : 
                   file.type.startsWith('audio/') ? 'audio' : 'document',
        file_size: file.size,
        mime_type: file.type,
        file_url: URL.createObjectURL(file)
      }))
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setAttachments([]);
    
    previewUrls.forEach(preview => URL.revokeObjectURL(preview.url));
    setPreviewUrls([]);

    try {
      const response = await api.post(`/groups/${selectedGroup.group_id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessages(prev => 
        prev.map(msg => 
          msg.message_id === tempMessage.message_id ? response.data.data : msg
        )
      );
      
      fetchGroups();
      toast.success('Message sent successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
      setNewMessage(messageText);
      setAttachments(oldAttachments);
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  }, [newMessage, attachments, sending, user, selectedGroup, previewUrls, fetchGroups]);

  const deleteMessage = useCallback(async (messageId, deleteFor = 'self') => {
    if (!window.confirm(`Delete this message for ${deleteFor === 'everyone' ? 'everyone' : 'yourself'}?`)) {
      return;
    }

    try {
      await api.delete(`/groups/messages/${messageId}?delete_for=${deleteFor}`);
      setMessages(prev => prev.filter(m => m.message_id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
      console.error('Failed to delete message:', error);
    }
  }, []);

  const leaveGroup = useCallback(async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      await api.delete(`/groups/${selectedGroup.group_id}/leave`);
      toast.success('Left group successfully');
      setGroups(prev => prev.filter(g => g.group_id !== selectedGroup.group_id));
      setSelectedGroup(groups[0] || null);
      setShowGroupDetails(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave group');
      console.error('Failed to leave group:', error);
    }
  }, [selectedGroup, groups]);

  const deleteGroup = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/groups/${selectedGroup.group_id}`);
      toast.success('Group deleted successfully');
      setGroups(prev => prev.filter(g => g.group_id !== selectedGroup.group_id));
      setSelectedGroup(groups[0] || null);
      setShowGroupDetails(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete group');
      console.error('Failed to delete group:', error);
    }
  }, [selectedGroup, groups]);

  const toggleMemberSelection = useCallback((member) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.connection_user_id === member.connection_user_id);
      if (exists) {
        return prev.filter(m => m.connection_user_id !== member.connection_user_id);
      }
      return [...prev, member];
    });
  }, []);

  // Utility functions
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const formatMessageTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getInitials = useCallback((name) => {
    if (!name) return '??';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  const renderAttachment = useCallback((attachment) => {
    const fileUrl = getFileUrl(attachment.file_path || attachment.file_url);
    const isImage = attachment.file_type === 'image' || 
                   (attachment.mime_type && attachment.mime_type.startsWith('image/'));
    const isVideo = attachment.file_type === 'video' || 
                   (attachment.mime_type && attachment.mime_type.startsWith('video/'));

    if (isImage) {
      return (
        <div key={attachment.attachment_id || attachment.file_name} className="relative">
          <img
            src={fileUrl}
            alt={attachment.file_name}
            className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(fileUrl, '_blank')}
            onError={(e) => {
              console.error('Image load error:', fileUrl);
              e.target.style.display = 'none';
              const fallbackDiv = document.createElement('div');
              fallbackDiv.className = 'flex items-center gap-2 bg-gray-100 p-3 rounded-lg';
              fallbackDiv.innerHTML = `
                <span>Image not available</span>
                ${!fileUrl.startsWith('blob:') ? `<a href="${fileUrl}" download class="ml-2 text-blue-500">Download</a>` : ''}
              `;
              e.target.parentNode.appendChild(fallbackDiv);
            }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div key={attachment.attachment_id || attachment.file_name} className="relative">
          <video
            src={fileUrl}
            controls
            className="max-w-xs max-h-64 rounded-lg"
            onError={(e) => {
              console.error('Video load error:', fileUrl);
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <a
        key={attachment.attachment_id || attachment.file_name}
        href={fileUrl}
        download={attachment.file_name}
        className="flex items-center space-x-2 p-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg hover:from-gray-200 hover:to-gray-100 transition-colors border border-gray-200"
      >
        <FaFile className="text-indigo-600" />
        <span className="text-sm text-gray-900">{attachment.file_name}</span>
        <FaDownload className="text-indigo-500 text-xs" />
      </a>
    );
  }, []);

  // Effects
  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access group chat');
      navigate('/login');
      return;
    }

    fetchGroups();
    fetchConnections();
    fetchSchoolsAndBatches();
    
    return () => {
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current);
      }
      cleanupUrls();
    };
  }, [user, navigate, fetchGroups, fetchConnections, fetchSchoolsAndBatches, cleanupUrls]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup.group_id);
      
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current);
      }
      
      messagePollingInterval.current = setInterval(() => {
        fetchMessages(selectedGroup.group_id, true);
      }, MESSAGE_POLL_INTERVAL);
    }

    return () => {
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current);
      }
    };
  }, [selectedGroup, fetchMessages]);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
    
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
      setShowScrollButton(!isNearBottom);
    }
  }, [messages, shouldAutoScroll, scrollToBottom]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <FaUserFriends className="mx-auto h-16 w-16 text-indigo-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access group chat</p>
        </div>
      </div>
    );
  }

  if (loading && groups.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <Header navigate={navigate} openCreateModal={openCreateModal} />
      
      <div className="flex-1 flex overflow-hidden">
        <GroupsSidebar 
          filteredGroups={filteredGroups}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          openCreateModal={openCreateModal}
          getInitials={getInitials}
        />

        <MainChatArea
          selectedGroup={selectedGroup}
          messages={messages}
          loading={loading}
          sending={sending}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          attachments={attachments}
          previewUrls={previewUrls}
          showScrollButton={showScrollButton}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          user={user}
          handleScroll={handleScroll}
          scrollToBottomManual={scrollToBottomManual}
          sendMessage={sendMessage}
          deleteMessage={deleteMessage}
          handleFileSelect={handleFileSelect}
          removeAttachment={removeAttachment}
          fileInputRef={fileInputRef}
          fetchGroupDetails={fetchGroupDetails}
          openCreateModal={openCreateModal}
          renderAttachment={renderAttachment}
          formatMessageTime={formatMessageTime}
          getInitials={getInitials}
        />
      </div>

      {showCreateModal && (
        <CreateGroupModal
          groupName={groupName}
          setGroupName={setGroupName}
          groupDescription={groupDescription}
          setGroupDescription={setGroupDescription}
          groupAvatarPreview={groupAvatarPreview}
          avatarInputRef={avatarInputRef}
          handleAvatarSelect={handleAvatarSelect}
          createFilters={createFilters}
          setCreateFilters={setCreateFilters}
          schools={schools}
          batchYears={batchYears}
          selectedMembers={selectedMembers}
          getFilteredConnectionsForCreate={getFilteredConnectionsForCreate}
          toggleMemberSelection={toggleMemberSelection}
          handleCreateGroup={handleCreateGroup}
          setShowCreateModal={setShowCreateModal}
          resetCreateForm={resetCreateForm}
          getInitials={getInitials}
        />
      )}

      {showEditGroupModal && (
        <EditGroupModal
          groupName={groupName}
          setGroupName={setGroupName}
          groupDescription={groupDescription}
          setGroupDescription={setGroupDescription}
          groupAvatarPreview={groupAvatarPreview}
          selectedGroup={selectedGroup}
          avatarInputRef={avatarInputRef}
          handleAvatarSelect={handleAvatarSelect}
          handleEditGroup={handleEditGroup}
          setShowEditGroupModal={setShowEditGroupModal}
          setGroupAvatar={setGroupAvatar}
          getInitials={getInitials}
        />
      )}

      {showAddMembersModal && (
        <AddMembersModal
          addMemberFilters={addMemberFilters}
          setAddMemberFilters={setAddMemberFilters}
          schools={schools}
          batchYears={batchYears}
          selectedMembers={selectedMembers}
          getFilteredConnectionsForAddMembers={getFilteredConnectionsForAddMembers}
          toggleMemberSelection={toggleMemberSelection}
          handleAddMembers={handleAddMembers}
          setShowAddMembersModal={setShowAddMembersModal}
          setSelectedMembers={setSelectedMembers}
        />
      )}

      {showGroupDetails && groupDetails && (
        <GroupDetailsModal
          groupDetails={groupDetails}
          selectedGroup={selectedGroup}
          user={user}
          setShowGroupDetails={setShowGroupDetails}
          openEditModal={openEditModal}
          openAddMembersModal={openAddMembersModal}
          handleRemoveMember={handleRemoveMember}
          handleMakeAdmin={handleMakeAdmin}
          handleRemoveAdmin={handleRemoveAdmin}
          leaveGroup={leaveGroup}
          deleteGroup={deleteGroup}
          getInitials={getInitials}
        />
      )}
    </div>
  );
};

// Extracted Components for better organization
const Header = React.memo(({ navigate, openCreateModal }) => (
  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 shadow-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-white hover:text-blue-100"
        >
          <FaArrowLeft className="mr-2" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Group Chats</h1>
          <p className="text-blue-100 text-sm mt-1">Connect with your groups</p>
        </div>
      </div>
      <button
        onClick={openCreateModal}
        className="flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-blue-50 transition-colors shadow-md"
      >
        <FaPlus className="mr-2" />
        New Group
      </button>
    </div>
  </div>
));

const GroupsSidebar = React.memo(({ 
  filteredGroups, 
  searchTerm, 
  setSearchTerm, 
  selectedGroup, 
  setSelectedGroup, 
  openCreateModal,
  getInitials 
}) => (
  <div className="w-80 bg-white border-r flex flex-col shadow-lg">
    <div className="p-4 border-b bg-gray-50">
      <div className="relative">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      {filteredGroups.length === 0 ? (
        <div className="p-8 text-center">
          <FaComments className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">{searchTerm ? 'No groups found' : 'No groups yet'}</p>
          {!searchTerm && (
            <button onClick={openCreateModal} className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
              Create your first group
            </button>
          )}
        </div>
      ) : (
        filteredGroups.map((group) => (
          <div
            key={group.group_id}
            onClick={() => setSelectedGroup(group)}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedGroup?.group_id === group.group_id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {group.group_avatar ? (
                  <img src={getFileUrl(group.group_avatar)} alt={group.group_name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {getInitials(group.group_name)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">{group.group_name}</p>
                    <p className="text-xs text-gray-500">{group.member_count || 0} members</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
));

const MainChatArea = React.memo(({ 
  selectedGroup, messages, loading, sending, newMessage, setNewMessage, 
  attachments, previewUrls, showScrollButton, messagesContainerRef, messagesEndRef,
  user, handleScroll, scrollToBottomManual, sendMessage, deleteMessage, 
  handleFileSelect, removeAttachment, fileInputRef, fetchGroupDetails, 
  openCreateModal, renderAttachment, formatMessageTime, getInitials 
}) => {
  if (!selectedGroup) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FaUserFriends className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">Select a group to start chatting</p>
          <button onClick={openCreateModal} className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 shadow-md">
            Create New Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <ChatHeader 
        selectedGroup={selectedGroup} 
        fetchGroupDetails={fetchGroupDetails}
        getInitials={getInitials}
      />

      <MessagesArea
        messages={messages}
        loading={loading}
        messagesContainerRef={messagesContainerRef}
        messagesEndRef={messagesEndRef}
        showScrollButton={showScrollButton}
        user={user}
        handleScroll={handleScroll}
        scrollToBottomManual={scrollToBottomManual}
        deleteMessage={deleteMessage}
        renderAttachment={renderAttachment}
        formatMessageTime={formatMessageTime}
      />

      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        attachments={attachments}
        previewUrls={previewUrls}
        sending={sending}
        sendMessage={sendMessage}
        handleFileSelect={handleFileSelect}
        removeAttachment={removeAttachment}
        fileInputRef={fileInputRef}
      />
    </div>
  );
});

const ChatHeader = React.memo(({ selectedGroup, fetchGroupDetails, getInitials }) => (
  <div className="bg-gradient-to-r from-white to-gray-50 border-b px-6 py-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => fetchGroupDetails(selectedGroup.group_id)}>
        {selectedGroup.group_avatar ? (
          <img src={getFileUrl(selectedGroup.group_avatar)} alt={selectedGroup.group_name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {getInitials(selectedGroup.group_name)}
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">{selectedGroup.group_name}</p>
          <p className="text-xs text-gray-500">{selectedGroup.member_count || 0} members</p>
        </div>
      </div>
      <button onClick={() => fetchGroupDetails(selectedGroup.group_id)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <FaCog className="text-xl" />
      </button>
    </div>
  </div>
));

const MessagesArea = React.memo(({ 
  messages, loading, messagesContainerRef, messagesEndRef, showScrollButton,
  user, handleScroll, scrollToBottomManual, deleteMessage, renderAttachment, formatMessageTime 
}) => (
  <div 
    ref={messagesContainerRef}
    onScroll={handleScroll}
    className="flex-1 overflow-y-auto p-6 space-y-4 relative bg-gradient-to-b from-blue-50 to-purple-50"
    style={{ maxHeight: 'calc(100vh - 200px)' }}
  >
    {showScrollButton && (
      <button
        onClick={scrollToBottomManual}
        className="fixed bottom-24 right-6 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-3 rounded-full shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-110"
        title="Scroll to bottom"
      >
        <FaAngleDoubleDown className="text-xl" />
      </button>
    )}

    {loading && messages.length === 0 ? (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    ) : messages.length === 0 ? (
      <div className="text-center py-12">
        <FaComments className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No messages yet</p>
        <p className="text-sm text-gray-400 mt-1">Be the first to send a message!</p>
      </div>
    ) : (
      messages.map((msg) => (
        <MessageItem 
          key={msg.message_id}
          msg={msg}
          user={user}
          deleteMessage={deleteMessage}
          renderAttachment={renderAttachment}
          formatMessageTime={formatMessageTime}
        />
      ))
    )}
    <div ref={messagesEndRef} />
  </div>
));

const MessageItem = React.memo(({ msg, user, deleteMessage, renderAttachment, formatMessageTime }) => {
  const canDeleteForEveryone = msg.created_at && (Date.now() - new Date(msg.created_at).getTime()) < DELETE_FOR_EVERYONE_TIME_LIMIT;
  
  return (
    <div className="flex items-start space-x-3">
      <img 
        src={getAvatarUrl(msg.sender_profile_picture, msg.sender_first_name, msg.sender_last_name)} 
        alt={msg.sender_first_name} 
        className="w-8 h-8 rounded-full" 
      />

      <div className="flex-1 group">
        <div className="flex items-baseline space-x-2">
          <span className="font-medium text-sm text-gray-900">
            {msg.sender_first_name} {msg.sender_last_name}
            {msg.sender_id === user.user_id && ' (You)'}
          </span>
          <span className="text-xs text-gray-400">{formatMessageTime(msg.created_at)}</span>
          {msg.sender_id === user.user_id && (
            <button
              onClick={() => {
                if (canDeleteForEveryone) {
                  const choice = window.confirm('Delete for everyone? Click OK for everyone, Cancel for just you.');
                  deleteMessage(msg.message_id, choice ? 'everyone' : 'self');
                } else {
                  deleteMessage(msg.message_id, 'self');
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-red-600 hover:bg-red-50 p-1 rounded transition-opacity"
            >
              <FaTrash className="text-xs" />
            </button>
          )}
        </div>
        <div className={`mt-1 border rounded-lg p-3 max-w-2xl shadow-sm ${
          msg.sender_id === user.user_id 
            ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white' 
            : 'bg-gradient-to-r from-gray-100 to-white text-gray-900'
        }`}>
          {msg.message_text && <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {msg.attachments.map((attachment, idx) => (
                <div key={idx}>{renderAttachment(attachment)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const MessageInput = React.memo(({ 
  newMessage, setNewMessage, attachments, previewUrls, sending, 
  sendMessage, handleFileSelect, removeAttachment, fileInputRef 
}) => (
  <form onSubmit={sendMessage} className="bg-gradient-to-r from-white to-gray-50 border-t p-4 shadow-lg">
    {attachments.length > 0 && (
      <div className="mb-2 flex flex-wrap gap-2">
        {attachments.map((file, index) => {
          const preview = previewUrls.find(p => p.file === file.name);
          return (
            <div key={index} className="relative group">
              {preview ? (
                <img src={preview.url} alt={file.name} className="h-20 w-20 object-cover rounded shadow" />
              ) : (
                <div className="h-20 w-20 bg-gradient-to-r from-gray-100 to-gray-50 rounded flex flex-col items-center justify-center p-2 shadow">
                  <FaFile className="text-indigo-400 mb-1" />
                  <p className="text-xs text-gray-600 truncate w-full text-center">
                    {file.name.length > 10 ? file.name.substring(0, 10) + '...' : file.name}
                  </p>
                </div>
              )}
              <button 
                type="button" 
                onClick={() => removeAttachment(index)} 
                className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          );
        })}
      </div>
    )}
    
    <div className="flex space-x-2">
      <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*,video/*" onChange={handleFileSelect} className="hidden" />
      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <FaPaperclip />
      </button>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
          }
        }}
        placeholder="Type a message..."
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
        disabled={sending}
      />
      <button 
        type="submit" 
        disabled={(!newMessage.trim() && attachments.length === 0) || sending} 
        className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
      >
        {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FaPaperPlane />}
      </button>
    </div>
  </form>
));

const CreateGroupModal = React.memo(({ 
  groupName, setGroupName, groupDescription, setGroupDescription, groupAvatarPreview,
  avatarInputRef, handleAvatarSelect, createFilters, setCreateFilters, schools, batchYears,
  selectedMembers, getFilteredConnectionsForCreate, toggleMemberSelection, handleCreateGroup,
  setShowCreateModal, resetCreateForm, getInitials 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <ModalHeader 
        title="Create New Group"
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
      />
      
      <div className="p-6 space-y-4">
        <AvatarUpload
          avatarPreview={groupAvatarPreview}
          avatarInputRef={avatarInputRef}
          handleAvatarSelect={handleAvatarSelect}
          name={groupName || 'New Group'}
          getInitials={getInitials}
        />

        <FormInput
          label="Group Name *"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          maxLength={100}
        />

        <FormTextarea
          label="Description"
          value={groupDescription}
          onChange={(e) => setGroupDescription(e.target.value)}
          placeholder="Enter group description"
          rows={3}
          maxLength={500}
        />

        <MemberFilters
          filters={createFilters}
          setFilters={setCreateFilters}
          schools={schools}
          batchYears={batchYears}
        />

        <MemberSelection
          selectedMembers={selectedMembers}
          filteredConnections={getFilteredConnectionsForCreate}
          toggleMemberSelection={toggleMemberSelection}
          filters={createFilters}
          setFilters={setCreateFilters}
        />
      </div>

      <ModalFooter
        onCancel={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
        onSubmit={handleCreateGroup}
        submitText="Create Group"
        submitDisabled={!groupName.trim() || selectedMembers.length === 0}
      />
    </div>
  </div>
));

const EditGroupModal = React.memo(({ 
  groupName, setGroupName, groupDescription, setGroupDescription, groupAvatarPreview,
  selectedGroup, avatarInputRef, handleAvatarSelect, handleEditGroup,
  setShowEditGroupModal, setGroupAvatar, getInitials 
}) => {
  const handleClose = useCallback(() => {
    setShowEditGroupModal(false);
    setGroupName('');
    setGroupDescription('');
    setGroupAvatar(null);
    if (groupAvatarPreview) {
      URL.revokeObjectURL(groupAvatarPreview);
    }
  }, [setShowEditGroupModal, setGroupName, setGroupDescription, setGroupAvatar, groupAvatarPreview]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <ModalHeader title="Edit Group" onClose={handleClose} />
        
        <div className="p-6 space-y-4">
          <AvatarUpload
            avatarPreview={groupAvatarPreview || (selectedGroup && getFileUrl(selectedGroup.group_avatar))}
            avatarInputRef={avatarInputRef}
            handleAvatarSelect={handleAvatarSelect}
            name={groupName || selectedGroup?.group_name}
            getInitials={getInitials}
          />

          <FormInput
            label="Group Name *"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            maxLength={100}
          />

          <FormTextarea
            label="Description"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder="Enter group description"
            rows={3}
            maxLength={500}
          />
        </div>

        <ModalFooter
          onCancel={handleClose}
          onSubmit={handleEditGroup}
          submitText="Save Changes"
          submitDisabled={!groupName.trim()}
        />
      </div>
    </div>
  );
});

const AddMembersModal = React.memo(({ 
  addMemberFilters, setAddMemberFilters, schools, batchYears, selectedMembers,
  getFilteredConnectionsForAddMembers, toggleMemberSelection, handleAddMembers,
  setShowAddMembersModal, setSelectedMembers 
}) => {
  const handleClose = useCallback(() => {
    setShowAddMembersModal(false);
    setSelectedMembers([]);
    setAddMemberFilters({
      search: '',
      school_id: '',
      batch_year: '',
      selectAll: false
    });
  }, [setShowAddMembersModal, setSelectedMembers, setAddMemberFilters]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <ModalHeader title="Add Members to Group" onClose={handleClose} />
        
        <div className="p-6">
          <MemberFilters
            filters={addMemberFilters}
            setFilters={setAddMemberFilters}
            schools={schools}
            batchYears={batchYears}
          />

          <MemberSelection
            selectedMembers={selectedMembers}
            filteredConnections={getFilteredConnectionsForAddMembers}
            toggleMemberSelection={toggleMemberSelection}
            filters={addMemberFilters}
            setFilters={setAddMemberFilters}
          />
        </div>

        <ModalFooter
          onCancel={handleClose}
          onSubmit={handleAddMembers}
          submitText={`Add ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`}
          submitDisabled={selectedMembers.length === 0}
        />
      </div>
    </div>
  );
});

const GroupDetailsModal = React.memo(({ 
  groupDetails, selectedGroup, user, setShowGroupDetails, openEditModal, openAddMembersModal,
  handleRemoveMember, handleMakeAdmin, handleRemoveAdmin, leaveGroup, deleteGroup, getInitials 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <ModalHeader title="Group Info" onClose={() => setShowGroupDetails(false)} />
      
      <div className="p-6 space-y-6">
        <GroupInfo groupDetails={groupDetails} getInitials={getInitials} />

        {groupDetails.my_role === 'admin' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={openEditModal}
              className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors shadow-md"
            >
              <FaEdit className="mr-2" />
              Edit Group
            </button>
            <button
              onClick={openAddMembersModal}
              className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-colors shadow-md"
            >
              <FaUserPlus className="mr-2" />
              Add Members
            </button>
          </div>
        )}

        <MembersList
          groupDetails={groupDetails}
          user={user}
          handleRemoveMember={handleRemoveMember}
          handleMakeAdmin={handleMakeAdmin}
          handleRemoveAdmin={handleRemoveAdmin}
        />

        <div className="pt-4 border-t space-y-2">
          {groupDetails.created_by === user.user_id ? (
            <button
              onClick={deleteGroup}
              className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-colors shadow-md"
            >
              <FaTrash className="mr-2" />
              Delete Group
            </button>
          ) : (
            <button
              onClick={leaveGroup}
              className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-colors shadow-md"
            >
              <FaSignOutAlt className="mr-2" />
              Leave Group
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
));

// Reusable UI Components
const ModalHeader = React.memo(({ title, onClose }) => (
  <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 flex justify-between items-center z-10">
    <h2 className="text-xl font-bold">{title}</h2>
    <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
      <FaTimes className="text-xl" />
    </button>
  </div>
));

const ModalFooter = React.memo(({ onCancel, onSubmit, submitText, submitDisabled }) => (
  <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t flex justify-end space-x-3">
    <button
      onClick={onCancel}
      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
    >
      Cancel
    </button>
    <button
      onClick={onSubmit}
      disabled={submitDisabled}
      className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
    >
      {submitText}
    </button>
  </div>
));

const AvatarUpload = React.memo(({ avatarPreview, avatarInputRef, handleAvatarSelect, name, getInitials }) => (
  <div className="flex flex-col items-center">
    <input
      ref={avatarInputRef}
      type="file"
      accept="image/*"
      onChange={handleAvatarSelect}
      className="hidden"
    />
    <div
      onClick={() => avatarInputRef.current?.click()}
      className="relative cursor-pointer group"
    >
      {avatarPreview ? (
        <img
          src={avatarPreview}
          alt="Group avatar"
          className="w-24 h-24 rounded-full object-cover shadow-lg"
        />
      ) : (
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {getInitials(name)}
        </div>
      )}
      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <FaCamera className="text-white text-2xl" />
      </div>
    </div>
    <p className="text-sm text-gray-500 mt-2">Click to upload avatar (optional)</p>
  </div>
));

const FormInput = React.memo(({ label, value, onChange, placeholder, maxLength }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      maxLength={maxLength}
    />
  </div>
));

const FormTextarea = React.memo(({ label, value, onChange, placeholder, rows, maxLength }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      maxLength={maxLength}
    />
  </div>
));

const MemberFilters = React.memo(({ filters, setFilters, schools, batchYears }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Filter Members
    </label>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="relative">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, selectAll: false }))}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <select
        value={filters.school_id}
        onChange={(e) => setFilters(prev => ({ ...prev, school_id: e.target.value, selectAll: false }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        <option value="">All Schools</option>
        {schools.map((school) => (
          <option key={school.school_id} value={school.school_id}>
            {school.school_name}
          </option>
        ))}
      </select>

      <select
        value={filters.batch_year}
        onChange={(e) => setFilters(prev => ({ ...prev, batch_year: e.target.value, selectAll: false }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        <option value="">All Batches</option>
        {batchYears.map((year) => (
          <option key={year} value={year}>
            Batch of {year}
          </option>
        ))}
      </select>
    </div>
  </div>
));

const MemberSelection = React.memo(({ selectedMembers, filteredConnections, toggleMemberSelection, filters, setFilters }) => (
  <div>
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg mb-3 border border-gray-200">
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={filters.selectAll}
          onChange={(e) => {
            const checked = e.target.checked;
            setFilters(prev => ({ ...prev, selectAll: checked }));
          }}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm font-medium text-gray-700">
          Select All ({filteredConnections.length} available)
        </span>
      </label>
      
      {selectedMembers.length > 0 && (
        <button
          onClick={() => setFilters(prev => ({ ...prev, selectAll: false }))}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Clear Selection
        </button>
      )}
    </div>

    {selectedMembers.length > 0 && (
      <SelectedMembersChips 
        selectedMembers={selectedMembers}
        toggleMemberSelection={toggleMemberSelection}
      />
    )}

    <MembersList2
      filteredConnections={filteredConnections}
      selectedMembers={selectedMembers}
      toggleMemberSelection={toggleMemberSelection}
      filters={filters}
    />
  </div>
));

const SelectedMembersChips = React.memo(({ selectedMembers, toggleMemberSelection }) => (
  <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg max-h-32 overflow-y-auto border border-indigo-100">
    {selectedMembers.map((member) => (
      <div
        key={member.connection_user_id}
        className="flex items-center space-x-2 bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 px-3 py-1 rounded-full text-sm shadow-sm"
      >
        <span className="truncate max-w-[150px]">
          {member.first_name} {member.last_name}
        </span>
        <button
          onClick={() => toggleMemberSelection(member)}
          className="hover:from-indigo-200 hover:to-blue-200 rounded-full p-0.5 flex-shrink-0"
        >
          <FaTimes className="text-xs" />
        </button>
      </div>
    ))}
  </div>
));

const MembersList2 = React.memo(({ filteredConnections, selectedMembers, toggleMemberSelection, filters }) => (
  <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto shadow-inner">
    {filteredConnections.length === 0 ? (
      <div className="p-8 text-center">
        <FaUser className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">
          {filters.search || filters.school_id || filters.batch_year
            ? 'No connections match your filters'
            : 'No connections available to add'}
        </p>
      </div>
    ) : (
      filteredConnections.map((conn) => {
        const isSelected = selectedMembers.some(
          m => m.connection_user_id === conn.connection_user_id
        );
        return (
          <div
            key={conn.connection_user_id}
            onClick={() => toggleMemberSelection(conn)}
            className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 transition-colors ${
              isSelected ? 'bg-gradient-to-r from-indigo-50 to-blue-50' : ''
            }`}
          >
            <img
              src={getAvatarUrl(conn.profile_picture, conn.first_name, conn.last_name)}
              alt={conn.first_name}
              className="w-10 h-10 rounded-full flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {conn.first_name} {conn.last_name}
              </p>
              {(conn.school_name || conn.batch_year) && (
                <p className="text-xs text-gray-500 truncate">
                  {conn.school_name && conn.batch_year 
                    ? `${conn.school_name} '${conn.batch_year.toString().slice(-2)}`
                    : conn.school_name || `Batch of ${conn.batch_year}`}
                </p>
              )}
            </div>
            {isSelected && (
              <FaCheckCircle className="text-indigo-600 text-xl flex-shrink-0" />
            )}
          </div>
        );
      })
    )}
  </div>
));

const GroupInfo = React.memo(({ groupDetails, getInitials }) => (
  <div className="text-center">
    {groupDetails.group_avatar ? (
      <img
        src={getFileUrl(groupDetails.group_avatar)}
        alt={groupDetails.group_name}
        className="w-24 h-24 rounded-full mx-auto object-cover shadow-lg"
      />
    ) : (
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-lg">
        {getInitials(groupDetails.group_name)}
      </div>
    )}
    <h3 className="text-2xl font-bold text-gray-900 mt-4">{groupDetails.group_name}</h3>
    {groupDetails.group_description && (
      <p className="text-gray-600 mt-2">{groupDetails.group_description}</p>
    )}
    <p className="text-sm text-gray-500 mt-1">{groupDetails.members?.length || 0} members</p>
  </div>
));

const MembersList = React.memo(({ groupDetails, user, handleRemoveMember, handleMakeAdmin, handleRemoveAdmin }) => (
  <div>
    <h3 className="font-semibold text-gray-900 mb-3">Members ({groupDetails.members?.length || 0})</h3>
    <div className="space-y-2">
      {groupDetails.members?.map((member) => {
        const isCreator = member.user_id === groupDetails.created_by;
        const isAdmin = member.role === 'admin';
        const isSelf = member.user_id === user.user_id;
        const canManage = groupDetails.my_role === 'admin' && !isSelf && !isCreator;
        
        return (
          <div
            key={member.user_id}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg hover:from-gray-100 hover:to-blue-100 transition-colors border border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <img
                src={getAvatarUrl(member.profile_picture, member.first_name, member.last_name)}
                alt={member.first_name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium text-gray-900">
                  {member.first_name} {member.last_name}
                  {isSelf && ' (You)'}
                </p>
                {member.current_city && (
                  <p className="text-sm text-gray-500">{member.current_city}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isCreator && (
                <span className="px-3 py-1 text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full font-medium flex items-center shadow-sm">
                  <FaCrown className="mr-1" />
                  Creator
                </span>
              )}
              {isAdmin && !isCreator && (
                <span className="px-3 py-1 text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full font-medium shadow-sm">
                  Admin
                </span>
              )}
              {canManage && (
                <div className="flex space-x-1">
                  {!isAdmin ? (
                    <button
                      onClick={() => handleMakeAdmin(member.user_id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      title="Make admin"
                    >
                      <FaUserPlus className="text-sm" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRemoveAdmin(member.user_id)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Remove admin"
                    >
                      <FaUserMinus className="text-sm" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remove member"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
));

export default GroupChat;