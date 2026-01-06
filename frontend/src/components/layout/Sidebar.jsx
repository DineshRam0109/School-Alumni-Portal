import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FaTachometerAlt, FaUsers, FaUserFriends, FaEnvelope, 
  FaCalendar, FaBriefcase, FaSchool, FaChartBar,
  FaGraduationCap, FaTimes, FaHandshake, FaComments, FaCheckCircle,
  FaUserTie, FaUserShield, FaBuilding, FaFileExport
} from 'react-icons/fa';
import { getAvatarUrl } from '../../utils/profilePictureUtils';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');

 useEffect(() => {
  if (user) {
    const url = getAvatarUrl(user.profile_picture, user.first_name, user.last_name);
        setProfilePictureUrl(url);
  }
}, [user, user?.profile_picture]);


  const getMenuItems = () => {
    const role = user?.role;

    if (role === 'super_admin') {
      return [
        { path: '/super-admin/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
        { path: '/super-admin/schools', icon: FaSchool, label: 'Manage Schools' },
        { path: '/super-admin/school-admins', icon: FaUserTie, label: 'School Admins' },
        { path: '/super-admin/alumni', icon: FaUsers, label: 'View Alumni' },
        { path: '/analytics', icon: FaChartBar, label: 'Analytics' },
        { path: '/events', icon: FaCalendar, label: 'View Events' },
        { path: '/jobs', icon: FaBriefcase, label: 'View Jobs' },
        { path: '/companies', icon: FaBuilding, label: 'View Companies' },
        { path: '/super-admin/reports', icon: FaFileExport, label: 'Reports & Export' }
      ];
    }

    if (role === 'school_admin') {
      return [
        { path: '/school-admin/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
        { path: '/school-admin/verify', icon: FaCheckCircle, label: 'Verify Alumni' },
        { path: '/alumni', icon: FaUsers, label: 'Alumni Directory' },
        { path: '/events', icon: FaCalendar, label: 'Events' },
        { path: '/jobs', icon: FaBriefcase, label: 'Job Portal' },
              { path: '/companies', icon: FaBuilding, label: 'Companies' },
        { path: '/school-admin/analytics', icon: FaChartBar, label: 'Analytics' },
        { path: '/school-admin/reports', icon: FaFileExport, label: 'Reports' }
      ];
    }

    return [
      { path: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
      { path: '/alumni', icon: FaUsers, label: 'Alumni Directory' },
      { path: '/connections', icon: FaUserFriends, label: 'My Connections' },
      { path: '/messages', icon: FaEnvelope, label: 'Messages' },
      { path: '/groups', icon: FaComments, label: 'Groups' },
      { path: '/events', icon: FaCalendar, label: 'Events' },
      { path: '/jobs', icon: FaBriefcase, label: 'Job Portal' },
      { path: '/mentorship', icon: FaHandshake, label: 'Mentorship' },
      { path: '/schools', icon: FaSchool, label: 'Schools' },
      { path: '/companies', icon: FaBuilding, label: 'Companies' }
    ];
  };

  const menuItems = getMenuItems();
  const isActive = (path) => location.pathname === path;

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'super_admin':
        return <FaUserShield className="text-white text-2xl mr-2" />;
      case 'school_admin':
        return <FaUserTie className="text-white text-2xl mr-2" />;
      default:
        return <FaGraduationCap className="text-white text-2xl mr-2" />;
    }
  };

  const getPortalTitle = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'Super Admin';
      case 'school_admin':
        return 'School Admin';
      default:
        return 'Alumni Portal';
    }
  };

  // ✅ Fallback image handler
  const handleImageError = (e) => {
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name || 'User')}+${encodeURIComponent(user?.last_name || 'Name')}&size=128&background=random`;
    if (e.target.src !== fallbackUrl) {
      e.target.src = fallbackUrl;
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: '100vh' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between h-16 px-6 flex-shrink-0 ${
          user?.role === 'super_admin' ? 'bg-indigo-700' :
          user?.role === 'school_admin' ? 'bg-emerald-700' :
          'bg-blue-700'
        }`}>
          <Link to={
            user?.role === 'super_admin' ? '/super-admin/dashboard' :
            user?.role === 'school_admin' ? '/school-admin/dashboard' :
            '/dashboard'
          } className="flex items-center">
            {getRoleIcon()}
            <span className="text-white font-bold text-xl">{getPortalTitle()}</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white"
          >
            <FaTimes />
          </button>
        </div>

        {/* School Info (for school admin) */}
        {user?.role === 'school_admin' && user?.school_name && (
          <div className="px-4 py-3 bg-emerald-800/30 border-b border-emerald-700/30 flex-shrink-0">
            <div className="flex items-center">
              <FaSchool className="text-emerald-300 mr-2" />
              <div>
                <p className="text-xs text-emerald-200">Managing</p>
                <p className="text-sm font-medium text-white">{user.school_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto mt-6 px-3 pb-6 scrollbar-hide">
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const activeColor = 
              user?.role === 'super_admin' ? 'bg-indigo-700 text-white' :
              user?.role === 'school_admin' ? 'bg-emerald-700 text-white' :
              'bg-blue-700 text-white';
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                  active
                    ? activeColor
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className={`mr-3 ${
                  active 
                    ? 'text-white'
                    : 'text-gray-400'
                }`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-gray-900">
          <div className="flex items-center">
            <img
              src={profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name || 'User')}+${encodeURIComponent(user?.last_name || 'Name')}&size=128&background=random`}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
              onError={handleImageError}
            />
            <div className="flex-1 ml-3">
              <p className="text-sm font-medium text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className={`text-xs capitalize ${
                user?.role === 'super_admin' ? 'text-indigo-300' :
                user?.role === 'school_admin' ? 'text-emerald-300' :
                'text-blue-300'
              }`}>
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;