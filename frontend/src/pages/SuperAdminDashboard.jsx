import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  FaUsers, FaSchool, FaUserTie, FaCalendar, FaBriefcase,
  FaUserFriends, FaChartLine, FaPlus, FaBuilding
} from 'react-icons/fa';
import { getAvatarUrl, handleImageError, getFileUrl } from '../utils/profilePictureUtils';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/dashboard');
      setStats(response.data.statistics);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Alumni',
      value: stats?.total_alumni || 0,
      icon: FaUsers,
      color: 'bg-blue-500',
      link: '/super-admin/alumni'
    },
    {
      title: 'Total Schools',
      value: stats?.total_schools || 0,
      icon: FaSchool,
      color: 'bg-green-500',
      link: '/super-admin/schools'
    },
    {
      title: 'School Admins',
      value: stats?.total_school_admins || 0,
      icon: FaUserTie,
      color: 'bg-purple-500',
      link: '/super-admin/school-admins'
    },
    {
      title: 'Total Events',
      value: stats?.total_events || 0,
      icon: FaCalendar,
      color: 'bg-orange-500',
      link: '/events'
    },
    {
      title: 'Total Jobs',
      value: stats?.total_jobs || 0,
      icon: FaBriefcase,
      color: 'bg-pink-500',
      link: '/jobs'
    },
    {
      title: 'Total Companies',
      value: stats?.total_companies || 0,
      icon: FaBuilding,
      color: 'bg-indigo-500',
      link: '/companies'
    }
  ];

  // Helper function to get school logo URL
  const getSchoolLogoUrl = (logo) => {
    if (logo && typeof logo === 'string' && logo.trim()) {
      return getFileUrl(logo);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Super Admin Dashboard</h1>
            <p className="text-purple-100">
              Manage the entire alumni portal system
            </p>
          </div>
          <FaChartLine className="text-6xl opacity-50" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-full`}>
                  <Icon className="text-white text-2xl" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/super-admin/school-admins/"
            className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            Create School Admin
          </Link>
          <Link
            to="/super-admin/schools/"
            className="flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            Add New School
          </Link>
          <Link
            to="/analytics"
            className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaChartLine className="mr-2" />
            View Analytics
          </Link>
        </div>
      </div>

      {/* Recent School Admins */}
      {stats?.recent_school_admins && stats.recent_school_admins.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent School Admins</h2>
              <Link to="/super-admin/school-admins" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recent_school_admins.slice(0, 5).map((admin) => (
                <div key={admin.admin_id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    {/* School Admin Profile Picture */}
                    <img
                      src={getAvatarUrl({
                        first_name: admin.first_name,
                        last_name: admin.last_name,
                        profile_picture: admin.profile_picture
                      })}
                      alt={`${admin.first_name} ${admin.last_name}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                      onError={(e) => handleImageError(e, admin.first_name, admin.last_name)}
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {admin.first_name} {admin.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <FaSchool className="mr-1" />
                        {admin.school_name}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Alumni */}
      {stats?.recent_alumni && stats.recent_alumni.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Alumni Registrations</h2>
              <Link to="/super-admin/alumni" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recent_alumni.slice(0, 5).map((alumni) => (
                <div key={alumni.user_id} className="flex items-center space-x-4 p-3 border rounded-lg hover:shadow-md transition-shadow">
                  <img
                    src={getAvatarUrl(alumni)}
                    alt={`${alumni.first_name} ${alumni.last_name}`}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                    onError={(e) => handleImageError(e, alumni.first_name, alumni.last_name)}
                  />
                  <div className="flex-1">
                    <Link
                      to={`/profile/${alumni.user_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {alumni.first_name} {alumni.last_name}
                    </Link>
                    <p className="text-sm text-gray-500">{alumni.email}</p>
                    <p className="text-xs text-gray-400">{alumni.current_city}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alumni.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Schools */}
      {stats?.top_schools && stats.top_schools.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Top Schools by Alumni</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats.top_schools.map((school, index) => (
                <div key={school.school_id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full flex-shrink-0">
                      {index + 1}
                    </span>
                    
                    {/* School Logo */}
                    <div className="flex-shrink-0 w-10 h-10">
                      {getSchoolLogoUrl(school.logo) ? (
                        <img
                          src={getSchoolLogoUrl(school.logo)}
                          alt={school.school_name}
                          className="w-10 h-10 rounded-lg object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center"
                        style={{ display: getSchoolLogoUrl(school.logo) ? 'none' : 'flex' }}
                      >
                        <FaSchool className="text-white text-lg" />
                      </div>
                    </div>
                    
                    <div>
                      <Link
                        to={`/schools/${school.school_id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {school.school_name}
                      </Link>
                      <p className="text-xs text-gray-500">{school.city}, {school.state}</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">
                    {school.alumni_count} alumni
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;