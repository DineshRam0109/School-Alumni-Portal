import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaPaperPlane, FaSearch, FaPaperclip, FaTimes, 
  FaImage, FaFile, FaTrash, FaDownload, FaVideo, FaFilePdf,
  FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAudio, FaArrowLeft,
  FaUser, FaComment, FaUserPlus, FaAngleDoubleDown, FaBars
} from 'react-icons/fa';
import { FiSend } from 'react-icons/fi';
import { getAvatarUrl as getAvatarUrlUtil, getFileUrl } from '../utils/profilePictureUtils';

const POLLING_INTERVAL = 5000;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MESSAGE_DELETE_WINDOW = 15 * 60 * 1000;

const Messages = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  // Core state
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  // UI state
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [shouldScrollRef, setShouldScrollRef] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagePollingInterval = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const initialUserLoadedRef = useRef(false);

  // Memoized values
  const filteredConversations = useMemo(() => 
    conversations.filter(conv =>
      `${conv.first_name} ${conv.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [conversations, searchTerm]
  );

  // Helper functions
  const getFileIcon = useCallback((mimeType) => {
    if (!mimeType) return <FaFile className="text-gray-600" />;
    if (mimeType.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('msword')) 
      return <FaFileWord className="text-blue-500" />;
    if (mimeType.includes('excel') || mimeType.includes('sheet') || mimeType.includes('spreadsheet')) 
      return <FaFileExcel className="text-green-500" />;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) 
      return <FaFilePowerpoint className="text-orange-500" />;
    if (mimeType.includes('audio')) return <FaFileAudio className="text-purple-500" />;
    if (mimeType.includes('video')) return <FaVideo className="text-pink-500" />;
    if (mimeType.includes('image')) return <FaImage className="text-indigo-500" />;
    return <FaFile className="text-gray-600" />;
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

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

  const getAvatarUrl = useCallback((firstName, lastName, profilePicture) => {
    return getAvatarUrlUtil({ first_name: firstName, last_name: lastName, profile_picture: profilePicture });
  }, []);

  // Scroll functions
  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const nearBottom = isNearBottom();
    setShouldScrollRef(nearBottom);
    setShowScrollButton(!nearBottom);
  }, [isNearBottom]);

  const scrollToBottomManual = useCallback(() => {
    setShouldScrollRef(true);
    scrollToBottom();
    setShowScrollButton(false);
  }, [scrollToBottom]);

  // API calls
  const checkConnectionStatus = useCallback(async (userId) => {
    try {
      const response = await api.get(`/connections/status/${userId}`);
      const status = response.data;
      
      setConnectionStatus(status);
      
      const isConnected = status.status === 'accepted';
      const hasMentorship = status.mentorship_relationship === true;
      
      setShowConnectionAlert(!isConnected && !hasMentorship);
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setShowConnectionAlert(true);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (userId, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get(`/messages/conversation/${userId}?limit=100`);
      
      if (response.data.messages) {
        setMessages(response.data.messages || []);
        if (!silent) {
          setShouldScrollRef(true);
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Failed to load messages:', error);
        if (error.response?.status === 403) {
          setShowConnectionAlert(true);
          setMessages([]);
        } else {
          toast.error('Failed to load messages');
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const sendConnectionRequest = useCallback(async () => {
    try {
      await api.post('/connections/send', {
        receiver_id: selectedUser.user_id
      });
      toast.success('Connection request sent');
      setShowConnectionAlert(false);
      checkConnectionStatus(selectedUser.user_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send connection request');
    }
  }, [selectedUser, checkConnectionStatus]);

  // File handlers
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + attachments.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files per message`);
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
  }, [attachments.length]);

  const removeAttachment = useCallback((index) => {
    const file = attachments[index];
    setAttachments(prev => prev.filter((_, i) => i !== index));
    
    const previewIndex = previewUrls.findIndex(p => p.file === file.name);
    if (previewIndex !== -1) {
      URL.revokeObjectURL(previewUrls[previewIndex].url);
      setPreviewUrls(prev => prev.filter((_, i) => i !== previewIndex));
    }
  }, [attachments, previewUrls]);

  // Message operations
  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    if (showConnectionAlert) {
      toast.error('You need to be connected to send messages');
      return;
    }

    setSending(true);
    setShouldScrollRef(true);
    
    const formData = new FormData();
    formData.append('receiver_id', selectedUser.user_id);
    formData.append('message_text', newMessage.trim());
    
    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    const messageText = newMessage.trim();
    const oldAttachments = [...attachments];
    
    const tempMessage = {
      message_id: `temp-${Date.now()}`,
      sender_id: user.user_id,
      receiver_id: selectedUser.user_id,
      message_text: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
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
      const response = await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages(prev => 
        prev.map(msg => 
          msg.message_id === tempMessage.message_id ? response.data.data : msg
        )
      );
      
      fetchConversations();
      toast.success('Message sent successfully');
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.message_id !== tempMessage.message_id));
      
      setNewMessage(messageText);
      setAttachments(oldAttachments);
      
      if (error.response?.status === 403) {
        toast.error('You can only message your connections or mentorship partners');
        setShowConnectionAlert(true);
      } else {
        toast.error(error.response?.data?.message || 'Failed to send message');
      }
    } finally {
      setSending(false);
    }
  }, [newMessage, attachments, sending, showConnectionAlert, selectedUser, user, previewUrls, fetchConversations]);

  const deleteMessage = useCallback(async (messageId, deleteFor = 'self') => {
    const message = messages.find(m => m.message_id === messageId);
    const isOwnMessage = message?.sender_id === user.user_id;
    const messageAge = message ? Date.now() - new Date(message.created_at).getTime() : 0;
    
    if (deleteFor === 'everyone') {
      if (!isOwnMessage) {
        toast.error('Only the sender can delete message for everyone');
        return;
      }
      
      if (messageAge > MESSAGE_DELETE_WINDOW) {
        toast.error('You can only delete for everyone within 15 minutes');
        return;
      }
      
      if (!window.confirm('Delete this message for everyone?')) {
        return;
      }
    } else {
      if (!window.confirm(`Delete this message for ${isOwnMessage ? 'yourself' : 'yourself'}?`)) {
        return;
      }
    }

    try {
      await api.delete(`/messages/${messageId}?delete_for=${deleteFor}`);
      setMessages(prev => prev.filter(m => m.message_id !== messageId));
      toast.success('Message deleted');
      fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  }, [messages, user, fetchConversations]);

  const viewUserProfile = useCallback((userId) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

  // Render attachment
  const renderAttachment = useCallback((attachment) => {
    const fileUrl = getFileUrl(attachment.file_path || attachment.file_url);
    const isImage = attachment.file_type === 'image' || 
                   (attachment.mime_type && attachment.mime_type.startsWith('image/'));
    const isVideo = attachment.file_type === 'video' || 
                   (attachment.mime_type && attachment.mime_type.startsWith('video/'));

    if (isImage) {
      return (
        <div key={attachment.attachment_id || attachment.file_name} className="mt-2">
          <img 
            src={fileUrl} 
            alt={attachment.file_name}
            className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow border border-gray-200"
            onClick={() => window.open(fileUrl, '_blank')}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div key={attachment.attachment_id || attachment.file_name} className="mt-2">
          <video 
            src={fileUrl} 
            controls 
            className="max-w-xs max-h-64 rounded-lg shadow border border-gray-200"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div key={attachment.attachment_id || attachment.file_name} className="mt-2">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 max-w-xs shadow-sm hover:shadow border border-gray-200">
          {getFileIcon(attachment.mime_type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{attachment.file_name}</p>
            <p className="text-xs opacity-75 text-gray-600">{formatFileSize(attachment.file_size)}</p>
          </div>
          <a
            href={fileUrl}
            download={attachment.file_name}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
          >
            <FaDownload className="text-blue-600 hover:text-blue-700" />
          </a>
        </div>
      </div>
    );
  }, [getFileIcon, formatFileSize]);

  // Effects
  useEffect(() => {
    fetchConversations();
    
    return () => {
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current);
      }
      previewUrls.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [fetchConversations, previewUrls]);

  useEffect(() => {
    if (shouldScrollRef) {
      scrollToBottom();
    }
    
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  }, [messages, shouldScrollRef, scrollToBottom]);

  useEffect(() => {
    if (location.state?.selectedUserId && !initialUserLoadedRef.current) {
      const userId = location.state.selectedUserId;
      
      initialUserLoadedRef.current = true;
      
      const existingConv = conversations.find(conv => conv.user_id === parseInt(userId));
      
      if (existingConv) {
        setSelectedUser(existingConv);
        fetchMessages(existingConv.user_id);
        checkConnectionStatus(existingConv.user_id);
        setShowConversations(false);
      } else {
        api.get(`/users/${userId}`)
          .then(response => {
            const userData = response.data.user;
            const tempConv = {
              user_id: userData.user_id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              profile_picture: userData.profile_picture,
              current_city: userData.current_city,
              last_message: 'Start a conversation',
              last_message_time: new Date(),
              unread_count: 0
            };
            setSelectedUser(tempConv);
            setMessages([]);
            checkConnectionStatus(userData.user_id);
            setShowConversations(false);
          })
          .catch(error => {
            console.error('Failed to load user details:', error);
            toast.error('Failed to load user details');
          });
      }
    }
  }, [location.state?.selectedUserId, conversations, fetchMessages, checkConnectionStatus]);

  useEffect(() => {
    if (selectedUser) {
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current);
      }
      
      messagePollingInterval.current = setInterval(() => {
        if (selectedUser && selectedUser.user_id) {
          fetchMessages(selectedUser.user_id, true);
          fetchConversations();
        }
      }, POLLING_INTERVAL);
    }

    return () => {
      if (messagePollingInterval.current) {
        clearInterval(messagePollingInterval.current);
      }
    };
  }, [selectedUser, fetchMessages, fetchConversations]);

  useEffect(() => {
    if (conversations.length > 0 && !selectedUser && !location.state?.selectedUserId) {
      setSelectedUser(conversations[0]);
    }
  }, [conversations, selectedUser, location.state?.selectedUserId]);

  useEffect(() => {
    if (selectedUser) {
      setShouldScrollRef(true);
      fetchMessages(selectedUser.user_id);
      checkConnectionStatus(selectedUser.user_id);
    }
  }, [selectedUser, fetchMessages, checkConnectionStatus]);

  useEffect(() => {
    if (messages.length > 0) {
      const isNewMessage = messages.length > previousMessageCountRef.current;
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.sender_id === user?.user_id;
      
      if (shouldScrollRef || (isNewMessage && isOwnMessage)) {
        scrollToBottom();
      }
      
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, shouldScrollRef, user, scrollToBottom]);

  if (loading && conversations.length === 0 && !selectedUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setShowConversations(!showConversations)}
            className="p-2 text-gray-600 hover:text-indigo-600"
          >
            <FaBars className="text-xl" />
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Messages</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)] lg:h-screen">
        {/* Conversations List */}
        <div className={`
          ${showConversations ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 absolute lg:relative z-20 lg:z-auto
          w-full lg:w-96 bg-white border-r flex flex-col transition-transform duration-300
          h-full shadow-xl lg:shadow-none
        `}>
          {/* Desktop Header */}
          <div className="hidden lg:block p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
            <h2 className="text-2xl font-bold text-white mb-6">Messages</h2>
            <div className="relative">
              <FaSearch className="absolute left-4 top-3.5 text-indigo-200" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border-0 rounded-xl focus:ring-2 focus:ring-white focus:outline-none text-gray-800 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Mobile search */}
          <div className="lg:hidden p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-500">
            <div className="relative">
              <FaSearch className="absolute left-4 top-3.5 text-indigo-200" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/90 rounded-xl focus:ring-2 focus:ring-white focus:outline-none text-gray-800"
              />
            </div>
          </div>

          {/* Conversations List Content */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaComment className="h-8 w-8 text-indigo-500" />
                </div>
                <p className="text-gray-600 font-medium">
                  {searchTerm ? 'No conversations found' : 'No messages yet'}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Connect with alumni to start messaging
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {selectedUser && !conversations.find(c => c.user_id === selectedUser.user_id) && (
                  <div className={`p-4 border-l-4 border-l-indigo-500 ${selectedUser?.user_id === selectedUser.user_id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <div 
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => {
                        setSelectedUser(selectedUser);
                        checkConnectionStatus(selectedUser.user_id);
                        setShowConversations(false);
                      }}
                    >
                      <div className="relative">
                        <img
                          src={getAvatarUrl(selectedUser.first_name, selectedUser.last_name, selectedUser.profile_picture)}
                          alt={selectedUser.first_name}
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-200"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {selectedUser.first_name} {selectedUser.last_name}
                        </p>
                        <p className="text-sm text-gray-600 truncate">New conversation</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.user_id}
                    onClick={() => {
                      setSelectedUser(conv);
                      checkConnectionStatus(conv.user_id);
                      setShowConversations(false);
                    }}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedUser?.user_id === conv.user_id 
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-l-indigo-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={getAvatarUrl(conv.first_name, conv.last_name, conv.profile_picture)}
                          alt={conv.first_name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          conv.is_online ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-900 truncate">
                            {conv.first_name} {conv.last_name}
                          </p>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {formatTimestamp(conv.last_message_time)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">{conv.last_message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b shadow-sm">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShowConversations(true)}
                        className="lg:hidden text-gray-600 hover:text-indigo-600"
                      >
                        <FaArrowLeft className="text-lg" />
                      </button>
                      <div 
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() => viewUserProfile(selectedUser.user_id)}
                      >
                        <div className="relative">
                          <img
                            src={getAvatarUrl(selectedUser.first_name, selectedUser.last_name, selectedUser.profile_picture)}
                            alt={selectedUser.first_name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                            {selectedUser.first_name} {selectedUser.last_name}
                          </h3>
                          {selectedUser.current_city && (
                            <p className="text-sm text-gray-500">{selectedUser.current_city}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {showConnectionAlert && (
                      <button
                        onClick={sendConnectionRequest}
                        className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center"
                      >
                        <FaUserPlus className="mr-2" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Connection Alert */}
                {showConnectionAlert && (
                  <div className="bg-yellow-50 border-t border-yellow-100 px-4 py-3">
                    <div className="flex items-start">
                      <FaUser className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-yellow-800 text-sm font-medium">
                          Connect with {selectedUser.first_name} to start messaging
                        </p>
                        <p className="text-yellow-700 text-sm mt-1">
                          Send a connection request to exchange messages
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Container */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-gray-50"
              >
                {/* Scroll to bottom button */}
                {showScrollButton && (
                  <button
                    onClick={scrollToBottomManual}
                    className="fixed bottom-24 right-4 z-10 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
                    title="Scroll to bottom"
                  >
                    <FaAngleDoubleDown className="text-lg" />
                  </button>
                )}

                {loading && messages.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaComment className="h-8 w-8 text-indigo-500" />
                    </div>
                    <p className="text-gray-700 font-medium">No messages yet</p>
                    {showConnectionAlert ? (
                      <p className="text-gray-500 text-sm mt-2">Connect with {selectedUser.first_name} to start messaging</p>
                    ) : (
                      <p className="text-gray-500 text-sm mt-2">Send your first message to start the conversation!</p>
                    )}
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwnMessage = msg.sender_id === user.user_id;
                    const showDate = index === 0 || 
                      new Date(msg.created_at).toDateString() !== 
                      new Date(messages[index - 1].created_at).toDateString();
                    
                    return (
                      <React.Fragment key={msg.message_id}>
                        {showDate && (
                          <div className="flex justify-center my-6">
                            <span className="bg-gray-100 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full">
                              {new Date(msg.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className="group max-w-xl">
                            <div
                              className={`rounded-2xl px-4 py-3 ${isOwnMessage
                                ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-br-none'
                                : 'bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-200'
                              }`}
                            >
                              {!isOwnMessage && (
                                <div 
                                  className="flex items-center space-x-2 mb-2 cursor-pointer"
                                  onClick={() => viewUserProfile(msg.sender_id)}
                                >
                                  <img
                                    src={getAvatarUrl(msg.sender_first_name, msg.sender_last_name, msg.sender_profile_picture)}
                                    alt={msg.sender_first_name}
                                    className="w-6 h-6 rounded-full"
                                  />
                                  <p className="font-semibold text-sm hover:text-indigo-600 transition-colors">
                                    {msg.sender_first_name} {msg.sender_last_name}
                                  </p>
                                </div>
                              )}
                              
                              {msg.message_text && (
                                <p className="whitespace-pre-wrap break-words">
                                  {msg.message_text}
                                </p>
                              )}
                              
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="space-y-2 mt-3">
                                  {msg.attachments.map(att => renderAttachment(att))}
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center mt-2">
                                <p className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {formatMessageTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Message Actions */}
                            <div className="flex justify-end mt-1 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex">
                              {isOwnMessage && (
                                <button
                                  onClick={() => {
                                    const canDeleteForEveryone = (Date.now() - new Date(msg.created_at).getTime()) < MESSAGE_DELETE_WINDOW;
                                    if (canDeleteForEveryone) {
                                      const choice = window.confirm('Delete for everyone? Click OK for everyone, Cancel for just you.');
                                      deleteMessage(msg.message_id, choice ? 'everyone' : 'self');
                                    } else {
                                      deleteMessage(msg.message_id, 'self');
                                    }
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700"
                                  title="Delete message"
                                >
                                  <FaTrash className="mr-1 inline" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t p-4">
                {attachments.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl border">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-700">Attachments ({attachments.length})</p>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachments([]);
                          previewUrls.forEach(preview => URL.revokeObjectURL(preview.url));
                          setPreviewUrls([]);
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, index) => {
                        const preview = previewUrls.find(p => p.file === file.name);
                        return (
                          <div key={index} className="relative">
                            <div className="bg-white rounded-lg p-2 border">
                              {preview ? (
                                <img src={preview.url} alt={file.name} className="h-16 w-16 object-cover rounded" />
                              ) : (
                                <div className="h-16 w-16 bg-gray-50 rounded flex flex-col items-center justify-center p-1">
                                  {getFileIcon(file.type)}
                                  <p className="text-xs text-gray-600 truncate w-full text-center mt-1">
                                    {file.name.length > 8 ? file.name.substring(0, 8) + '...' : file.name}
                                  </p>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <FaTimes className="text-xs" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <form onSubmit={sendMessage} className="flex items-end space-x-3">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Attach files"
                      disabled={showConnectionAlert}
                    >
                      <FaPaperclip className="text-lg" />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder={showConnectionAlert ? "Connect to send messages..." : "Type your message..."}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-none"
                      rows="1"
                      disabled={sending || showConnectionAlert}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && attachments.length === 0) || sending || showConnectionAlert}
                    className="p-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiSend className="text-lg" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* No conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="bg-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                <FaComment className="h-12 w-12 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Welcome to Messages</h3>
              <p className="text-gray-600 text-center max-w-md mb-8">
                Select a conversation from the sidebar or connect with alumni from the directory to start messaging
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Online contacts</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">New messages</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;