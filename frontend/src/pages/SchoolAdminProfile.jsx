import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaEnvelope, FaPhone, FaSchool, FaMapMarkerAlt, 
  FaCalendar, FaShieldAlt, FaCamera, FaClock, FaGlobe,
  FaArrowLeft, FaCheckCircle, FaUserShield, FaIdBadge
} from 'react-icons/fa';
import { getAvatarUrl, getFileUrl } from '../utils/profilePictureUtils';
import { useDispatch } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';

const SchoolAdminProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const isOwnProfile = 
    currentUser?.role === 'school_admin' && 
    (currentUser?.user_id === parseInt(id) || currentUser?.admin_id === parseInt(id));

  useEffect(() => {
    if (!id || isNaN(parseInt(id))) {
      console.error('Invalid school admin ID:', id);
      toast.error('Invalid profile ID');
      navigate('/dashboard');
      return;
    }
    
    fetchSchoolAdminProfile();
  }, [id]);

  const fetchSchoolAdminProfile = async () => {
    try {
      setLoading(true);
      
      const adminResponse = await api.get(`/school-admin/profile/${id}`);
      
      if (!adminResponse.data.admin) {
        throw new Error('No admin data in response');
      }
      
      setProfile(adminResponse.data.admin);
      
      if (adminResponse.data.admin.school_id) {
        try {
          const schoolResponse = await api.get(`/schools/${adminResponse.data.admin.school_id}`);
          setSchool(schoolResponse.data.school);
        } catch (schoolError) {
          console.error('Failed to load school details:', schoolError);
        }
      }
    } catch (error) {
      console.error('Failed to load school admin profile:', error);
      
      if (error.response?.status === 404) {
        toast.error('School administrator not found');
      } else {
        toast.error('Failed to load profile');
      }
      
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const response = await api.put('/school-admin/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response:', response.data);
      
      toast.success('Profile picture updated successfully!');
      
      const newProfilePicture = response.data.profile_picture;
      
      setProfile(prev => ({
        ...prev,
        profile_picture: newProfilePicture
      }));
      
      dispatch(updateUser({
        profile_picture: newProfilePicture
      }));
      
      window.dispatchEvent(new Event('storage'));
      
      setTimeout(() => {
        fetchSchoolAdminProfile();
      }, 100);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
    }
  };

  // NEW: Handle School Logo Upload
  const handleSchoolLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!school || !school.school_id) {
      toast.error('School information not available');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await api.put(`/schools/${school.school_id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('School logo upload response:', response.data);
      
      toast.success('School logo updated successfully! The logo will be visible across the platform.');
      
      const newLogo = response.data.logo;
      
      // Update local state
      setSchool(prev => ({
        ...prev,
        logo: newLogo
      }));
      
      // Broadcast event to update other components
      window.dispatchEvent(new CustomEvent('schoolLogoUpdated', { 
        detail: { 
          schoolId: school.school_id, 
          logo: newLogo 
        } 
      }));
      
      // Force refresh to update all instances
      setTimeout(() => {
        fetchSchoolAdminProfile();
      }, 100);
      
    } catch (error) {
      console.error('School logo upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload school logo');
    }
  };
 
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">School Administrator not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={handleBack}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
          <div className="absolute bottom-4 left-6 text-white">
            <div className="flex items-center space-x-2">
              <FaShieldAlt className="text-3xl" />
              <span className="text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                School Administrator Profile
              </span>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-20 space-y-4 sm:space-y-0">
            <div className="relative">
              {profile.profile_picture ? (
                <img
                  src={getFileUrl(profile.profile_picture)}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="w-36 h-36 rounded-2xl border-4 border-white shadow-2xl bg-white p-3 object-cover ring-4 ring-emerald-200"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.first_name)}+${encodeURIComponent(profile.last_name)}&size=256&background=random`;
                  }}
                />
              ) : (
                <div className="w-36 h-36 rounded-2xl border-4 border-white shadow-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center ring-4 ring-emerald-200">
                  <div className="text-white text-4xl font-bold">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </div>
                </div>
              )}
              <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-full shadow-lg">
                <FaShieldAlt className="text-2xl" />
              </div>
              {isOwnProfile && (
                <label className="absolute top-2 right-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2.5 rounded-full cursor-pointer hover:from-emerald-700 hover:to-teal-700 transition shadow-lg">
                  <FaCamera />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex-1 sm:ml-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md">
                      <FaShieldAlt className="mr-2" />
                      School Administrator
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <FaCheckCircle className="mr-1" />
                      Active
                    </span>
                  </div>
                  {school && (
                    <p className="text-gray-600 mt-3 flex items-center text-lg">
                      <FaSchool className="mr-2 text-emerald-600" />
                      <span className="font-medium">{school.school_name}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-lg mr-3">
                    <FaEnvelope className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <a href={`mailto:${profile.email}`} className="text-gray-900 hover:text-emerald-600 font-medium">
                      {profile.email}
                    </a>
                  </div>
                </div>
                
                {profile.phone && (
                  <div className="flex items-center text-gray-600">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-lg mr-3">
                      <FaPhone className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <a href={`tel:${profile.phone}`} className="text-gray-900 hover:text-emerald-600 font-medium">
                        {profile.phone}
                      </a>
                    </div>
                  </div>
                )}
                
                {school?.city && school?.state && (
                  <div className="flex items-center text-gray-600">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-lg mr-3">
                      <FaMapMarkerAlt className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-gray-900 font-medium">{school.city}, {school.state}</p>
                    </div>
                  </div>
                )}
                
                {profile.created_at && (
                  <div className="flex items-center text-gray-600">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-lg mr-3">
                      <FaClock className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Member Since</p>
                      <p className="text-gray-900 font-medium">
                        {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {school && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg mr-3">
                  <FaSchool className="text-emerald-600" />
                </div>
                School Information
              </h2>
              <div className="space-y-5">
                {/* School Logo Section */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      {/* School Logo */}
                      <div className="relative">
                        {school.logo ? (
                          <img
                            src={getFileUrl(school.logo)}
                            alt={school.school_name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg"
                          style={{ display: school.logo ? 'none' : 'flex' }}
                        >
                          <FaSchool className="text-white text-2xl" />
                        </div>
                        
                        {/* Upload Button for School Logo - Only for own profile */}
                        {isOwnProfile && (
                          <label className="absolute -bottom-1 -right-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2 rounded-full cursor-pointer hover:from-emerald-700 hover:to-teal-700 transition shadow-lg" title="Upload School Logo">
                            <FaCamera className="text-sm" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSchoolLogoUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl">{school.school_name}</h3>
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <span className="inline-block bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-xs font-medium">
                            Code: {school.school_code}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {school.description && (
                  <div className="border-l-2 border-emerald-300 pl-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">About the School</p>
                    <p className="text-gray-700 leading-relaxed">{school.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {school.established_year && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <FaCalendar className="text-emerald-600 mr-2" />
                        <p className="text-sm font-semibold text-gray-700">Established</p>
                      </div>
                      <p className="text-gray-900 font-bold text-lg">{school.established_year}</p>
                    </div>
                  )}
                  {school.website && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <FaGlobe className="text-emerald-600 mr-2" />
                        <p className="text-sm font-semibold text-gray-700">Website</p>
                      </div>
                      <a 
                        href={school.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-medium truncate block underline"
                      >
                        Visit Website →
                      </a>
                    </div>
                  )}
                </div>

                {school.address && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <FaMapMarkerAlt className="text-emerald-600 mr-2" />
                      <p className="text-sm font-semibold text-gray-700">Full Address</p>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      {school.address}<br />
                      {school.city}, {school.state}<br />
                      {school.country}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Administrator Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-emerald-500">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FaUserShield className="mr-2 text-emerald-600" />
              Administrator Details
            </h3>
            <div className="space-y-4 text-sm">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <span className="text-gray-600 text-xs block mb-1">Full Name</span>
                <p className="text-gray-900 font-bold text-base">
                  {profile.first_name} {profile.last_name}
                </p>
              </div>

              {profile.admin_id && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600 text-xs block mb-1">Admin ID</span>
                  <p className="text-gray-900 font-medium">
                    #{profile.admin_id}
                  </p>
                </div>
              )}
              
              <div className="bg-emerald-50 p-3 rounded-lg">
                <span className="text-gray-600 text-xs block mb-1">Role</span>
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold text-sm inline-block">
                  School Administrator
                </span>
              </div>
              
              <div className="bg-emerald-50 p-3 rounded-lg">
                <span className="text-gray-600 text-xs block mb-1">Account Status</span>
                <div className="flex items-center">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold text-sm inline-flex items-center">
                    <FaCheckCircle className="mr-1" />
                    Active
                  </span>
                </div>
              </div>
              
              {profile.created_at && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600 text-xs block mb-1">Member Since</span>
                  <p className="text-gray-900 font-medium">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolAdminProfile;