// pages/SchoolDetails.jsx - UPDATED with school logo support
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaArrowLeft, FaMapMarkerAlt, FaGlobe, FaCalendar, FaUsers, 
  FaBuilding, FaGraduationCap, FaUserCheck, FaUserClock, FaSearch
} from 'react-icons/fa';
import { getAvatarUrl, handleImageError, getFileUrl } from '../utils/profilePictureUtils';

const SchoolDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [school, setSchool] = useState(null);
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alumniLoading, setAlumniLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [alumniFilters, setAlumniFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    batch_year: ''
  });
  const [pagination, setPagination] = useState(null);

  // Define available tabs based on user role
  const getAvailableTabs = () => {
    if (user?.role === 'alumni') {
      return ['overview', 'alumni'];
    }
    return ['overview', 'alumni', 'statistics'];
  };

  const availableTabs = getAvailableTabs();

  useEffect(() => {
    fetchSchoolData();
  }, [id]);

  // Listen for school logo updates
  useEffect(() => {
    const handleLogoUpdate = (event) => {
      const { schoolId, logo } = event.detail;
      if (school && school.school_id === schoolId) {
        setSchool(prev => ({ ...prev, logo }));
      }
    };

    window.addEventListener('schoolLogoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('schoolLogoUpdated', handleLogoUpdate);
    };
  }, [school]);

  useEffect(() => {
    if (activeTab === 'alumni') {
      fetchAlumni();
    } else if (activeTab === 'statistics') {
      if (user?.role === 'school_admin') {
        navigate('/school-admin/analytics');
      } else {
        navigate(`/schools/${id}/analytics`);
      }
    }
  }, [activeTab, alumniFilters]);

  const fetchSchoolData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/schools/${id}`);
      setSchool(response.data.school);
    } catch (error) {
      console.error('Failed to load school:', error);
      toast.error('Failed to load school details');
      navigate('/schools');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumni = async () => {
    try {
      setAlumniLoading(true);
      
      const endpoint = user?.role === 'super_admin' 
        ? `/super-admin/schools/${id}/alumni`
        : `/schools/${id}/alumni`;
      
      const response = await api.get(endpoint, { params: alumniFilters });
      
      setAlumni(response.data.alumni || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load alumni:', error);
      toast.error(error.response?.data?.message || 'Failed to load alumni list');
      setAlumni([]);
    } finally {
      setAlumniLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setAlumniFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setAlumniFilters({
      page: 1,
      limit: 20,
      search: '',
      batch_year: ''
    });
  };

  // Helper function to get school logo URL
  const getSchoolLogoUrl = (school) => {
    if (school?.logo && typeof school.logo === 'string' && school.logo.trim()) {
      return getFileUrl(school.logo);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">School not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>

      {/* School Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {/* School Logo with Fallback */}
              {getSchoolLogoUrl(school) ? (
                <img 
                  src={getSchoolLogoUrl(school)} 
                  alt={school.school_name} 
                  className="w-24 h-24 bg-white rounded-lg p-2 object-cover" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-24 h-24 bg-white rounded-lg flex items-center justify-center"
                style={{ display: getSchoolLogoUrl(school) ? 'none' : 'flex' }}
              >
                <FaGraduationCap className="text-blue-600 text-5xl" />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold mb-2">{school.school_name}</h1>
                <p className="text-blue-100 mb-2">Code: {school.school_code}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <FaMapMarkerAlt className="mr-1" />
                    {school.city}, {school.state}
                  </span>
                  {school.established_year && (
                    <span className="flex items-center">
                      <FaCalendar className="mr-1" />
                      Est. {school.established_year}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{school.alumni_count || 0}</p>
            <p className="text-sm text-gray-600">Total Alumni</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {school.batch_stats?.length || 0}
            </p>
            <p className="text-sm text-gray-600">Batches</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            {availableTabs.map((tab) => (
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

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {school.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-gray-700 leading-relaxed">{school.description}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    {school.address && (
                      <div className="flex items-start">
                        <FaMapMarkerAlt className="text-gray-400 mt-1 mr-3" />
                        <div>
                          <p className="text-gray-700">{school.address}</p>
                          <p className="text-gray-700">{school.city}, {school.state}</p>
                          <p className="text-gray-700">{school.country}</p>
                        </div>
                      </div>
                    )}
                    {school.website && (
                      <div className="flex items-center">
                        <FaGlobe className="text-gray-400 mr-3" />
                        <a 
                          href={school.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          {school.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {school.batch_stats && school.batch_stats.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Batches</h3>
                    <div className="space-y-2">
                      {school.batch_stats.slice(0, 5).map((batch) => (
                        <div key={batch.batch_year} className="flex items-center justify-between">
                          <span className="flex items-center text-gray-700">
                            <FaGraduationCap className="text-gray-400 mr-2" />
                            Batch of {batch.batch_year}
                          </span>
                          <span className="text-sm font-medium text-gray-600">{batch.count} alumni</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {school.recent_alumni && school.recent_alumni.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Alumni</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {school.recent_alumni.map((person) => (
                      <Link
                        key={person.user_id}
                        to={`/profile/${person.user_id}`}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <img
                            src={getAvatarUrl(person)}
                            alt={`${person.first_name} ${person.last_name}`}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => handleImageError(e, person.first_name, person.last_name)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {person.first_name} {person.last_name}
                            </p>
                            <p className="text-xs text-gray-500">Batch of {person.end_year}</p>
                          </div>
                        </div>
                        {person.current_city && (
                          <p className="text-xs text-gray-400 flex items-center">
                            <FaMapMarkerAlt className="mr-1" />
                            {person.current_city}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alumni' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="grid md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={alumniFilters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={alumniFilters.batch_year}
                  onChange={(e) => handleFilterChange('batch_year', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Batches</option>
                  {school.batch_stats?.map((batch) => (
                    <option key={batch.batch_year} value={batch.batch_year}>
                      Batch of {batch.batch_year}
                    </option>
                  ))}
                </select>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Clear Filters
                </button>
              </div>

              {/* Alumni List */}
              {alumniLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : alumni.length === 0 ? (
                <div className="text-center py-12">
                  <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No alumni found</p>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alumni.map((person) => (
                      <div key={person.user_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3 mb-3">
                          <img
                            src={getAvatarUrl(person)}
                            alt={`${person.first_name} ${person.last_name}`}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => handleImageError(e, person.first_name, person.last_name)}
                          />
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/profile/${person.user_id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                            >
                              {person.first_name} {person.last_name}
                            </Link>
                            <p className="text-xs text-gray-500">
                              {person.degree_level} • {person.end_year}
                            </p>
                          </div>
                          {person.is_verified ? (
                            <FaUserCheck className="text-green-500 flex-shrink-0" title="Verified" />
                          ) : (
                            <FaUserClock className="text-orange-500 flex-shrink-0" title="Pending Verification" />
                          )}
                        </div>
                        {person.company_name && (
                          <p className="text-sm text-gray-600 truncate">
                            {person.position} at {person.company_name}
                          </p>
                        )}
                        {person.current_city && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center">
                            <FaMapMarkerAlt className="mr-1" />
                            {person.current_city}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.pages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-6">
                      <button
                        onClick={() => handleFilterChange('page', alumniFilters.page - 1)}
                        disabled={alumniFilters.page === 1}
                        className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {alumniFilters.page} of {pagination.pages}
                      </span>
                      <button
                        onClick={() => handleFilterChange('page', alumniFilters.page + 1)}
                        disabled={alumniFilters.page === pagination.pages}
                        className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolDetails;