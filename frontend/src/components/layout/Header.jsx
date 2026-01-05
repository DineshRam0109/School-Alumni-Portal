import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { notificationService } from '../../services/notificationService';
import { FaBell, FaBars, FaUser, FaSignOutAlt, FaLock, FaChevronDown } from 'react-icons/fa';
import { getAvatarUrl } from '../../utils/profilePictureUtils';

const Header = ({ setSidebarOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  
  const dropdownRef = useRef(null);

  // Update profile picture when user changes
  useEffect(() => {
    if (user) {
      const url = getAvatarUrl(user.profile_picture, user.first_name, user.last_name);
      setProfilePictureUrl(url);
    }
  }, [user, user?.profile_picture]);

  // Fetch notification count on mount and set up polling
  useEffect(() => {
    if (user) {
      fetchNotificationCount();
      
      // Poll every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotificationCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getMyProfileUrl = () => {
    if (!user) return '/dashboard';
    
    if (user.role === 'school_admin') {
      return `/school-admin/profile/${user.admin_id}`;
    }
    
    return `/profile/${user.user_id}`;
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
    // Don't reset count here - let the Notifications page handle it
  };

  const getRoleInfo = (role) => {
    return {
      bg: 'bg-gradient-to-r from-gray-900 to-slate-900',
      border: 'border-gray-700',
      shadow: 'shadow-gray-900/20',
      badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
      iconColor: 'text-gray-400'
    };
  };

  const roleInfo = getRoleInfo(user?.role);

  const handleImageError = (e) => {
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name || 'User')}+${encodeURIComponent(user?.last_name || 'Name')}&size=128&background=random`;
    if (e.target.src !== fallbackUrl) {
      e.target.src = fallbackUrl;
    }
  };

  return (
    <header className={`${roleInfo.bg} ${roleInfo.border} border-b h-16 flex items-center justify-between px-6 shadow-lg ${roleInfo.shadow}`}>
      {/* Left: Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden text-gray-100 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
      >
        <FaBars className="text-xl" />
      </button>

      {/* Right: Icons and User menu */}
      <div className="flex items-center space-x-4 ml-auto">
        {/* Notifications */}
        <button
          onClick={handleNotificationClick}
          className="relative p-2 text-gray-100 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group"
          title="Notifications"
        >
          <div className="relative">
            <FaBell className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg ring-2 ring-white/20">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </div>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 hover:bg-white/10 rounded-2xl p-1.5 pl-3 transition-all duration-200 group border border-transparent hover:border-white/20"
          >
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-white group-hover:text-gray-100">
                {user?.first_name} {user?.last_name}
              </p>
              <div className={`text-xs px-2 py-0.5 rounded-full border inline-block ${roleInfo.badgeColor}`}>
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img
                  src={profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name || 'User')}+${encodeURIComponent(user?.last_name || 'Name')}&size=128&background=random`}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
                  onError={handleImageError}
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white/80 rounded-full ring-1 ring-white/30"></div>
              </div>
              <FaChevronDown className={`ml-2 text-white/70 group-hover:text-white transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-xl py-2 border border-slate-600/50 z-50">
              <div className="py-2">
                <Link
                  to={getMyProfileUrl()}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-gray-100 hover:bg-white/10 hover:text-white transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg mr-3">
                    <FaUser className="text-blue-300" />
                  </div>
                  <div className="flex-1 font-medium">View Profile</div>
                </Link>
                
                <Link
                  to="/change-password"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-gray-100 hover:bg-white/10 hover:text-white transition-all duration-200 group"
                >
                  <div className="p-2 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-lg mr-3">
                    <FaLock className="text-emerald-300" />
                  </div>
                  <div className="flex-1 font-medium">Change Password</div>
                </Link>
              </div>
              
              <div className="px-4 py-1">
                <div className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent"></div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-100 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 group"
              >
                <div className="p-2 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg mr-2">
                  <FaSignOutAlt className="text-red-300" />
                </div>
                <div className="flex-1 font-medium">Logout</div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;