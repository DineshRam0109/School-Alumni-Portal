import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  FaUsers, FaGraduationCap, FaCalendar, FaBuilding, 
  FaMapMarkerAlt, FaIndustry, FaCheckCircle, FaClock,
  FaUserCheck, FaChartBar, FaTrophy, FaBriefcase, FaTimes
} from 'react-icons/fa';
import { getAvatarUrl } from '../utils/profilePictureUtils';

const SchoolAdminAnalytics = () => {
  const { user } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [analytics, setAnalytics] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState(null);
  
  // Modal states
  const [showEmployerModal, setShowEmployerModal] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [employerAlumni, setEmployerAlumni] = useState([]);
  const [loadingAlumni, setLoadingAlumni] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchJobStats();
  }, [id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      let analyticsEndpoint, statsEndpoint;
      
      if (user?.role === 'school_admin' && !id) {
        analyticsEndpoint = '/school-admin/analytics';
        statsEndpoint = '/school-admin/statistics';
      } else if (id) {
        analyticsEndpoint = `/schools/${id}/analytics`;
        statsEndpoint = `/schools/${id}/statistics`;
      } else {
        toast.error('No school information available');
        setLoading(false);
        return;
      }

      const [analyticsRes, statsRes] = await Promise.all([
        api.get(analyticsEndpoint),
        api.get(statsEndpoint)
      ]);

      if (user?.role === 'school_admin' && !id) {
        setAnalytics(analyticsRes.data?.analytics || {});
        setStatistics(statsRes.data?.statistics || {});
      } else {
        setAnalytics(analyticsRes.data?.analytics || {});
        const stats = statsRes.data?.statistics || {};
        setStatistics({
          total_alumni: stats.total_alumni || 0,
          verified_alumni: 0,
          unverified_alumni: 0,
          recent_registrations: 0,
          upcoming_events: 0,
          batch_distribution: stats.batch_distribution || [],
          top_employers: stats.top_companies || []
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
      setAnalytics({});
      setStatistics({});
    } finally {
      setLoading(false);
    }
  };

  const fetchJobStats = async () => {
    try {
      const schoolId = id || user?.school_id;
      if (!schoolId) return;

      const response = await api.get(`/jobs?school_id=${schoolId}`);
      
      if (response.data.success) {
        const schoolAdminJobs = response.data.jobs.filter(job => 
          job.poster_role === 'school_admin' || job.poster_school_id === parseInt(schoolId)
        );
        const alumniJobs = response.data.jobs.filter(job => 
          job.alumni_school_id === parseInt(schoolId)
        );

        setJobStats({
          school_jobs: schoolAdminJobs.length,
          alumni_jobs: alumniJobs.length,
          total_applications: response.data.jobs.reduce((sum, job) => sum + (job.application_count || 0), 0)
        });
      }
    } catch (error) {
      console.error('Failed to load job stats:', error);
    }
  };

  const handleEmployerClick = async (employer) => {
    setSelectedEmployer(employer);
    setShowEmployerModal(true);
    setLoadingAlumni(true);

    try {
      const response = await api.get(`/companies/${encodeURIComponent(employer.company_name)}/alumni`);
      
      if (response.data.success) {
        setEmployerAlumni(response.data.alumni || []);
      }
    } catch (error) {
      console.error('Failed to load alumni:', error);
      toast.error('Failed to load alumni for this company');
      setEmployerAlumni([]);
    } finally {
      setLoadingAlumni(false);
    }
  };

  const handleAlumniClick = (alumniId) => {
    setShowEmployerModal(false);
    navigate(`/profile/${alumniId}`);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const registrationTrend = analytics?.registration_trend || [];
  const locationDistribution = analytics?.location_distribution || [];
  const industryDistribution = analytics?.industry_distribution || [];
  const eventsByType = analytics?.events_by_type || [];
  const topEvents = analytics?.top_events || [];
  const batchDistribution = statistics?.batch_distribution || [];

  const verificationRate = statistics?.total_alumni > 0 
    ? ((statistics?.verified_alumni / statistics?.total_alumni) * 100).toFixed(1)
    : 0;

  const growthRate = registrationTrend.length >= 2
    ? ((registrationTrend[registrationTrend.length - 1]?.count - registrationTrend[0]?.count) / registrationTrend[0]?.count * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with School Info */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">School Analytics Dashboard</h1>
          </div>
          <FaChartBar className="text-6xl opacity-30" />
        </div>
      </div>

      {/* Key Performance Indicators */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <FaUsers className="text-4xl opacity-75" />
              <div className="text-right">
                <p className="text-blue-100 text-sm font-medium">Total Alumni</p>
                <p className="text-4xl font-bold">{statistics.total_alumni || 0}</p>
              </div>
            </div>
            <div className="flex items-center text-blue-100 text-sm">
              <FaClock className="mr-2" />
              <span>{statistics.recent_registrations || 0} new this month</span>
            </div>
          </div>

          {statistics.verified_alumni !== undefined && (
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <FaCheckCircle className="text-4xl opacity-75" />
                <div className="text-right">
                  <p className="text-green-100 text-sm font-medium">Verification Rate</p>
                  <p className="text-4xl font-bold">{verificationRate}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-green-100 text-sm">
                <span>{statistics.verified_alumni || 0} verified</span>
                <span>{statistics.unverified_alumni || 0} pending</span>
              </div>
            </div>
          )}

          {statistics.upcoming_events !== undefined && (
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <FaCalendar className="text-4xl opacity-75" />
                <div className="text-right">
                  <p className="text-purple-100 text-sm font-medium">Active Events</p>
                  <p className="text-4xl font-bold">{statistics.upcoming_events || 0}</p>
                </div>
              </div>
              <div className="flex items-center text-purple-100 text-sm">
                <FaTrophy className="mr-2" />
                <span>{topEvents.length || 0} completed events</span>
              </div>
            </div>
          )}

          {/* NEW: Jobs Card */}
          {jobStats && (
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <FaBriefcase className="text-4xl opacity-75" />
                <div className="text-right">
                  <p className="text-orange-100 text-sm font-medium">Job Postings</p>
                  <p className="text-4xl font-bold">{jobStats.school_jobs + jobStats.alumni_jobs}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-orange-100 text-sm">
                <span>{jobStats.school_jobs} by school</span>
                <span>{jobStats.alumni_jobs} by alumni</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Registration Trend - Enhanced */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <FaChartBar className="mr-3 text-blue-600" />
              Alumni Registration Trend
            </h3>
            <p className="text-sm text-gray-600 mt-1">Growth rate: {growthRate > 0 ? '+' : ''}{growthRate}%</p>
          </div>
        </div>
        {registrationTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={registrationTrend}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#10B981" 
                strokeWidth={3}
                fill="url(#colorCount)"
                name="New Registrations" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FaChartBar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>No registration data available</p>
          </div>
        )}
      </div>

      {/* Batch Distribution - Enhanced Bar Chart */}
      {batchDistribution && batchDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FaGraduationCap className="mr-3 text-purple-600" />
            Alumni Distribution by Graduation Year
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={batchDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="end_year" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="count" 
                fill="#8B5CF6" 
                name="Alumni Count"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Location and Industry Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Locations - Enhanced */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FaMapMarkerAlt className="mr-3 text-red-600" />
            Top Alumni Locations
          </h3>
          {locationDistribution.length > 0 ? (
            <div className="space-y-4">
              {locationDistribution.map((loc, index) => {
                const maxCount = locationDistribution[0]?.count || 1;
                const percentage = (loc.count / maxCount) * 100;
                
                return (
                  <div key={index} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mr-3 text-white font-bold shadow-md">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {loc.current_city}, {loc.current_country}
                          </p>
                        </div>
                      </div>
                      <span className="ml-3 px-4 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-bold">
                        {loc.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FaMapMarkerAlt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>No location data available</p>
            </div>
          )}
        </div>

        {/* Industry Distribution - Enhanced */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FaIndustry className="mr-3 text-green-600" />
            Industry Distribution
          </h3>
          {industryDistribution.length > 0 ? (
            <div className="space-y-4">
              {industryDistribution.map((industry, index) => {
                const maxCount = industryDistribution[0]?.count || 1;
                const percentage = (industry.count / maxCount) * 100;
                
                return (
                  <div key={index} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mr-3 text-white font-bold shadow-md">
                          {index + 1}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {industry.industry}
                        </p>
                      </div>
                      <span className="ml-3 px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-bold">
                        {industry.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FaIndustry className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>No industry data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Events Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Type - Enhanced Pie Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FaCalendar className="mr-3 text-purple-600" />
            Events by Type
          </h3>
          {eventsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventsByType}
                  dataKey="count"
                  nameKey="event_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ event_type, percent }) => `${event_type}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {eventsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FaCalendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>No event data available</p>
            </div>
          )}
        </div>

        {/* Top Attended Events - Enhanced Cards */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FaTrophy className="mr-3 text-yellow-600" />
            Most Popular Events
          </h3>
          {topEvents.length > 0 ? (
            <div className="space-y-3">
              {topEvents.map((event, index) => (
                <div 
                  key={index} 
                  className="p-4 border-2 border-gray-100 rounded-lg hover:border-yellow-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">{event.title}</h4>
                        {event.event_date && (
                          <p className="text-xs text-gray-500">
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="ml-3 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold whitespace-nowrap">
                      {event.attendee_count} attendees
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FaTrophy className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>No event data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Employers - NOW CLICKABLE */}
      {statistics?.top_employers && statistics.top_employers.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FaBuilding className="mr-3 text-blue-600" />
            Top Employers Hiring Our Alumni
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {statistics.top_employers.slice(0, 10).map((employer, index) => (
              <div 
                key={index} 
                onClick={() => handleEmployerClick(employer)}
                className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>
                  <span className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {employer.company_name}
                  </span>
                </div>
                <span className="ml-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold group-hover:bg-blue-100 transition-colors">
                  {employer.count} alumni
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employer Alumni Modal */}
      {showEmployerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center">
                    <FaBuilding className="mr-3" />
                    {selectedEmployer?.company_name}
                  </h2>
                  <p className="text-blue-100 mt-1">{employerAlumni.length} Alumni Working Here</p>
                </div>
                <button 
                  onClick={() => setShowEmployerModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingAlumni ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : employerAlumni.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employerAlumni.map((alumni) => (
                    <div 
                      key={alumni.user_id}
                      onClick={() => handleAlumniClick(alumni.user_id)}
                      className="flex items-center p-4 border-2 border-gray-100 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex-shrink-0 mr-4">
                        {alumni.profile_picture ? (
                          <img 
                            src={getAvatarUrl(alumni.profile_picture)} 
                            alt={`${alumni.first_name} ${alumni.last_name}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                            {alumni.first_name.charAt(0)}{alumni.last_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {alumni.first_name} {alumni.last_name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">{alumni.position}</p>
                        {alumni.end_year && (
                          <p className="text-xs text-gray-500 mt-1">Class of {alumni.end_year}</p>
                        )}
                        {alumni.current_city && (
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <FaMapMarkerAlt className="mr-1" />
                            {alumni.current_city}, {alumni.current_country}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FaUsers className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>No alumni data available for this company</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolAdminAnalytics;