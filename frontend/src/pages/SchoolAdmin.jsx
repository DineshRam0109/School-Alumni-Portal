import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { eventService } from '../services/eventService';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  FaUsers, FaCalendar, FaChartLine, FaSchool, FaUserPlus,
  FaGraduationCap, FaMapMarkerAlt, FaCheckCircle,
  FaClock, FaExclamationTriangle, FaBell, FaFileAlt
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { getAvatarUrl } from '../utils/profilePictureUtils';

const SchoolAdmin = () => {
  const { user } = useSelector((state) => state.auth);
  const [mySchool, setMySchool] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [recentAlumni, setRecentAlumni] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'school_admin') {
      fetchSchoolAdminData();
    }
  }, [user]);

  const fetchSchoolAdminData = async () => {
    try {
      setLoading(true);

      const adminSchoolResponse = await api.get('/school-admin/my-school');
      
      if (!adminSchoolResponse.data.success || !adminSchoolResponse.data.school) {
        toast.error('No school assigned to your account');
        return;
      }

      const school = adminSchoolResponse.data.school;
      setMySchool(school);

      const statsRes = await api.get('/school-admin/statistics');
      setStatistics(statsRes.data?.statistics || {});

      const alumniRes = await api.get('/school-admin/alumni', {
        params: { limit: 10 }
      });
      setRecentAlumni(alumniRes.data?.alumni || []);

      const eventsRes = await eventService.getAllEvents({
        school_id: school.school_id,
        upcoming: 'true',
        limit: 5
      });
      setUpcomingEvents(eventsRes.data?.events || []);

    } catch (error) {
      console.error('Failed to fetch school admin data:', error);
      toast.error(error.response?.data?.message || 'Failed to load school data');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'school_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">This page is only accessible to school administrators</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!mySchool) {
    return (
      <div className="text-center py-12">
        <FaSchool className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No school assigned to your account</p>
        <p className="text-sm text-gray-400 mt-2">Please contact the system administrator</p>
      </div>
    );
  }

  const verificationRate = statistics?.total_alumni > 0 
    ? ((statistics?.verified_alumni / statistics?.total_alumni) * 100).toFixed(0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header with School Info */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl shadow-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
           
            <div>
              <h1 className="text-3xl font-bold mb-1">{mySchool.school_name}</h1>
              <p className="text-indigo-100 text-lg">Welcome back, {user.first_name}!</p>
              <p className="text-indigo-200 text-sm mt-1">
                {mySchool.city}, {mySchool.state} • Est. {mySchool.established_year || 'N/A'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold mb-2">{statistics?.total_alumni || 0}</div>
            <div className="text-indigo-100">Total Alumni Network</div>
          </div>
        </div>
      </div>

      {/* Key Metrics - Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Verified Alumni */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-lg">
              <FaCheckCircle className="text-2xl text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-green-600 font-semibold">VERIFIED</div>
              <div className="text-3xl font-bold text-green-700">{statistics?.verified_alumni || 0}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Verification Rate</span>
            <span className="text-lg font-bold text-green-600">{verificationRate}%</span>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500 rounded-lg">
              <FaClock className="text-2xl text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-orange-600 font-semibold">PENDING</div>
              <div className="text-3xl font-bold text-orange-700">{statistics?.unverified_alumni || 0}</div>
            </div>
          </div>
          <Link 
            to="/school-admin/verify"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center"
          >
            Review Now <FaExclamationTriangle className="ml-2" />
          </Link>
        </div>

        {/* Upcoming Events */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 rounded-lg">
              <FaCalendar className="text-2xl text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-600 font-semibold">EVENTS</div>
              <div className="text-3xl font-bold text-purple-700">{statistics?.upcoming_events || 0}</div>
            </div>
          </div>
          <Link 
            to="/create-event"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center"
          >
            Create Event <FaCalendar className="ml-2" />
          </Link>
        </div>

        {/* Recent Registrations */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <FaUserPlus className="text-2xl text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 font-semibold">THIS MONTH</div>
              <div className="text-3xl font-bold text-blue-700">{statistics?.recent_registrations || 0}</div>
            </div>
          </div>
          <span className="text-sm text-gray-600">New Alumni Joined</span>
        </div>
      </div>

      {/* Action Required Section */}
      {statistics?.unverified_alumni > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
          <div className="flex items-start">
            <FaBell className="text-yellow-600 text-2xl mr-4 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">Action Required</h3>
              <p className="text-yellow-800 mb-3">
                You have <span className="font-bold">{statistics.unverified_alumni}</span> alumni waiting for verification.
                Verifying alumni helps maintain the quality and authenticity of your alumni network.
              </p>
              <Link
                to="/school-admin/verify"
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
              >
                <FaCheckCircle className="mr-2" />
                Verify Alumni Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Alumni Registrations */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <FaUsers className="text-white text-2xl mr-3" />
                <h2 className="text-xl font-bold text-white">Recent Alumni Registrations</h2>
              </div>
              <Link to={`/schools/${mySchool.school_id}`} className="text-white hover:text-blue-100 text-sm font-medium">
                View All →
              </Link>
            </div>
            <div className="p-6">
              {recentAlumni.length === 0 ? (
                <div className="text-center py-12">
                  <FaUsers className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500">No recent alumni registrations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAlumni.slice(0, 6).map((alumni) => (
                    <div key={alumni.user_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                       <img
  src={getAvatarUrl(alumni.profile_picture, alumni.first_name, alumni.last_name)}
  alt={`${alumni.first_name} ${alumni.last_name}`}
  className="w-12 h-12 rounded-full border-2 border-indigo-200"
/>
                        <div>
                          <Link
                            to={`/profile/${alumni.user_id}`}
                            className="font-semibold text-gray-900 hover:text-indigo-600"
                          >
                            {alumni.first_name} {alumni.last_name}
                          </Link>
                          <p className="text-sm text-gray-600">
                            {alumni.degree_level} • {alumni.field_of_study} • '{alumni.end_year}
                          </p>
                        </div>
                      </div>
                      {alumni.is_verified ? (
                        <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium flex items-center">
                          <FaCheckCircle className="mr-1" /> Verified
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium flex items-center">
                          <FaClock className="mr-1" /> Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <FaCalendar className="text-white text-2xl mr-3" />
                <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
              </div>
              <Link to="/events" className="text-white hover:text-purple-100 text-sm font-medium">
                View All →
              </Link>
            </div>
            <div className="p-6">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <FaCalendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">No upcoming events scheduled</p>
                  <Link
                    to="/create-event"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <FaCalendar className="mr-2" />
                    Create First Event
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <Link
                      key={event.event_id}
                      to={`/events/${event.event_id}`}
                      className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <FaCalendar className="mr-2 text-purple-500" />
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FaMapMarkerAlt className="mr-2 text-purple-500" />
                            {event.is_online ? 'Online Event' : event.location}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-purple-600">{event.registered_count || 0}</div>
                          <div className="text-xs text-gray-600">Registered</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <Link
                to="/school-admin/verify"
                className="flex items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
              >
                <div className="p-3 bg-orange-500 rounded-lg mr-4 group-hover:bg-orange-600">
                  <FaCheckCircle className="text-white text-xl" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Verify Alumni</div>
                  <div className="text-sm text-gray-600">{statistics?.unverified_alumni || 0} pending</div>
                </div>
              </Link>

              <Link
                to="/create-event"
                className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <div className="p-3 bg-purple-500 rounded-lg mr-4 group-hover:bg-purple-600">
                  <FaCalendar className="text-white text-xl" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Create Event</div>
                  <div className="text-sm text-gray-600">Schedule new event</div>
                </div>
              </Link>

              <Link
                to="/school-admin/analytics"
                className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <div className="p-3 bg-blue-500 rounded-lg mr-4 group-hover:bg-blue-600">
                  <FaChartLine className="text-white text-xl" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">View Analytics</div>
                  <div className="text-sm text-gray-600">Detailed insights</div>
                </div>
              </Link>

              <Link
                to="/school-admin/reports"
                className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <div className="p-3 bg-green-500 rounded-lg mr-4 group-hover:bg-green-600">
                  <FaFileAlt className="text-white text-xl" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Generate Reports</div>
                  <div className="text-sm text-gray-600">Export data</div>
                </div>
              </Link>

              <Link
                to={`/schools/${mySchool.school_id}`}
                className="flex items-center p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors group"
              >
                <div className="p-3 bg-indigo-500 rounded-lg mr-4 group-hover:bg-indigo-600">
                  <FaUsers className="text-white text-xl" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Alumni Directory</div>
                  <div className="text-sm text-gray-600">Browse all alumni</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Top Batches */}
          {statistics?.batch_distribution && statistics.batch_distribution.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Top Graduating Classes</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {statistics.batch_distribution.slice(0, 5).map((batch, index) => (
                    <div key={batch.end_year} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                          {index + 1}
                        </div>
                        <span className="font-semibold text-gray-900">Class of {batch.end_year}</span>
                      </div>
                      <span className="text-lg font-bold text-teal-600">{batch.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolAdmin;