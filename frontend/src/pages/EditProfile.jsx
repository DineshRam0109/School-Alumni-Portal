import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaUser,
  FaGraduationCap,
  FaBriefcase,
  FaTrophy,
  FaCamera,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaClock,
  FaSave,
  FaTimes,
  FaSchool,
  FaBuilding,
  FaAward,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGlobe,
  FaVenusMars,
  FaPhone,
  FaLink
} from 'react-icons/fa';
import api from '../services/api';
import { userService } from '../services/userService';
import { updateUser } from '../redux/slices/authSlice';
import { getAvatarUrl, handleImageError } from '../utils/profilePictureUtils';

const EditProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  
  const [profilePicture, setProfilePicture] = useState('');
  
  const userId = user?.role === 'school_admin' ? user?.admin_id : user?.user_id;
  
  const [basicInfo, setBasicInfo] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    current_city: '',
    current_country: '',
    bio: '',
    linkedin_url: '',
    facebook_url: '',
    twitter_url: ''
  });

  const [education, setEducation] = useState([]);
  const [workExperience, setWorkExperience] = useState([]);
  const [schools, setSchools] = useState([]);
  const [achievements, setAchievements] = useState([]);
  
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [newEducation, setNewEducation] = useState({
    school_id: '',
    degree_level: 'secondary',
    field_of_study: '',
    start_year: '',
    end_year: ''
  });

  const [showAddWork, setShowAddWork] = useState(false);
  const [newWork, setNewWork] = useState({
    company_name: '',
    position: '',
    location: '',
    employment_type: 'full_time',
    industry: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  });

  const [showAddAchievement, setShowAddAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    achievement_date: '',
    category: ''
  });

  useEffect(() => {
    if (!user || !userId) {
      toast.error('Please login to edit profile');
      navigate('/login');
      return;
    }
    
    fetchUserData();
    
    if (user.role === 'alumni') {
      fetchSchools();
    }
  }, [user, userId, navigate]);

  useEffect(() => {
    const url = getAvatarUrl(user);
    setProfilePicture(url);
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      let response;
      
      if (user.role === 'school_admin') {
        response = await api.get(`/school-admin/profile/${userId}`);
        const profile = response.data.admin || response.data.user;
        
        setBasicInfo({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          date_of_birth: '',
          gender: '',
          current_city: '',
          current_country: '',
          bio: '',
          linkedin_url: '',
          facebook_url: '',
          twitter_url: ''
        });
        
        setEducation([]);
        setWorkExperience([]);
        setAchievements([]);
      } else {
        response = await userService.getProfile(userId);
        const profile = response.data.user;
        
        if (!profile) {
          toast.error('Failed to load profile data');
          return;
        }
        
        setBasicInfo({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
          gender: profile.gender || '',
          current_city: profile.current_city || '',
          current_country: profile.current_country || '',
          bio: profile.bio || '',
          linkedin_url: profile.linkedin_url || '',
          facebook_url: profile.facebook_url || '',
          twitter_url: profile.twitter_url || ''
        });
        
        setEducation(Array.isArray(profile.education) ? profile.education : []);
        setWorkExperience(Array.isArray(profile.work_experience) ? profile.work_experience : []);
        setAchievements(Array.isArray(profile.achievements) ? profile.achievements : []);
      }
    } catch (error) {
      console.error('Fetch user data error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools', { params: { limit: 1000 } });
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error('Failed to fetch schools');
    }
  };

  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userService.updateProfile(basicInfo);
      
      dispatch(updateUser({
        first_name: basicInfo.first_name,
        last_name: basicInfo.last_name,
        phone: basicInfo.phone,
        date_of_birth: basicInfo.date_of_birth,
        gender: basicInfo.gender,
        current_city: basicInfo.current_city,
        current_country: basicInfo.current_country,
        bio: basicInfo.bio,
        linkedin_url: basicInfo.linkedin_url,
        facebook_url: basicInfo.facebook_url,
        twitter_url: basicInfo.twitter_url
      }));
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const response = await userService.uploadProfilePicture(formData);
      const newProfilePicture = response.data.profile_picture;
      
      const timestampedUrl = newProfilePicture;
      
      setProfilePicture(timestampedUrl);
      
      dispatch(updateUser({
        profile_picture: timestampedUrl
      }));
      
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.profile_picture = timestampedUrl;
      localStorage.setItem('user', JSON.stringify(storedUser));
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(storedUser)
      }));
      
      toast.success('Profile picture updated successfully!');
      
      setTimeout(() => {
        fetchUserData();
      }, 100);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload picture');
    }
  };

  const handleAddEducation = async (e) => {
    e.preventDefault();
    
    if (!newEducation.school_id || !newEducation.start_year || !newEducation.end_year) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await api.post('/education', newEducation);
      toast.success('Education added! Pending school admin verification.');
      setShowAddEducation(false);
      setNewEducation({
        school_id: '',
        degree_level: 'secondary',
        field_of_study: '',
        start_year: '',
        end_year: ''
      });
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add education');
    }
  };

  const deleteEducation = async (id) => {
    if (!window.confirm('Delete this education entry?')) return;
    try {
      await api.delete(`/education/${id}`);
      toast.success('Education deleted');
      fetchUserData();
    } catch (error) {
      toast.error('Failed to delete education');
    }
  };

  const handleAddWork = async (e) => {
    e.preventDefault();
    
    if (!newWork.company_name || !newWork.position || !newWork.start_date) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await api.post('/work', newWork);
      toast.success('Work experience added!');
      setShowAddWork(false);
      setNewWork({
        company_name: '',
        position: '',
        location: '',
        employment_type: 'full_time',
        industry: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: ''
      });
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add work experience');
    }
  };

  const deleteWorkExperience = async (id) => {
    if (!window.confirm('Delete this work experience?')) return;
    try {
      await api.delete(`/work/${id}`);
      toast.success('Work experience deleted');
      fetchUserData();
    } catch (error) {
      toast.error('Failed to delete work experience');
    }
  };

  const handleAddAchievement = async (e) => {
    e.preventDefault();
    
    if (!newAchievement.title) {
      toast.error('Please enter achievement title');
      return;
    }

    try {
      await api.post('/achievements', newAchievement);
      toast.success('Achievement added!');
      setShowAddAchievement(false);
      setNewAchievement({
        title: '',
        description: '',
        achievement_date: '',
        category: ''
      });
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add achievement');
    }
  };

  const deleteAchievement = async (id) => {
    if (!window.confirm('Delete this achievement?')) return;
    try {
      await api.delete(`/achievements/${id}`);
      toast.success('Achievement deleted');
      fetchUserData();
    } catch (error) {
      toast.error('Failed to delete achievement');
    }
  };

  const handleViewProfile = () => {
    if (!user || !userId) {
      toast.error('User ID not found');
      return;
    }
    
    if (user.role === 'school_admin') {
      navigate(`/school-admin/profile/${userId}`);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  const isSchoolAdmin = user?.role === 'school_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Edit Your Profile
            </h1>
            <p className="text-gray-600 mt-2">Update your personal information and showcase your journey</p>
          </div>
          <button
            onClick={handleViewProfile}
            className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-100 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200 flex items-center"
          >
            <FaUser className="mr-2" />
            View Profile
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden sticky top-6">
              {/* Profile Picture Section */}
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 pt-8">
                <div className="flex justify-center">
                  <div className="relative group">
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl"
                      onError={(e) => handleImageError(e, user?.first_name, user?.last_name)}
                    />
                    <label className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                      <FaCamera className="text-white text-2xl" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <h2 className="text-center text-white font-bold text-xl mt-4">{user?.first_name} {user?.last_name}</h2>
                <p className="text-center text-blue-100 text-sm mt-1">{user?.role?.replace('_', ' ')}</p>
              </div>

              {/* Navigation Tabs */}
              <div className="p-4">
                <nav className="space-y-2">
                  {[
                    { id: 'basic', icon: FaUser, label: 'Basic Info', color: 'from-blue-500 to-cyan-500' },
                    ...(!isSchoolAdmin ? [
                      { id: 'education', icon: FaGraduationCap, label: 'Education', color: 'from-emerald-500 to-green-500' },
                      { id: 'work', icon: FaBriefcase, label: 'Work Experience', color: 'from-orange-500 to-red-500' },
                      { id: 'achievements', icon: FaTrophy, label: 'Achievements', color: 'from-purple-500 to-pink-500' }
                    ] : [])
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === tab.id
                            ? `bg-gradient-to-r ${tab.color} text-white shadow-md transform -translate-y-1`
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <Icon className={`mr-3 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-6 md:p-8">
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <form onSubmit={handleBasicInfoSubmit} className="space-y-8">
                    <div className="flex items-center mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-xl mr-4">
                        <FaUser className="text-white text-xl" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
                        <p className="text-gray-600">Update your personal details</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <FaUser className="mr-2 text-gray-400" />
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={basicInfo.first_name}
                          onChange={(e) => setBasicInfo({ ...basicInfo, first_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <FaUser className="mr-2 text-gray-400" />
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={basicInfo.last_name}
                          onChange={(e) => setBasicInfo({ ...basicInfo, last_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <FaPhone className="mr-2 text-gray-400" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={basicInfo.phone}
                          onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                      </div>
                      
                      {!isSchoolAdmin && (
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            <FaCalendarAlt className="mr-2 text-gray-400" />
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={basicInfo.date_of_birth}
                            onChange={(e) => setBasicInfo({ ...basicInfo, date_of_birth: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                          />
                        </div>
                      )}
                    </div>

                    {!isSchoolAdmin && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700">
                              <FaVenusMars className="mr-2 text-gray-400" />
                              Gender
                            </label>
                            <select
                              value={basicInfo.gender}
                              onChange={(e) => setBasicInfo({ ...basicInfo, gender: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700">
                              <FaMapMarkerAlt className="mr-2 text-gray-400" />
                              City
                            </label>
                            <input
                              type="text"
                              value={basicInfo.current_city}
                              onChange={(e) => setBasicInfo({ ...basicInfo, current_city: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700">
                              <FaGlobe className="mr-2 text-gray-400" />
                              Country
                            </label>
                            <input
                              type="text"
                              value={basicInfo.current_country}
                              onChange={(e) => setBasicInfo({ ...basicInfo, current_country: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            <FaUser className="mr-2 text-gray-400" />
                            Bio
                          </label>
                          <textarea
                            value={basicInfo.bio}
                            onChange={(e) => setBasicInfo({ ...basicInfo, bio: e.target.value })}
                            rows="4"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            placeholder="Tell us about yourself..."
                          ></textarea>
                        </div>

                        <div className="space-y-6">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <FaLink className="mr-2 text-blue-500" />
                            Social Links
                          </h3>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">LinkedIn URL</label>
                              <input
                                type="url"
                                placeholder="https://linkedin.com/in/yourprofile"
                                value={basicInfo.linkedin_url}
                                onChange={(e) => setBasicInfo({ ...basicInfo, linkedin_url: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Facebook URL</label>
                              <input
                                type="url"
                                placeholder="https://facebook.com/yourprofile"
                                value={basicInfo.facebook_url}
                                onChange={(e) => setBasicInfo({ ...basicInfo, facebook_url: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Twitter URL</label>
                              <input
                                type="url"
                                placeholder="https://twitter.com/yourprofile"
                                value={basicInfo.twitter_url}
                                onChange={(e) => setBasicInfo({ ...basicInfo, twitter_url: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
                      >
                        <FaSave className="mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-300 flex items-center"
                      >
                        <FaTimes className="mr-2" />
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Education Tab */}
                {!isSchoolAdmin && activeTab === 'education' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-3 rounded-xl mr-4">
                          <FaGraduationCap className="text-white text-xl" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Education</h2>
                          <p className="text-gray-600">Add your educational background</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddEducation(!showAddEducation)}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
                      >
                        <FaPlus className="mr-2" />
                        Add Education
                      </button>
                    </div>

                    {showAddEducation && (
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <FaSchool className="mr-2 text-emerald-600" />
                          Add New Education
                        </h3>
                        <form onSubmit={handleAddEducation} className="space-y-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">School *</label>
                            <select
                              value={newEducation.school_id}
                              onChange={(e) => setNewEducation({ ...newEducation, school_id: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                              required
                            >
                              <option value="">Select School</option>
                              {schools.map((school) => (
                                <option key={school.school_id} value={school.school_id}>
                                  {school.school_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Degree Level *</label>
                              <select
                                value={newEducation.degree_level}
                                onChange={(e) => setNewEducation({ ...newEducation, degree_level: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                                required
                              >
                                <option value="secondary">Secondary</option>
                                <option value="bachelor">Bachelor's</option>
                                <option value="master">Master's</option>
                                <option value="doctorate">Doctorate</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Field of Study</label>
                              <input
                                type="text"
                                value={newEducation.field_of_study}
                                onChange={(e) => setNewEducation({ ...newEducation, field_of_study: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                                placeholder="e.g., Computer Science"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Start Year *</label>
                              <input
                                type="number"
                                value={newEducation.start_year}
                                onChange={(e) => setNewEducation({ ...newEducation, start_year: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                                min="1950"
                                max={new Date().getFullYear()}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">End Year *</label>
                              <input
                                type="number"
                                value={newEducation.end_year}
                                onChange={(e) => setNewEducation({ ...newEducation, end_year: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                                min="1950"
                                max={new Date().getFullYear() + 10}
                                required
                              />
                            </div>
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="submit"
                              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 flex items-center"
                            >
                              <FaPlus className="mr-2" />
                              Add Education
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddEducation(false)}
                              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-all duration-300 flex items-center"
                            >
                              <FaTimes className="mr-2" />
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="space-y-4">
                      {education.length === 0 ? (
                        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                          <FaGraduationCap className="text-4xl text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No education added yet</p>
                          <p className="text-gray-500 text-sm mt-2">Add your educational background to get started</p>
                        </div>
                      ) : (
                        education.map((edu) => (
                          <div key={edu.education_id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-green-100 border border-emerald-200 flex items-center justify-center">
                                    <img
                                      src={edu.logo || `https://ui-avatars.com/api/?name=${edu.school_name}&size=64`}
                                      alt={edu.school_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(edu.school_name)}&size=64`;
                                      }}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-900 text-lg">{edu.school_name}</h3>
                                  <p className="text-emerald-600 font-medium capitalize mt-1">
                                    {edu.degree_level.replace(/_/g, ' ')}
                                  </p>
                                  {edu.field_of_study && (
                                    <p className="text-gray-600 mt-1">{edu.field_of_study}</p>
                                  )}
                                  <div className="flex items-center mt-3 space-x-3">
                                    <span className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-full text-sm font-medium">
                                      {edu.start_year} - {edu.end_year}
                                    </span>
                                    {edu.is_verified ? (
                                      <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-full text-sm font-medium flex items-center">
                                        <FaCheckCircle className="mr-1" />
                                        Verified
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 rounded-full text-sm font-medium flex items-center">
                                        <FaClock className="mr-1" />
                                        Pending Verification
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteEducation(edu.education_id)}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Work Experience Tab */}
                {!isSchoolAdmin && activeTab === 'work' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl mr-4">
                          <FaBriefcase className="text-white text-xl" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Work Experience</h2>
                          <p className="text-gray-600">Add your professional experience</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddWork(!showAddWork)}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
                      >
                        <FaPlus className="mr-2" />
                        Add Work Experience
                      </button>
                    </div>

                    {showAddWork && (
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <FaBuilding className="mr-2 text-orange-600" />
                          Add Work Experience
                        </h3>
                        <form onSubmit={handleAddWork} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                              <input
                                type="text"
                                value={newWork.company_name}
                                onChange={(e) => setNewWork({ ...newWork, company_name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Position *</label>
                              <input
                                type="text"
                                value={newWork.position}
                                onChange={(e) => setNewWork({ ...newWork, position: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Location</label>
                              <input
                                type="text"
                                value={newWork.location}
                                onChange={(e) => setNewWork({ ...newWork, location: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                placeholder="e.g., New York, NY"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Employment Type</label>
                              <select
                                value={newWork.employment_type}
                                onChange={(e) => setNewWork({ ...newWork, employment_type: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                              >
                                <option value="full_time">Full Time</option>
                                <option value="part_time">Part Time</option>
                                <option value="contract">Contract</option>
                                <option value="internship">Internship</option>
                                <option value="freelance">Freelance</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Industry</label>
                            <input
                              type="text"
                              value={newWork.industry}
                              onChange={(e) => setNewWork({ ...newWork, industry: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                              placeholder="e.g., Technology, Finance"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                              <input
                                type="date"
                                value={newWork.start_date}
                                onChange={(e) => setNewWork({ ...newWork, start_date: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">End Date</label>
                              <input
                                type="date"
                                value={newWork.end_date}
                                onChange={(e) => setNewWork({ ...newWork, end_date: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                disabled={newWork.is_current}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newWork.is_current}
                                onChange={(e) => setNewWork({ ...newWork, is_current: e.target.checked, end_date: e.target.checked ? '' : newWork.end_date })}
                                className="mr-2 h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                              />
                              <span className="text-sm font-medium text-gray-700">I currently work here</span>
                            </label>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                              value={newWork.description}
                              onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                              rows="3"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                              placeholder="Describe your role and responsibilities..."
                            ></textarea>
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="submit"
                              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 flex items-center"
                            >
                              <FaPlus className="mr-2" />
                              Add Work Experience
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddWork(false)}
                              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-all duration-300 flex items-center"
                            >
                              <FaTimes className="mr-2" />
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="space-y-4">
                      {workExperience.length === 0 ? (
                        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                          <FaBriefcase className="text-4xl text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No work experience added yet</p>
                          <p className="text-gray-500 text-sm mt-2">Add your professional experience to showcase your career</p>
                        </div>
                      ) : (
                        workExperience.map((work) => (
                          <div key={work.experience_id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-lg">{work.position}</h3>
                                <p className="text-orange-600 font-medium mt-1">{work.company_name}</p>
                                {work.location && <p className="text-gray-600 mt-1 flex items-center"><FaMapMarkerAlt className="mr-1 text-gray-400" /> {work.location}</p>}
                                <div className="flex items-center mt-3 space-x-3">
                                  <span className="px-3 py-1 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 rounded-full text-sm font-medium">
                                    {new Date(work.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                                    {work.is_current ? ' Present' : (work.end_date ? ` ${new Date(work.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '')}
                                  </span>
                                  <span className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-full text-sm font-medium capitalize">
                                    {work.employment_type.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                {work.description && (
                                  <p className="text-gray-700 mt-4 leading-relaxed border-t border-gray-100 pt-4">{work.description}</p>
                                )}
                              </div>
                              <button
                                onClick={() => deleteWorkExperience(work.experience_id)}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors ml-4"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Achievements Tab */}
                {!isSchoolAdmin && activeTab === 'achievements' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl mr-4">
                          <FaTrophy className="text-white text-xl" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Achievements</h2>
                          <p className="text-gray-600">Showcase your accomplishments</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddAchievement(!showAddAchievement)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
                      >
                        <FaPlus className="mr-2" />
                        Add Achievement
                      </button>
                    </div>

                    {showAddAchievement && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <FaAward className="mr-2 text-purple-600" />
                          Add Achievement
                        </h3>
                        <form onSubmit={handleAddAchievement} className="space-y-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Title *</label>
                            <input
                              type="text"
                              value={newAchievement.title}
                              onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                              placeholder="e.g., Employee of the Year"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                              value={newAchievement.description}
                              onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                              rows="3"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                              placeholder="Describe your achievement..."
                            ></textarea>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Date</label>
                              <input
                                type="date"
                                value={newAchievement.achievement_date}
                                onChange={(e) => setNewAchievement({ ...newAchievement, achievement_date: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Category</label>
                              <input
                                type="text"
                                value={newAchievement.category}
                                onChange={(e) => setNewAchievement({ ...newAchievement, category: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                                placeholder="e.g., Professional, Academic"
                              />
                            </div>
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="submit"
                              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center"
                            >
                              <FaPlus className="mr-2" />
                              Add Achievement
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddAchievement(false)}
                              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-all duration-300 flex items-center"
                            >
                              <FaTimes className="mr-2" />
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="space-y-4">
                      {achievements.length === 0 ? (
                        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                          <FaTrophy className="text-4xl text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No achievements added yet</p>
                          <p className="text-gray-500 text-sm mt-2">Add your accomplishments to showcase your success</p>
                        </div>
                      ) : (
                        achievements.map((achievement) => (
                          <div key={achievement.achievement_id} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
                                    <FaTrophy className="text-white text-xl" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-gray-900 text-lg">{achievement.title}</h3>
                                  {achievement.description && (
                                    <p className="text-gray-700 mt-2 leading-relaxed">{achievement.description}</p>
                                  )}
                                  <div className="flex items-center mt-3 space-x-4">
                                    {achievement.achievement_date && (
                                      <span className="px-3 py-1 bg-white text-purple-700 rounded-full text-sm font-medium flex items-center">
                                        <FaCalendarAlt className="mr-1" />
                                        {new Date(achievement.achievement_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {achievement.category && (
                                      <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-medium capitalize">
                                        {achievement.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteAchievement(achievement.achievement_id)}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;