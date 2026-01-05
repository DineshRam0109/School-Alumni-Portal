import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { searchService } from '../services/searchService';
import { connectionService } from '../services/connectionService';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaSearch, FaFilter, FaUserPlus, FaEnvelope, FaMapMarkerAlt, 
  FaBriefcase, FaUserCheck, FaUserClock, FaTimes, FaGraduationCap
} from 'react-icons/fa';
import { getAvatarUrl,handleImageError } from '../utils/profilePictureUtils'; 

const AlumniDirectory = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isSchoolAdmin = user?.role === 'school_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isAlumni = user?.role === 'alumni';
  
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    school_id: '',
    batch_year: '',
    city: '',
    country: '',
    company: '',
    profession: '',
    degree_level: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    schools: [],
    batch_years: [],
    cities: [],
    countries: [],
    companies: [],
    degree_levels: []
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState({});
  const [loadingConnections, setLoadingConnections] = useState({});

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAlumni();
  }, [filters, pagination.page]);

  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const response = await searchService.getSearchFilters();
      
      if (response && response.data) {
        const data = response.data;
        const filtersData = data.filters || data;
        
        setFilterOptions({
          schools: Array.isArray(filtersData.schools) ? filtersData.schools : [],
          batch_years: Array.isArray(filtersData.batch_years) ? filtersData.batch_years : [],
          cities: Array.isArray(filtersData.cities) ? filtersData.cities : [],
          countries: Array.isArray(filtersData.countries) ? filtersData.countries : [],
          companies: Array.isArray(filtersData.companies) ? filtersData.companies : [],
          degree_levels: Array.isArray(filtersData.degree_levels) ? filtersData.degree_levels : []
        });
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
      toast.error('Failed to load filters');
    } finally {
      setFiltersLoading(false);
    }
  };

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      // FIXED: School admin - auto-filter by their school
      if (isSchoolAdmin && user.school_id) {
        params.school_id = user.school_id;
      }
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      const response = await searchService.searchAlumni(params);
      
      setAlumni(response.data.alumni || []);
      setPagination(prev => ({ 
        ...prev, 
        total: response.data.pagination?.total || 0, 
        pages: response.data.pagination?.pages || 0 
      }));
      
      // FIXED: Only fetch connection statuses for ALUMNI users
      if (response.data.alumni && response.data.alumni.length > 0 && isAlumni) {
        fetchConnectionStatuses(response.data.alumni);
      }
    } catch (error) {
      console.error('Failed to fetch alumni:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch alumni');
      setAlumni([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatuses = async (alumniList) => {
    const statuses = {};
    const statusPromises = alumniList.map(async (person) => {
      try {
        const response = await connectionService.getConnectionStatus(person.user_id);
        statuses[person.user_id] = response.data.status;
      } catch (error) {
        statuses[person.user_id] = 'none';
      }
    });
    
    await Promise.all(statusPromises);
    setConnectionStatuses(statuses);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchAlumni();
  };

  const handleSendConnection = async (userId) => {
    if (loadingConnections[userId]) return;
    
    try {
      setLoadingConnections(prev => ({ ...prev, [userId]: true }));
      await connectionService.sendRequest(userId);
      toast.success('Connection request sent!');
      setConnectionStatuses(prev => ({ ...prev, [userId]: 'sent' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setLoadingConnections(prev => ({ ...prev, [userId]: false }));
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      school_id: isSchoolAdmin ? user.school_id : '', // Keep school filter for admin
      batch_year: '',
      city: '',
      country: '',
      company: '',
      profession: '',
      degree_level: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getConnectionButtonContent = (userId) => {
    const status = connectionStatuses[userId];
    const isLoading = loadingConnections[userId];

    if (isLoading) {
      return (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </>
      );
    }

    switch (status) {
      case 'accepted':
        return (
          <>
            <FaUserCheck className="mr-1" />
            Connected
          </>
        );
      case 'sent':
        return (
          <>
            <FaUserClock className="mr-1" />
            Pending
          </>
        );
      case 'received':
        return (
          <>
            <FaUserClock className="mr-1" />
            Respond
          </>
        );
      default:
        return (
          <>
            <FaUserPlus className="mr-1" />
            Connect
          </>
        );
    }
  };

  const isConnectionButtonDisabled = (userId) => {
    const status = connectionStatuses[userId];
    return loadingConnections[userId] || status === 'accepted' || status === 'sent';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumni Directory</h1>
          <p className="text-gray-600 mt-1">
            {isSchoolAdmin 
              ? `View alumni from ${user.school_name || 'your school'}`
              : isSuperAdmin
              ? 'View all alumni across all schools'
              : 'Connect with alumni from all schools'}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FaFilter className="mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

    

      <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={`lg:block ${showFilters ? 'block' : 'hidden'} bg-white rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              <FaTimes className="mr-1" /> Reset
            </button>
          </div>

          {filtersLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading filters...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* FIXED: Hide school filter for school admin */}
              {!isSchoolAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School
                  </label>
                  <select
                    value={filters.school_id}
                    onChange={(e) => handleFilterChange('school_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Schools</option>
                    {filterOptions.schools.map((school) => (
                      <option key={school.school_id} value={school.school_id}>
                        {school.school_name} ({school.alumni_count || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Year
                </label>
                <select
                  value={filters.batch_year}
                  onChange={(e) => handleFilterChange('batch_year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Years</option>
                  {filterOptions.batch_years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Degree Level
                </label>
                <select
                  value={filters.degree_level}
                  onChange={(e) => handleFilterChange('degree_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Levels</option>
                  {filterOptions.degree_levels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Cities</option>
                  {filterOptions.cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Countries</option>
                  {filterOptions.countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  placeholder="Company name"
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profession/Position
                </label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer"
                  value={filters.profession}
                  onChange={(e) => handleFilterChange('profession', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading alumni...</p>
            </div>
          ) : alumni.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <FaSearch className="mx-auto h-16 w-16" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alumni found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search filters or search terms
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600 bg-white rounded-lg shadow px-4 py-3">
                Showing <span className="font-semibold">{alumni.length}</span> of{' '}
                <span className="font-semibold">{pagination.total}</span> alumni
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {alumni.map((person) => (
                  <div key={person.user_id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                    <div className="flex flex-col items-center text-center">
<img
  src={getAvatarUrl(person)}  // ✅ Pass the entire person object
  alt={`${person.first_name} ${person.last_name}`}
  className="w-12 h-12 rounded-full object-cover"
  onError={(e) => handleImageError(e, person.first_name, person.last_name)}
/>


                      <Link
                        to={`/profile/${person.user_id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {person.first_name} {person.last_name}
                      </Link>
                      
                      {person.position && person.company_name && (
                        <div className="flex items-center text-sm text-gray-600 mt-2">
                          <FaBriefcase className="mr-1 text-xs flex-shrink-0" />
                          <span className="truncate">{person.position} at {person.company_name}</span>
                        </div>
                      )}
                      
                      {person.current_city && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <FaMapMarkerAlt className="mr-1 text-xs" />
                          <span>{person.current_city}</span>
                        </div>
                      )}

                      {person.school_name && person.end_year && (
                        <div className="mt-2">
                          <span className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full inline-flex items-center">
                            <FaGraduationCap className="mr-1" />
                            {person.school_name} '{person.end_year}
                          </span>
                        </div>
                      )}

                      {person.schools_count > 1 && (
                        <div className="mt-1 text-xs text-gray-500">
                          +{person.schools_count - 1} more school{person.schools_count > 2 ? 's' : ''}
                        </div>
                      )}

                      {/* FIXED: Show buttons ONLY for alumni users */}
                      {isAlumni && (
                        <div className="flex gap-2 mt-4 w-full">
                          <button
                            onClick={() => {
                              const status = connectionStatuses[person.user_id];
                              if (status === 'received') {
                                navigate('/connections');
                              } else if (status !== 'accepted' && status !== 'sent') {
                                handleSendConnection(person.user_id);
                              }
                            }}
                            disabled={isConnectionButtonDisabled(person.user_id)}
                            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              connectionStatuses[person.user_id] === 'accepted'
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : connectionStatuses[person.user_id] === 'sent'
                                ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                                : connectionStatuses[person.user_id] === 'received'
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            } disabled:opacity-50`}
                          >
                            {getConnectionButtonContent(person.user_id)}
                          </button>
                          
                          <button
                            onClick={() => {
                              const status = connectionStatuses[person.user_id];
                              if (status === 'accepted') {
                                navigate('/messages', { state: { selectedUserId: person.user_id } });
                              } else if (status === 'sent') {
                                toast.info('Please wait for them to accept your connection request');
                              } else if (status === 'received') {
                                toast.info('Please accept their connection request first');
                              } else {
                                toast.info('Please connect with this person first to send messages');
                              }
                            }}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                          >
                            <FaEnvelope className="mr-1" />
                            Message
                          </button>
                        </div>
                      )}

                      {/* FIXED: No buttons for admins - just view profile */}
                    </div>
                  </div>
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="mt-6 flex justify-center">
                  <nav className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
                      const pageNum = pagination.page > 3 
                        ? pagination.page - 2 + i 
                        : i + 1;
                      
                      if (pageNum > pagination.pages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          className={`px-3 py-2 rounded-md ${
                            pagination.page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlumniDirectory;