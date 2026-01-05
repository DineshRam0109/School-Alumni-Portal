import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import { schoolService } from '../services/schoolService';
import { toast } from 'react-toastify';
import { 
  FaCalendar, FaMapMarkerAlt, FaUsers, FaDollarSign, FaInfoCircle,
  FaArrowLeft, FaGlobe, FaBuilding, FaTicketAlt, FaUserFriends,
  FaEdit, FaClock, FaRegCalendarCheck
} from 'react-icons/fa';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [formData, setFormData] = useState({
    school_id: '',
    title: '',
    description: '',
    event_type: 'networking',
    event_date: '',
    end_date: '',
    location: '',
    venue_details: '',
    is_online: false,
    meeting_link: '',
    max_attendees: '',
    registration_deadline: '',
    ticket_price: '0'
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await schoolService.getAllSchools({ limit: 1000 });
      setSchools(response.data.schools);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    // Title validation
    if (!formData.title.trim()) {
      toast.error('Event title is required');
      return false;
    }

    if (formData.title.trim().length < 5) {
      toast.error('Event title must be at least 5 characters');
      return false;
    }

    // Description validation - REQUIRED
    if (!formData.description.trim()) {
      toast.error('Event description is required');
      return false;
    }

    if (formData.description.trim().length < 20) {
      toast.error('Event description must be at least 20 characters');
      return false;
    }

    // Date validation
    if (!formData.event_date) {
      toast.error('Event start date is required');
      return false;
    }

    const eventDate = new Date(formData.event_date);
    const now = new Date();
    if (eventDate < now) {
      toast.error('Event date must be in the future');
      return false;
    }

    // End date validation
    if (formData.end_date) {
      const endDate = new Date(formData.end_date);
      if (endDate < eventDate) {
        toast.error('End date must be after start date');
        return false;
      }
    }

    // Registration deadline validation
    if (formData.registration_deadline) {
      const deadline = new Date(formData.registration_deadline);
      if (deadline > eventDate) {
        toast.error('Registration deadline must be before event start date');
        return false;
      }
      if (deadline < now) {
        toast.error('Registration deadline must be in the future');
        return false;
      }
    }

    // Location validation
    if (!formData.is_online && !formData.location.trim()) {
      toast.error('Location is required for in-person events');
      return false;
    }

    if (formData.is_online && !formData.meeting_link.trim()) {
      toast.error('Meeting link is required for online events');
      return false;
    }

    // Meeting link format validation
    if (formData.is_online && formData.meeting_link) {
      try {
        new URL(formData.meeting_link);
      } catch (e) {
        toast.error('Please enter a valid meeting link URL');
        return false;
      }
    }

    // Max attendees validation
    if (formData.max_attendees && parseInt(formData.max_attendees) < 1) {
      toast.error('Max attendees must be at least 1');
      return false;
    }

    // Ticket price validation
    if (formData.ticket_price && parseFloat(formData.ticket_price) < 0) {
      toast.error('Ticket price cannot be negative');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        school_id: formData.school_id || null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        ticket_price: parseFloat(formData.ticket_price),
        end_date: formData.end_date || null,
        registration_deadline: formData.registration_deadline || null,
        meeting_link: formData.is_online ? formData.meeting_link : null,
        location: !formData.is_online ? formData.location : null
      };

      const response = await eventService.createEvent(submitData);
      toast.success('🎉 Event created successfully!');
      navigate(`/events/${response.data.event_id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header with Back Button */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/events')}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors mb-4 group"
        >
          <FaArrowLeft className="mr-2 transform group-hover:-translate-x-1 transition-transform" />
          Back to Events
        </button>
        
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 shadow-lg">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Create a New Event
            </h1>
            <p className="text-blue-100 text-lg">
              Organize an amazing event for the alumni community. Fill in the details below to get started.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FaEdit className="mr-3 text-blue-600" />
              Basic Information
            </h2>
            <p className="text-gray-600 text-sm mt-1 ml-9">Tell us about your event</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="e.g., Alumni Reunion 2024"
                />
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-1" />
                  Minimum 5 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="event_type"
                    value={formData.event_type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="reunion">Reunion</option>
                    <option value="networking">Networking</option>
                    <option value="workshop">Workshop</option>
                    <option value="social">Social</option>
                    <option value="fundraiser">Fundraiser</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FaUserFriends className="text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  School (Optional)
                </label>
                <div className="relative">
                  <select
                    name="school_id"
                    value={formData.school_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">All Schools</option>
                    {schools.map((school) => (
                      <option key={school.school_id} value={school.school_id}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FaBuilding className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                required
                maxLength={2000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                placeholder="Describe your event in detail... What will happen, who should attend, what to expect, etc."
              ></textarea>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-1" />
                  Minimum 20 characters
                </p>
                <span className={`text-xs ${formData.description.length >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.description.length} / 2000
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FaCalendar className="mr-3 text-green-600" />
              Date & Time
            </h2>
            <p className="text-gray-600 text-sm mt-1 ml-9">When will your event take place?</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleChange}
                    min={getTodayDateTime()}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <FaClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date & Time (Optional)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    min={formData.event_date || getTodayDateTime()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <FaClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Registration Deadline (Optional)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="registration_deadline"
                    value={formData.registration_deadline}
                    onChange={handleChange}
                    min={getTodayDateTime()}
                    max={formData.event_date}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <FaRegCalendarCheck className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-1" />
                  Must be before event start date
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FaMapMarkerAlt className="mr-3 text-orange-600" />
              Location
            </h2>
            <p className="text-gray-600 text-sm mt-1 ml-9">Where will your event take place?</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-colors duration-200">
              <div className="flex items-center">
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${formData.is_online ? 'bg-blue-600' : 'bg-gray-200'} transition-colors`}>
                  {formData.is_online ? (
                    <FaGlobe className="text-white" />
                  ) : (
                    <FaMapMarkerAlt className="text-gray-600" />
                  )}
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">
                    {formData.is_online ? 'Online Event' : 'In-Person Event'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formData.is_online 
                      ? 'Attendees join virtually' 
                      : 'Attendees gather at physical location'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_online"
                  checked={formData.is_online}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {!formData.is_online ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required={!formData.is_online}
                      maxLength={255}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pl-12"
                      placeholder="e.g., New York Convention Center, 123 Main St, New York"
                    />
                    <FaMapMarkerAlt className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Venue Details (Optional)
                  </label>
                  <textarea
                    name="venue_details"
                    value={formData.venue_details}
                    onChange={handleChange}
                    rows="3"
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    placeholder="Additional venue information: parking instructions, entrance details, room number, etc."
                  ></textarea>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Meeting Link <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    name="meeting_link"
                    value={formData.meeting_link}
                    onChange={handleChange}
                    required={formData.is_online}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pl-12"
                    placeholder="https://zoom.us/j/123456789 or https://meet.google.com/..."
                  />
                  <FaGlobe className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500" />
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-1" />
                  Provide a valid Zoom, Google Meet, or Teams link
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Registration Settings Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FaUsers className="mr-3 text-purple-600" />
              Registration Settings
            </h2>
            <p className="text-gray-600 text-sm mt-1 ml-9">Configure how people can register</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Attendees (Optional)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="max_attendees"
                    value={formData.max_attendees}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Leave empty for unlimited"
                  />
                  <FaUsers className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-1" />
                  Maximum number of attendees allowed
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ticket Price
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    $
                  </div>
                  <input
                    type="number"
                    name="ticket_price"
                    value={formData.ticket_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pl-10"
                    placeholder="0.00"
                  />
                  <FaTicketAlt className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-1" />
                  Enter 0 for free events
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 -mx-4 -mb-8 mt-8">
          <div className="max-w-6xl mx-auto flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/events')}
              disabled={loading}
              className="px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Event...
                </span>
              ) : (
                <span className="flex items-center">
                  <FaCalendar className="mr-2" />
                  Create Event
                </span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;