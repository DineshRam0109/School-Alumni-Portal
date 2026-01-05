import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { toast } from 'react-toastify';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaUsers, FaSchool, FaCalendar, FaBriefcase } from 'react-icons/fa';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [dashboardRes, userRes, eventRes, jobRes] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getUserAnalytics(),
        analyticsService.getEventAnalytics(),
        analyticsService.getJobAnalytics()
      ]);

      setStats({
        dashboard: dashboardRes.data?.statistics || {},
        users: userRes.data?.analytics || {},
        events: eventRes.data?.analytics || {},
        jobs: jobRes.data?.analytics || {}
      });
    } catch (error) {
      toast.error('Failed to load analytics');
      setStats({
        dashboard: {},
        users: {},
        events: {},
        jobs: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const overviewData = stats?.dashboard?.overview || {
    total_users: 0,
    total_schools: 0,
    total_events: 0,
    total_jobs: 0
  };

  const registrationTrend = stats?.users?.registration_trend || [];
  const topSchools = stats?.dashboard?.top_schools || [];
  const topCompanies = stats?.dashboard?.top_companies || [];
  
  const userVerificationData = stats?.users?.verification_status || [];
  const locationDistribution = stats?.users?.location_distribution || [];
  
  const eventsByType = stats?.events?.events_by_type || [];
  const topEvents = stats?.events?.top_events || [];
  
  const jobsByType = stats?.jobs?.jobs_by_type || [];
  const jobsByPostedBy = stats?.jobs?.jobs_by_posted_by || [];
  const topJobLocations = stats?.jobs?.top_job_locations || [];
  const topHiringCompanies = stats?.jobs?.top_hiring_companies || [];

  // Format verification data with proper labels
  const formattedVerificationData = userVerificationData.map(item => ({
    ...item,
    name: item.is_verified ? 'Verified' : 'Unverified',
    count: parseInt(item.count)
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{overviewData.total_users}</p>
            </div>
            <FaUsers className="text-3xl text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Schools</p>
              <p className="text-3xl font-bold text-gray-900">{overviewData.total_schools}</p>
            </div>
            <FaSchool className="text-3xl text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Events</p>
              <p className="text-3xl font-bold text-gray-900">{overviewData.total_events}</p>
            </div>
            <FaCalendar className="text-3xl text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900">{overviewData.total_jobs}</p>
            </div>
            <FaBriefcase className="text-3xl text-orange-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            {['users', 'events', 'jobs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Registration Trend */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Trend (Last 12 Months)</h3>
                {registrationTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={registrationTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" name="New Users" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">No registration data available</div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Verification Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Verification Status</h3>
                  {formattedVerificationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={formattedVerificationData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.name}: ${entry.count}`}
                        >
                          {formattedVerificationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.is_verified ? '#10B981' : '#EF4444'} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No user verification data available</div>
                  )}
                </div>

                {/* Top Locations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
                  {locationDistribution.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {locationDistribution.slice(0, 10).map((loc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm font-medium text-gray-900">
                            {loc.current_city}, {loc.current_country}
                          </span>
                          <span className="text-sm text-gray-600">{loc.count} users</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No location data available</div>
                  )}
                </div>

                {/* Top Schools */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Schools</h3>
                  {topSchools.length > 0 ? (
                    <div className="space-y-3">
                      {topSchools.map((school, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate" title={school.school_name}>
                              {school.school_name}
                            </p>
                          </div>
                          <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full whitespace-nowrap">
                            {school.alumni_count} alumni
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No school data available</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Events by Type */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Type</h3>
                  {eventsByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={eventsByType}
                          dataKey="count"
                          nameKey="event_type"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {eventsByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No event type data available</div>
                  )}
                </div>

                {/* Top Attended Events */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Attended Events</h3>
                  {topEvents.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {topEvents.map((event, index) => (
                        <div key={index} className="p-3 border rounded">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-900">{event.title}</span>
                            <span className="text-sm text-blue-600">{event.attendee_count} attendees</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Date not available'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No event data available</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Jobs by Type */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Type</h3>
                  {jobsByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={jobsByType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="job_type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No job type data available</div>
                  )}
                </div>

                {/* Jobs Posted By (Alumni vs School Admin) */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs Posted By</h3>
                  {jobsByPostedBy.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={jobsByPostedBy}
                          dataKey="count"
                          nameKey="posted_by"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.posted_by}: ${entry.count}`}
                        >
                          {jobsByPostedBy.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No posted by data available</div>
                  )}
                </div>

                {/* Top Job Locations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Job Locations</h3>
                  {topJobLocations.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {topJobLocations.map((location, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm font-medium text-gray-900">{location.location}</span>
                          <span className="text-sm text-gray-600">{location.job_count} jobs</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No location data available</div>
                  )}
                </div>

                {/* Top Hiring Companies */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Hiring Companies</h3>
                  {topHiringCompanies.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {topHiringCompanies.map((company, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm font-medium text-gray-900">{company.company_name}</span>
                          <span className="text-sm text-gray-600">{company.job_count} jobs</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No company data available</div>
                  )}
                </div>

                {/* Alumni Working at Top Companies */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Alumni by Company</h3>
                  {topCompanies.length > 0 ? (
                    <div className="space-y-3">
                      {topCompanies.map((company, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate" title={company.company_name}>
                              {company.company_name}
                            </p>
                          </div>
                          <span className="ml-3 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full whitespace-nowrap">
                            {company.employee_count} alumni
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No company data available</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;