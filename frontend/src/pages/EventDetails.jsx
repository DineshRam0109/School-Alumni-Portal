import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { eventService } from '../services/eventService';
import { toast } from 'react-toastify';
import { 
  FaCalendar, FaMapMarkerAlt, FaUsers, FaTicketAlt, FaClock, 
  FaCheckCircle, FaTimesCircle, FaEnvelope, FaUser, FaArrowLeft,
  FaGlobe, FaInfoCircle, FaExclamationTriangle
} from 'react-icons/fa';
import { getAvatarUrl,handleImageError } from '../utils/profilePictureUtils';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Check if user is admin (cannot register)
  const isAdmin = user?.role === 'school_admin' || user?.role === 'super_admin';

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await eventService.getEventById(id);
      const eventData = response.data.event;
      setEvent(eventData);
      
      // Check if current user is registered
      const userRegistered = eventData.registrations?.some(
        reg => reg.user_id === user?.user_id
      );
      setIsRegistered(userRegistered);
    } catch (error) {
      toast.error('Failed to load event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (isAdmin) {
      toast.error('Administrators cannot register for events. You can only create and manage events.');
      return;
    }

    if (isRegistered) {
      toast.info('You are already registered for this event');
      return;
    }

    try {
      setRegistering(true);
      await eventService.registerForEvent(id);
      toast.success('Successfully registered for event!');
      fetchEvent();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    
    try {
      await eventService.cancelRegistration(id);
      toast.success('Registration cancelled');
      fetchEvent();
    } catch (error) {
      toast.error('Failed to cancel registration');
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleMessage = (userId) => {
    navigate(`/messages?userId=${userId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventFull = () => {
    return event?.max_attendees && event?.registered_count >= event?.max_attendees;
  };

  const isRegistrationClosed = () => {
    if (!event?.registration_deadline) return false;
    return new Date(event.registration_deadline) < new Date();
  };

  const isPastEvent = () => {
    return new Date(event?.event_date) < new Date();
  };

  const canRegister = () => {
    return !isAdmin && !isRegistered && !isPastEvent() && !isEventFull() && !isRegistrationClosed();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <FaTimesCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Event not found</h3>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/events')} 
        className="flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium"
      >
        <FaArrowLeft className="mr-2" />
        Back to Events
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Event Banner */}
            {event.event_image ? (
              <img 
                src={event.event_image} 
                alt={event.title} 
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center">
                <FaCalendar className="text-white text-6xl opacity-30" />
              </div>
            )}

            <div className="p-6">
              {/* Title and Badges */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{event.title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full capitalize">
                    {event.event_type}
                  </span>
                  {isRegistered && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full flex items-center">
                      <FaCheckCircle className="mr-1.5" />
                      Registered
                    </span>
                  )}
                  {isPastEvent() && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                      Past Event
                    </span>
                  )}
                  {isEventFull() && !isPastEvent() && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                      Event Full
                    </span>
                  )}
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Date & Time */}
                <div className="flex items-start p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <FaCalendar className="text-blue-600 text-xl mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Date & Time</p>
                    <p className="font-semibold text-gray-900">{formatDate(event.event_date)}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{formatTime(event.event_date)}</p>
                    {event.end_date && (
                      <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-blue-200">
                        Ends: {formatDate(event.end_date)} at {formatTime(event.end_date)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start p-4 bg-red-50 rounded-lg border border-red-100">
                  <FaMapMarkerAlt className="text-red-600 text-xl mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-1">Location</p>
                    {event.is_online ? (
                      <>
                        <div className="flex items-center mb-2">
                          <FaGlobe className="mr-2 text-green-600" />
                          <p className="font-semibold text-gray-900">Online Event</p>
                        </div>
                        {event.meeting_link && (isRegistered || isAdmin) && (
                          <a 
                            href={event.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            Join Meeting →
                          </a>
                        )}
                        {event.meeting_link && !isRegistered && !isAdmin && (
                          <p className="text-xs text-gray-600 italic">
                            Meeting link available after registration
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="font-semibold text-gray-900">{event.location}</p>
                    )}
                  </div>
                </div>

                {/* Attendees */}
                <div className="flex items-start p-4 bg-green-50 rounded-lg border border-green-100">
                  <FaUsers className="text-green-600 text-xl mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Attendees</p>
                    <p className="font-semibold text-gray-900 text-lg">
                      {event.registered_count || 0} registered
                    </p>
                    {event.max_attendees && (
                      <p className="text-sm text-gray-600 mt-1">
                        Maximum: {event.max_attendees}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ticket Price */}
                {event.ticket_price > 0 && (
                  <div className="flex items-start p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <FaTicketAlt className="text-purple-600 text-xl mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide mb-1">Ticket Price</p>
                      <p className="font-bold text-gray-900 text-2xl">${event.ticket_price}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* About Section */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FaInfoCircle className="mr-2 text-blue-600" />
                  About this event
                </h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </div>

              {/* Venue Details */}
              {event.venue_details && !event.is_online && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Venue Details</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{event.venue_details}</p>
                </div>
              )}

              {/* Organized By */}
              {(event.school_name || event.creator_first_name) && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Organized By</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {event.school_name && (
                      <p className="font-semibold text-gray-900 text-lg">{event.school_name}</p>
                    )}
                    {event.creator_first_name && (
                      <p className="text-sm text-gray-600 mt-1">
                        Created by {event.creator_first_name} {event.creator_last_name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendees Section */}
{/* Attendees Section - Ultra Compact Grid Layout */}
{event.registrations && event.registrations.length > 0 && (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
      <FaUsers className="mr-2 text-blue-600" />
      Registered Attendees ({event.registrations.length})
    </h2>
    
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {event.registrations.map((attendee) => (
        <div 
          key={attendee.user_id} 
          className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-2 border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group relative"
        >
          {/* Avatar and Name */}
          <div className="text-center">
            <img
              src={getAvatarUrl(attendee)}
              alt={`${attendee.first_name} ${attendee.last_name}`}
              className="w-10 h-10 rounded-full object-cover mx-auto mb-1.5 ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all"
              onError={(e) => handleImageError(e, attendee.first_name, attendee.last_name)}
            />
            
            <h4 className="font-semibold text-gray-900 text-xs leading-tight truncate px-1" title={`${attendee.first_name} ${attendee.last_name}`}>
              {attendee.first_name}
            </h4>
            
            {attendee.company_name && (
              <p className="text-xs text-gray-500 truncate px-1" title={attendee.company_name}>
                {attendee.company_name}
              </p>
            )}
          </div>
          
          {/* Action Buttons - Only show for alumni viewing others */}
          {!isAdmin && user?.user_id !== attendee.user_id && (
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={() => handleViewProfile(attendee.user_id)}
                className="flex-1 p-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                title="View Profile"
              >
                <FaUser className="text-xs mx-auto" />
              </button>
              <button
                onClick={() => handleMessage(attendee.user_id)}
                className="flex-1 p-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                title="Send Message"
              >
                <FaEnvelope className="text-xs mx-auto" />
              </button>
            </div>
          )}
          
          {/* "You" Badge */}
          {user?.user_id === attendee.user_id && (
            <div className="absolute top-1 right-1">
              <span className="inline-block px-1.5 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                You
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
              
            
          
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
            {/* Admin Notice */}
            {isAdmin && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mb-6">
                <div className="flex items-start">
                  <FaInfoCircle className="text-blue-600 text-xl mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-blue-900 mb-1">Administrator View</p>
                    <p className="text-sm text-blue-700">
                      As an administrator, you can view event details but cannot register as an attendee.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Registration Status - Only for Alumni */}
            {!isAdmin && isRegistered && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg mb-6">
                <div className="flex items-start">
                  <FaCheckCircle className="text-green-600 text-xl mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-900 mb-1">You're registered!</p>
                    <p className="text-sm text-green-700">
                      We'll send you reminders before the event.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning Messages - Only for Alumni */}
            {!isAdmin && !isRegistered && isEventFull() && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg mb-6">
                <div className="flex items-start">
                  <FaExclamationTriangle className="text-red-600 text-xl mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-900 mb-1">Event is full</p>
                    <p className="text-sm text-red-700">Maximum capacity reached</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Only for Alumni */}
            {!isAdmin && (
              <div className="mb-6">
                {canRegister() ? (
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                  >
                    {registering ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Registering...
                      </span>
                    ) : 'Register for Event'}
                  </button>
                ) : isRegistered ? (
                  <button
                    onClick={handleCancelRegistration}
                    className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    Cancel Registration
                  </button>
                ) : isPastEvent() ? (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-gray-300 text-gray-600 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Event Has Ended
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-gray-300 text-gray-600 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Registration Unavailable
                  </button>
                )}
              </div>
            )}

            {/* Event Summary */}
            <div className="space-y-4 border-t pt-6">
              {event.max_attendees && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Available Spots</p>
                  <p className="font-bold text-gray-900 text-xl">
                    {event.max_attendees - (event.registered_count || 0)} remaining
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${((event.registered_count || 0) / event.max_attendees) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {event.ticket_price > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Ticket Price</p>
                  <p className="font-bold text-gray-900 text-2xl">${event.ticket_price}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;