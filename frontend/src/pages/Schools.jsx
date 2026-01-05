import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { schoolService } from '../services/schoolService';
import { toast } from 'react-toastify';
import { FaSchool, FaSearch, FaMapMarkerAlt, FaUsers, FaArrowLeft, FaTimes, FaGlobe } from 'react-icons/fa';
import { getFileUrl } from '../utils/profilePictureUtils';

const Schools = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    country: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchSchools();
  }, [debouncedSearch, filters]);

  // Listen for school logo updates
  useEffect(() => {
    const handleLogoUpdate = (event) => {
      const { schoolId, logo } = event.detail;
      setSchools(prevSchools => 
        prevSchools.map(school => 
          school.school_id === schoolId 
            ? { ...school, logo } 
            : school
        )
      );
    };

    window.addEventListener('schoolLogoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('schoolLogoUpdated', handleLogoUpdate);
    };
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const params = {
        search: debouncedSearch.trim(),
        city: filters.city.trim(),
        country: filters.country.trim(),
        limit: 100
      };
      
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await schoolService.getAllSchools(params);
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      toast.error('Failed to fetch schools');
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({ city: '', country: '' });
  };

  // Helper function to get school logo URL
  const getSchoolLogoUrl = (school) => {
    if (school.logo && typeof school.logo === 'string' && school.logo.trim()) {
      return getFileUrl(school.logo);
    }
    return null;
  };

  const hasActiveFilters = searchTerm || filters.city || filters.country;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            <span>Back</span>
          </button>

          {/* Header - More Compact */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Schools Directory</h1>
            <p className="text-blue-100 text-sm sm:text-base">Browse all schools in the alumni network</p>
          </div>

          {/* Search and Filters - More Compact */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search schools by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* Filters - Single Line */}
              <div className="flex flex-wrap items-center gap-2">
                {/* City Filter */}
                <div className="relative flex-1 min-w-[140px]">
                  <FaMapMarkerAlt className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="City"
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Country Filter */}
                <div className="relative flex-1 min-w-[140px]">
                  <FaGlobe className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Country"
                    value={filters.country}
                    onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                    className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                  >
                    <FaTimes className="mr-1.5 text-xs" />
                    Clear
                  </button>
                )}
              </div>

              {/* Active Filters Tags */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <span className="text-xs text-gray-600 font-medium">Active:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Search: "{searchTerm}"
                      <button 
                        onClick={() => setSearchTerm('')} 
                        className="ml-1.5 hover:text-blue-900"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </span>
                  )}
                  {filters.city && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      City: {filters.city}
                      <button 
                        onClick={() => setFilters({ ...filters, city: '' })} 
                        className="ml-1.5 hover:text-green-900"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </span>
                  )}
                  {filters.country && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                      Country: {filters.country}
                      <button 
                        onClick={() => setFilters({ ...filters, country: '' })} 
                        className="ml-1.5 hover:text-purple-900"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results Count */}
          {!loading && (
            <div className="text-sm text-gray-600 px-1">
              {schools.length === 0 
                ? 'No schools found' 
                : `Found ${schools.length} school${schools.length !== 1 ? 's' : ''}`}
            </div>
          )}

          {/* Schools Grid - WIDER CARDS */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : schools.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <FaSchool className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">No schools found</p>
              <p className="text-gray-400 text-sm mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your search criteria or clear filters to see all schools'
                  : 'No schools are currently available in the directory'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {schools.map((school) => (
                <Link
                  key={school.school_id}
                  to={`/schools/${school.school_id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-4 transform hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    {/* School Logo with Fallback */}
                    {getSchoolLogoUrl(school) ? (
                      <img 
                        src={getSchoolLogoUrl(school)}
                        alt={school.school_name} 
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border-2 border-gray-100" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ display: getSchoolLogoUrl(school) ? 'none' : 'flex' }}
                    >
                      <FaSchool className="text-xl text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 leading-tight break-words text-sm">
                        {school.school_name}
                      </h3>
                      {school.city && (
                        <div className="flex items-center text-xs text-gray-600 mb-1">
                          <FaMapMarkerAlt className="mr-1 text-[10px] flex-shrink-0" />
                          <span className="truncate">{school.city}, {school.country}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {school.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3 break-words">
                      {school.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center text-xs font-semibold text-blue-600">
                      <FaUsers className="mr-1.5 text-[10px]" />
                      {school.alumni_count || 0} Alumni
                    </div>
                    {school.established_year && (
                      <span className="text-xs text-gray-500">
                        Est. {school.established_year}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schools;