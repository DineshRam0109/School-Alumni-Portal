import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import { schoolService } from '../services/schoolService';
import { toast } from 'react-toastify';
import { 
  FaCalendar, FaMapMarkerAlt, FaUsers, FaFilter, 
  FaSearch, FaPlus, FaCheckCircle, FaClock, FaTicketAlt, FaUniversity
} from 'react-icons/fa';

const Events = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [filters, setFilters] = useState({
    event_type: '',
    search: '',
    upcoming: 'true',
    school_id: ''
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchSchools = async () => {
    try {
      setLoadingSchools(true);
      const response = await schoolService.getAllSchools();
      setSchools(response.data?.schools || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setLoadingSchools(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getAllEvents(filters);
      setEvents(response.data?.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      
      // Handle unauthorized access to school filter
      if (error.response?.status === 403 || error.response?.status === 401) {
        toast.error('Please log in to filter by school');
        // Clear school filter if not authenticated
        setFilters(prev => ({ ...prev, school_id: '' }));
      } else {
        toast.error('Failed to load events');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventFull = (event) => {
    return event.max_attendees && event.registered_count >= event.max_attendees;
  };

  const isRegistrationClosed = (event) => {
    if (!event.registration_deadline) return false;
    return new Date(event.registration_deadline) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">
            Discover and join alumni events
          </p>
        </div>
        {(user?.role === 'school_admin' || user?.role === 'alumni') && (
          <button
            onClick={() => navigate('/create-event')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            Create Event
          </button>
        )}
      </div>

      {/* Filters - Always Visible */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <FaFilter className="mr-2 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Events
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, location..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School
            </label>
            <div className="relative">
              <FaUniversity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
              <select
                value={filters.school_id}
                onChange={(e) => handleFilterChange('school_id', e.target.value)}
                disabled={loadingSchools}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="">All Schools</option>
                {schools.map((school) => (
                  <option key={school.school_id} value={school.school_id}>
                    {school.school_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <select
              value={filters.event_type}
              onChange={(e) => handleFilterChange('event_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="reunion">Reunion</option>
              <option value="networking">Networking</option>
              <option value="workshop">Workshop</option>
              <option value="social">Social</option>
              <option value="fundraiser">Fundraiser</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              value={filters.upcoming}
              onChange={(e) => handleFilterChange('upcoming', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="true">Upcoming Events</option>
              <option value="false">Past Events</option>
              <option value="">All Events</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.school_id || filters.event_type || filters.search) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {filters.school_id && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {schools.find(s => s.school_id === parseInt(filters.school_id))?.school_name || 'School'}
                <button
                  onClick={() => handleFilterChange('school_id', '')}
                  className="ml-2 text-blue-900 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            )}
            {filters.event_type && (
              <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full capitalize">
                {filters.event_type}
                <button
                  onClick={() => handleFilterChange('event_type', '')}
                  className="ml-2 text-purple-900 hover:text-purple-700"
                >
                  ×
                </button>
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                Search: "{filters.search}"
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="ml-2 text-green-900 hover:text-green-700"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => setFilters({ event_type: '', search: '', upcoming: 'true', school_id: '' })}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FaCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 mb-4">
            {filters.search || filters.event_type || filters.school_id
              ? 'Try adjusting your filters' 
              : 'Check back later for upcoming events'}
          </p>
          {(user?.role === 'school_admin' || user?.role === 'alumni') && (
            <button
              onClick={() => navigate('/create-event')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FaPlus className="mr-2" />
              Create First Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isFull = isEventFull(event);
            const regClosed = isRegistrationClosed(event);
            const isPast = new Date(event.event_date) < new Date();

            return (
              <div
                key={event.event_id}
                onClick={() => handleEventClick(event.event_id)}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group"
              >
                {/* Event Image/Banner */}
                {event.event_image ? (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.event_image}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center overflow-hidden">
                    <FaCalendar className="text-white text-6xl opacity-20" />
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  </div>
                )}

                {/* Event Content */}
                <div className="p-6">
                  {/* Status Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded capitalize">
                      {event.event_type}
                    </span>
                    {!isPast && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Upcoming
                      </span>
                    )}
                    {isPast && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                        Past
                      </span>
                    )}
                    {isFull && !isPast && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                        Full
                      </span>
                    )}
                    {regClosed && !isPast && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                        Registration Closed
                      </span>
                    )}
                  </div>

                  {/* Event Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </h3>

                  {/* Event Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-start">
                      <FaCalendar className="mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                      <div>
                        <div className="font-medium">{formatDate(event.event_date)}</div>
                        <div className="text-xs text-gray-500">{formatTime(event.event_date)}</div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <FaMapMarkerAlt className="mr-2 mt-0.5 flex-shrink-0 text-red-500" />
                      <span className="line-clamp-1">
                        {event.is_online ? 'Online Event' : event.location}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <FaUsers className="mr-2 flex-shrink-0 text-green-500" />
                      <span>
                        {event.registered_count || 0}
                        {event.max_attendees && ` / ${event.max_attendees}`} registered
                      </span>
                    </div>

                    {event.ticket_price > 0 && (
                      <div className="flex items-center">
                        <FaTicketAlt className="mr-2 flex-shrink-0 text-purple-500" />
                        <span className="font-semibold text-gray-900">
                          ${event.ticket_price}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* School Name */}
                  {event.school_name && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center">
                        <FaUniversity className="mr-2 text-gray-400 text-sm" />
                        <div>
                          <p className="text-xs text-gray-500">Organized by</p>
                          <p className="text-sm font-medium text-gray-900">{event.school_name}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hover Effect Indicator */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Events;