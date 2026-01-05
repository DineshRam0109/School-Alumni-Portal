import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  FaPlus, FaEdit, FaTrash, FaSearch, FaUserTie, FaSchool,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle
} from 'react-icons/fa';
import { getFileUrl, getAvatarUrl, handleImageError } from '../utils/profilePictureUtils';

const ManageSchoolAdmins = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    school_id: ''
  });

  useEffect(() => {
    fetchData();
  }, [search]);

  // Listen for school logo updates
  useEffect(() => {
    const handleLogoUpdate = (event) => {
      const { schoolId, logo } = event.detail;
      // Update schools list
      setSchools(prevSchools => 
        prevSchools.map(school => 
          school.school_id === schoolId 
            ? { ...school, logo } 
            : school
        )
      );
      // Update admins list (which includes school info)
      setAdmins(prevAdmins =>
        prevAdmins.map(admin =>
          admin.school_id === schoolId
            ? { ...admin, school_logo: logo }
            : admin
        )
      );
    };

    window.addEventListener('schoolLogoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('schoolLogoUpdated', handleLogoUpdate);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsRes, schoolsRes] = await Promise.all([
        api.get('/super-admin/school-admins', { params: { search } }),
        api.get('/super-admin/schools', { params: { limit: 1000 } })
      ]);
      
      // Map school logos to admins
      const schoolMap = new Map(schoolsRes.data.schools.map(s => [s.school_id, s]));
      const adminsWithLogos = adminsRes.data.school_admins.map(admin => ({
        ...admin,
        school_logo: schoolMap.get(admin.school_id)?.logo
      }));
      
      setAdmins(adminsWithLogos);
      
      // Filter only active schools
      const activeSchools = schoolsRes.data.schools.filter(school => school.is_active);
      setSchools(activeSchools);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validation before opening create modal
  const handleOpenCreateModal = () => {
    if (schools.length === 0) {
      toast.warning('Please create a school first before adding school admins', {
        autoClose: 4000
      });
      setTimeout(() => {
        navigate('/super-admin/schools');
      }, 1500);
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await api.post('/super-admin/school-admins', formData);
      toast.success('School admin created successfully!');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        school_id: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create school admin');
    }
  };

  const handleToggleActive = async (adminId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this school admin?`)) {
      return;
    }

    try {
      await api.put(`/super-admin/school-admins/${adminId}`, {
        is_active: !currentStatus
      });
      toast.success('School admin status updated!');
      fetchData();
    } catch (error) {
      toast.error('Failed to update school admin');
    }
  };

  const handleDelete = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this school admin? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/super-admin/school-admins/${adminId}`);
      toast.success('School admin deleted successfully!');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete school admin');
    }
  };

  // Helper function to get school logo URL
  const getSchoolLogoUrl = (logo) => {
    if (logo && typeof logo === 'string' && logo.trim()) {
      return getFileUrl(logo);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage School Admins</h1>
          <p className="text-gray-600 mt-1">Create and manage school administrator accounts</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <FaPlus className="mr-2" />
          Create School Admin
        </button>
      </div>

      {/* Alert if no schools exist */}
      {schools.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-yellow-400 mr-3 text-xl" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                No schools available
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                You need to create at least one school before you can add school administrators.
              </p>
            </div>
            <Link
              to="/super-admin/schools"
              className="ml-4 px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
            >
              Create School
            </Link>
          </div>
        </div>
      )}

      {/* Info Card - Only show if schools exist */}
      {schools.length > 0 && admins.length === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex items-center">
            <FaSchool className="text-blue-400 mr-3 text-xl" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Ready to add school administrators
              </p>
              <p className="text-sm text-blue-700 mt-1">
                You have {schools.length} active school{schools.length > 1 ? 's' : ''}. Click "Create School Admin" to assign administrators.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FaUserTie className="text-gray-400 text-4xl mb-3" />
                      <p className="text-gray-500 font-medium">No school admins found</p>
                      {schools.length > 0 && (
                        <p className="text-sm text-gray-400 mt-1">
                          Click "Create School Admin" to get started
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.admin_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {/* Admin Profile Picture */}
                        <img
                          src={getAvatarUrl({
                            first_name: admin.first_name,
                            last_name: admin.last_name,
                            profile_picture: admin.profile_picture
                          })}
                          alt={`${admin.first_name} ${admin.last_name}`}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          onError={(e) => handleImageError(e, admin.first_name, admin.last_name)}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.first_name} {admin.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {/* School Logo or Icon */}
                        <div className="flex-shrink-0 w-8 h-8 mr-2">
                          {getSchoolLogoUrl(admin.school_logo) ? (
                            <img
                              src={getSchoolLogoUrl(admin.school_logo)}
                              alt={admin.school_name}
                              className="w-8 h-8 rounded object-cover border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-8 h-8 bg-green-100 rounded flex items-center justify-center"
                            style={{ display: getSchoolLogoUrl(admin.school_logo) ? 'none' : 'flex' }}
                          >
                            <FaSchool className="text-green-600 text-sm" />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-900">{admin.school_name}</div>
                          <div className="text-xs text-gray-500">{admin.city}, {admin.state}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{admin.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        admin.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(admin.admin_id, admin.is_active)}
                          className={`p-2 rounded-md ${
                            admin.is_active 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={admin.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {admin.is_active ? <FaTimesCircle /> : <FaCheckCircle />}
                        </button>
                        <button
                          onClick={() => handleDelete(admin.admin_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics Footer */}
      {admins.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-600">{admins.length}</p>
              <p className="text-sm text-gray-600">Total Admins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {admins.filter(a => a.is_active).length}
              </p>
              <p className="text-sm text-gray-600">Active Admins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{schools.length}</p>
              <p className="text-sm text-gray-600">Assigned Schools</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create School Admin</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    minLength="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign School *
                  </label>
                  <select
                    name="school_id"
                    value={formData.school_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select a school</option>
                    {schools.map((school) => (
                      <option key={school.school_id} value={school.school_id}>
                        {school.school_name} - {school.city}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {schools.length} active school{schools.length > 1 ? 's' : ''} available
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        email: '',
                        password: '',
                        first_name: '',
                        last_name: '',
                        phone: '',
                        school_id: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleCreate(e);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Create Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSchoolAdmins;