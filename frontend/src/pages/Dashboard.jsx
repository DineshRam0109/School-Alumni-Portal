import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FaUsers, FaCalendar, FaBriefcase, FaUserFriends,
  FaSchool, FaArrowRight
} from 'react-icons/fa';
import api from '../services/api';
import { toast } from 'react-toastify';
import { getAvatarUrl,handleImageError } from '../utils/profilePictureUtils';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    connections: 0,
    events: 0,
    jobs: 0,
    schools: 0
  });
  const [recentConnections, setRecentConnections] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch connections
      const connectionsRes = await api.get('/connections');
      setRecentConnections(connectionsRes.data.connections.slice(0, 5));
      setStats(prev => ({ ...prev, connections: connectionsRes.data.connections.length }));

      // Fetch events
      const eventsRes = await api.get('/events', { params: { upcoming: 'true', limit: 5 } });
      setUpcomingEvents(eventsRes.data.events);
      setStats(prev => ({ ...prev, events: eventsRes.data.events.length }));

      // Fetch jobs
      const jobsRes = await api.get('/jobs', { params: { limit: 5 } });
      setRecentJobs(jobsRes.data.jobs);
      setStats(prev => ({ ...prev, jobs: jobsRes.data.jobs.length }));

      // Fetch schools
      const schoolsRes = await api.get('/schools', { params: { limit: 1 } });
      setStats(prev => ({ ...prev, schools: schoolsRes.data.pagination.total }));

      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  const statCards = [
    { 
      id: 'connections-card',
      title: 'My Connections', 
      value: stats.connections, 
      icon: FaUserFriends, 
      color: 'bg-blue-500', 
      link: '/connections' 
    },
    { 
      id: 'events-card',
      title: 'Upcoming Events', 
      value: stats.events, 
      icon: FaCalendar, 
      color: 'bg-green-500', 
      link: '/events' 
    },
    { 
      id: 'jobs-card',
      title: 'Active Jobs', 
      value: stats.jobs, 
      icon: FaBriefcase, 
      color: 'bg-purple-500', 
      link: '/jobs' 
    },
    { 
      id: 'schools-card',
      title: 'Schools', 
      value: stats.schools, 
      icon: FaSchool, 
      color: 'bg-orange-500', 
      link: '/schools' 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.first_name}! 👋
        </h1>
        <p className="text-blue-100">
          Stay connected with your alumni network, explore opportunities and never miss events
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
                          key={stat.id}
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
{/* Recent Connections */}
<div className="bg-white rounded-lg shadow">
  <div className="p-6 border-b">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">Recent Connections</h2>
      <Link to="/connections" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
        View All <FaArrowRight className="inline ml-1" />
      </Link>
    </div>
  </div>
  <div className="p-6">
    {recentConnections.length > 0 ? (
      <div className="space-y-4">
        {recentConnections.map((connection) => (
          <div 
            key={connection.connection_id || connection.user_id || `connection-${connection.first_name}-${connection.last_name}`}
            className="flex items-center space-x-4"
          >
            {/* ✅ FIXED: Pass connection object as first parameter */}
            <img
              src={getAvatarUrl(connection, connection.first_name, connection.last_name)}
              alt={`${connection.first_name} ${connection.last_name}`}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => handleImageError(e, connection.first_name, connection.last_name)}
            />
            
            <div className="flex-1">
              <Link
                to={`/profile/${connection.user_id}`}
                className="font-medium text-gray-900 hover:text-blue-600"
              >
                {connection.first_name} {connection.last_name}
              </Link>
              <p className="text-sm text-gray-500">{connection.position || 'Alumni'}</p>
              <p className="text-xs text-gray-400">{connection.current_city}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500 text-center py-8">No connections yet. Start networking!</p>
    )}
  </div>
</div>


        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
              <Link to="/events" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All <FaArrowRight className="inline ml-1" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.event_id || `event-${event.title}-${event.event_date}`}
                    to={`/events/${event.event_id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(event.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{event.location}</p>
                      </div>
                      <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                        {event.event_type}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Job Postings</h2>
            <Link to="/jobs" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All <FaArrowRight className="inline ml-1" />
            </Link>
          </div>
        </div>
        <div className="p-6">
          {recentJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentJobs.map((job) => (
                <Link
                  key={job.job_id || `job-${job.job_title}-${job.company_name}`}
                  to={`/jobs/${job.job_id}`}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium text-gray-900">{job.job_title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{job.company_name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">{job.location}</span>
                    <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded">
                      {job.job_type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No job postings available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;