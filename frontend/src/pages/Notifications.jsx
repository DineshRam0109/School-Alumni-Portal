import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaBell,
  FaCalendar,
  FaCheckDouble,
  FaTrash,
  FaFilter,
  FaArrowLeft,
  FaSchool,
  FaBriefcase,
  FaUserCheck
} from 'react-icons/fa';
import { notificationService } from '../services/notificationService';

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Define allowed notification types based on role
  const allowedFilters = {
    alumni: [
      { value: 'all', label: 'All' },
      { value: 'unread', label: 'Unread' },
      { value: 'connection_request', label: 'Connections' },
      { value: 'message', label: 'Messages' },
      { value: 'event', label: 'Events' },
      { value: 'job', label: 'Jobs' },
      { value: 'mentorship', label: 'Mentorship' },
    ],
    school_admin: [
      { value: 'all', label: 'All' },
      { value: 'unread', label: 'Unread' },
      { value: 'event', label: 'Events' },
      { value: 'verification_request', label: 'Verification' },
      { value: 'job_application', label: 'Job Applications' }
    ],
    super_admin: []
  };

  const currentFilters = allowedFilters[user?.role] || allowedFilters.alumni;

  useEffect(() => {
    if (user?.role === 'super_admin') return;
    loadNotifications();
  }, [user?.role]);

  // Super admin handling
  if (user?.role === 'super_admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            <span>Back</span>
          </button>

          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FaBell className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Notifications
            </h2>
            <p className="text-gray-500">
              Super administrators do not receive notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data.notifications || []);
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if unread
      if (!notification.is_read) {
        await notificationService.markAsRead(notification.notification_id);
        
        // Update local state - mark notification as read
        setNotifications(prev =>
          prev.map(n =>
            n.notification_id === notification.notification_id
              ? { ...n, is_read: true }
              : n
          )
        );
        
        // Reduce unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Navigate to related page
      const route = getNotificationRoute(notification);
      if (route) {
        navigate(route);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const getNotificationRoute = (notification) => {
    if (user?.role === 'alumni') {
      switch (notification.notification_type) {
        case 'connection':
        case 'connection_request':
        case 'connection_accepted':
          return '/connections';
        case 'message':
          return notification.related_id ? `/messages?user=${notification.related_id}` : '/messages';
        case 'event':
          return notification.related_id ? `/events/${notification.related_id}` : '/events';
        case 'job':
          return notification.related_id ? `/jobs/${notification.related_id}` : '/jobs';
        case 'mentorship':
          return '/mentorship';
        default:
          return null;
      }
    } else if (user?.role === 'school_admin') {
      switch (notification.notification_type) {
        case 'event':
          return notification.related_id ? `/events/${notification.related_id}` : '/events';
        case 'verification_request':
          return '/school-admin/verify';
        case 'school_update':
          return '/school-admin/dashboard';
        case 'job_application':
          return notification.related_id ? `/school-admin/jobs/${notification.related_id}/applications` : '/school-admin/jobs';
        default:
          return null;
      }
    }
    return null;
  };

  const getNotificationIcon = (type) => {
    const icons = {
      // Alumni notifications
      connection_request: { icon: FaBell, color: 'text-blue-600', bg: 'bg-blue-100' },
      connection_accepted: { icon: FaBell, color: 'text-green-600', bg: 'bg-green-100' },
      message: { icon: FaBell, color: 'text-green-600', bg: 'bg-green-100' },
      event: { icon: FaCalendar, color: 'text-purple-600', bg: 'bg-purple-100' },
      job: { icon: FaBriefcase, color: 'text-orange-600', bg: 'bg-orange-100' },
      mentorship: { icon: FaBell, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      
      // Admin notifications
      verification_request: { icon: FaUserCheck, color: 'text-orange-600', bg: 'bg-orange-100' },
      school_update: { icon: FaSchool, color: 'text-blue-600', bg: 'bg-blue-100' },
      job_application: { icon: FaBriefcase, color: 'text-green-600', bg: 'bg-green-100' },
      
      system: { icon: FaBell, color: 'text-gray-600', bg: 'bg-gray-100' }
    };
    return icons[type] || icons.system;
  };

  const formatTimestamp = (timestamp) => {
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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state - mark all as read
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    
    if (!window.confirm('Delete this notification?')) return;
    
    try {
      const response = await notificationService.deleteNotification(notificationId);
      
      // Find if deleted notification was unread
      const deletedNotif = notifications.find(n => n.notification_id === notificationId);
      
      // Update local state - remove notification
      setNotifications(prev =>
        prev.filter(n => n.notification_id !== notificationId)
      );
      
      // Update unread count
      if (response.data.unread_count !== undefined) {
        setUnreadCount(response.data.unread_count);
      } else if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
    
    try {
      await notificationService.deleteAllNotifications();
      
      // Clear local state
      setNotifications([]);
      setUnreadCount(0);
      
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.is_read;
    return notif.notification_type === filter;
  });

  if (loading && notifications.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <FaBell className="mr-3 text-blue-600" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-3 bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {user?.role === 'school_admin' 
                  ? 'Administrative notifications and updates'
                  : 'Stay updated with your latest activities'}
              </p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <FaCheckDouble className="mr-2" />
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  <FaTrash className="mr-2" />
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FaFilter className="text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">Filter:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === f.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FaBell className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
                {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                We'll notify you when something interesting happens
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const iconConfig = getNotificationIcon(notification.notification_type);
                const Icon = iconConfig.icon;

                return (
                  <div
                    key={notification.notification_id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${iconConfig.bg} flex items-center justify-center`}>
                        <Icon className={`text-xl ${iconConfig.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                            <button
                              onClick={(e) => handleDeleteNotification(e, notification.notification_id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTimestamp(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;