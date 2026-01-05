import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  FaPlus, FaEdit, FaTrash, FaSearch, FaSchool, FaCheckCircle,
  FaTimesCircle, FaMapMarkerAlt, FaEye, FaUsers, FaTimes
} from 'react-icons/fa';
import { getAvatarUrl, handleImageError, getFileUrl } from '../utils/profilePictureUtils';

const ManageSchools = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [alumni, setAlumni] = useState([]);
  const [alumniLoading, setAlumniLoading] = useState(false);
  const [alumniPage, setAlumniPage] = useState(1);
  const [alumniPagination, setAlumniPagination] = useState({ total: 0, pages: 0 });
  const [alumniSearch, setAlumniSearch] = useState('');
  
  const [formData, setFormData] = useState({
    school_id: null,
    school_name: '',
    school_code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    website: '',
    established_year: '',
    description: ''
  });

  useEffect(() => {
    fetchSchools();
  }, [search]);

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
      toast.success('School logo updated across the platform!');
    };

    window.addEventListener('schoolLogoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('schoolLogoUpdated', handleLogoUpdate);
    };
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/schools', {
        params: { search, limit: 1000 }
      });
      setSchools(response.data.schools);
    } catch (error) {
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolAlumni = async (schoolId, page = 1) => {
    try {
      setAlumniLoading(true);
      const response = await api.get(`/super-admin/schools/${schoolId}/alumni`, {
        params: { 
          page, 
          limit: 20,
          search: alumniSearch 
        }
      });
      setAlumni(response.data.alumni || []);
      setAlumniPagination(response.data.pagination || { total: 0, pages: 0 });
    } catch (error) {
      console.error('Failed to fetch alumni:', error);
      toast.error('Failed to load alumni');
      setAlumni([]);
    } finally {
      setAlumniLoading(false);
    }
  };

  const handleViewAlumni = (school) => {
    setSelectedSchool(school);
    setShowAlumniModal(true);
    setAlumniPage(1);
    setAlumniSearch('');
    fetchSchoolAlumni(school.school_id, 1);
  };

  const handleAlumniSearch = (e) => {
    e.preventDefault();
    if (selectedSchool) {
      setAlumniPage(1);
      fetchSchoolAlumni(selectedSchool.school_id, 1);
    }
  };

  const handleAlumniPageChange = (newPage) => {
    setAlumniPage(newPage);
    fetchSchoolAlumni(selectedSchool.school_id, newPage);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      school_id: null,
      school_name: '',
      school_code: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      website: '',
      established_year: '',
      description: ''
    });
    setEditMode(false);
  };

  const handleSubmit = async () => {
    if (!formData.school_name || !formData.school_code || !formData.city || !formData.state || !formData.country) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editMode) {
        await api.put(`/super-admin/schools/${formData.school_id}`, formData);
        toast.success('School updated successfully!');
      } else {
        await api.post('/super-admin/schools', formData);
        toast.success('School created successfully!');
      }
      
      setShowModal(false);
      resetForm();
      fetchSchools();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save school');
    }
  };

  const handleEdit = (school) => {
    setFormData({
      school_id: school.school_id,
      school_name: school.school_name,
      school_code: school.school_code,
      address: school.address || '',
      city: school.city || '',
      state: school.state || '',
      country: school.country || 'India',
      website: school.website || '',
      established_year: school.established_year || '',
      description: school.description || ''
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleViewDetails = (schoolId) => {
    navigate(`/schools/${schoolId}`);
  };

  const handleToggleActive = async (schoolId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this school?`)) {
      return;
    }

    try {
      await api.put(`/super-admin/schools/${schoolId}`, {
        is_active: !currentStatus
      });
      toast.success('School status updated!');
      fetchSchools();
    } catch (error) {
      toast.error('Failed to update school');
    }
  };

  const handleDelete = async (schoolId) => {
    if (!window.confirm('Are you sure you want to delete this school?')) {
      return;
    }

    try {
      await api.delete(`/super-admin/schools/${schoolId}`);
      toast.success('School deleted successfully!');
      fetchSchools();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete school');
    }
  };

  // Helper function to get school logo URL
  const getSchoolLogoUrl = (school) => {
    if (school.logo && typeof school.logo === 'string' && school.logo.trim()) {
      return getFileUrl(school.logo);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Schools</h1>
          <p className="text-gray-600 mt-1">Add and manage educational institutions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <FaPlus className="mr-2" />
          Add School
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search schools by name, city, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No schools found
          </div>
        ) : (
          schools.map((school) => (
            <div key={school.school_id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {/* School Logo or Icon */}
                    <div className="w-12 h-12 flex-shrink-0">
                      {getSchoolLogoUrl(school) ? (
                        <img
                          src={getSchoolLogoUrl(school)}
                          alt={school.school_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"
                        style={{ display: getSchoolLogoUrl(school) ? 'none' : 'flex' }}
                      >
                        <FaSchool className="text-green-600 text-xl" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{school.school_name}</h3>
                      <p className="text-sm text-gray-500">{school.school_code}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    school.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {school.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaMapMarkerAlt className="mr-2 text-gray-400" />
                    {school.city}, {school.state}
                  </div>
                  {school.established_year && (
                    <p className="text-sm text-gray-600">Est. {school.established_year}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <button
                      onClick={() => handleViewAlumni(school)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <FaUsers className="mr-1" />
                      {school.alumni_count || 0} Alumni
                    </button>
                    <span className="text-sm font-medium text-gray-900">
                      {school.admin_count || 0} Admins
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(school.school_id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleEdit(school)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleToggleActive(school.school_id, school.is_active)}
                      className={`p-2 rounded-md ${
                        school.is_active 
                          ? 'text-red-600 hover:bg-red-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={school.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {school.is_active ? <FaTimesCircle /> : <FaCheckCircle />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(school.school_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editMode ? 'Edit School' : 'Add New School'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School Name *
                    </label>
                    <input
                      type="text"
                      name="school_name"
                      value={formData.school_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School Code *
                    </label>
                    <input
                      type="text"
                      name="school_code"
                      value={formData.school_code}
                      onChange={handleChange}
                      disabled={editMode}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Established Year
                    </label>
                    <input
                      type="number"
                      name="established_year"
                      value={formData.established_year}
                      onChange={handleChange}
                      min="1800"
                      max={new Date().getFullYear()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    ></textarea>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {editMode ? 'Update School' : 'Create School'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alumni Modal */}
      {showAlumniModal && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedSchool.school_name} - Alumni Directory
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total: {alumniPagination.total} alumni
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAlumniModal(false);
                  setSelectedSchool(null);
                  setAlumni([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleAlumniSearch} className="mb-6">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search alumni by name..."
                      value={alumniSearch}
                      onChange={(e) => setAlumniSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>
              </form>

              {alumniLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : alumni.length === 0 ? (
                <div className="text-center py-12">
                  <FaUsers className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500">No alumni found</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alumni.map((person) => (
                      <div key={person.user_id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start space-x-4">
                          <img
                            src={getAvatarUrl(person)}
                            alt={`${person.first_name} ${person.last_name}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => handleImageError(e, person.first_name, person.last_name)}
                          />
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => navigate(`/profile/${person.user_id}`)}
                              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {person.first_name} {person.last_name}
                            </button>
                            {person.degree_level && (
                              <p className="text-sm text-gray-600 mt-1">
                                {person.degree_level} • Class of {person.end_year}
                              </p>
                            )}
                            {person.company_name && person.position && (
                              <p className="text-sm text-gray-600 mt-1">
                                {person.position} at {person.company_name}
                              </p>
                            )}
                            {person.current_city && (
                              <p className="text-sm text-gray-500 mt-1 flex items-center">
                                <FaMapMarkerAlt className="mr-1 text-xs" />
                                {person.current_city}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {alumniPagination.pages > 1 && (
                    <div className="mt-6 flex justify-center">
                      <nav className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAlumniPageChange(alumniPage - 1)}
                          disabled={alumniPage === 1}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <span className="px-4 py-2 text-sm text-gray-700">
                          Page {alumniPage} of {alumniPagination.pages}
                        </span>
                        
                        <button
                          onClick={() => handleAlumniPageChange(alumniPage + 1)}
                          disabled={alumniPage === alumniPagination.pages}
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
      )}
    </div>
  );
};

export default ManageSchools;