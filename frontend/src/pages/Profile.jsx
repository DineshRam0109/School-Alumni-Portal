import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userService } from '../services/userService';
import { connectionService } from '../services/connectionService';
import { toast } from 'react-toastify';
import { 
  FaEnvelope, FaLinkedin, FaFacebook, FaTwitter, 
  FaMapMarkerAlt, FaGraduationCap, FaBriefcase, 
  FaTrophy, FaUserPlus, FaEdit, FaArrowLeft 
} from 'react-icons/fa';
import { getAvatarUrl, handleImageError } from '../utils/profilePictureUtils';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  const isOwnProfile = currentUser?.user_id === parseInt(id);
  const isCurrentUserAdmin = currentUser?.role === 'school_admin' || currentUser?.role === 'super_admin';

  
  useEffect(() => {
    if (!id) {
      toast.error('Invalid profile URL - No user ID provided');
      navigate('/dashboard', { replace: true });
      return;
    }

    if (isNaN(parseInt(id))) {
      toast.error('Invalid profile URL - User ID must be a number');
      navigate('/dashboard', { replace: true });
      return;
    }

    fetchProfile();
    if (!isOwnProfile && !isCurrentUserAdmin) {
      fetchConnectionStatus();
    }
  }, [id]);

useEffect(() => {
  if (profile) {
    const newUrl = getAvatarUrl(profile);
    console.log('[Profile] Updated profile picture URL:', newUrl);
    setProfilePictureUrl(newUrl);
  }
}, [profile]);

  useEffect(() => {
    if (isOwnProfile && currentUser && profile) {
      const currentProfilePicture = profile.profile_picture;
      const newProfilePicture = currentUser.profile_picture;
      
      if (currentProfilePicture !== newProfilePicture) {
        console.log('[Profile] Profile picture changed, updating...');
        setProfile(prev => ({
          ...prev,
          profile_picture: newProfilePicture
        }));
      }
    }
  }, [currentUser?.profile_picture, isOwnProfile]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user' && isOwnProfile) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          if (updatedUser && profile) {
            setProfile(prev => ({
              ...prev,
              profile_picture: updatedUser.profile_picture,
              first_name: updatedUser.first_name || prev.first_name,
              last_name: updatedUser.last_name || prev.last_name
            }));
          }
        } catch (error) {
          console.error('[Profile] Error parsing storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isOwnProfile, profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      console.log('[Profile] Fetching profile for user ID:', id);
      const response = await userService.getProfile(id);
      
      if (response.data.user) {
        console.log('[Profile] Profile fetched successfully');
        setProfile(response.data.user);
      } else {
        throw new Error('No user data in response');
      }
    } catch (error) {
      console.error('[Profile] Fetch error:', error);
      if (error.response?.status === 404) {
        toast.error('Profile not found');
      } else {
        toast.error('Failed to load profile');
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const response = await connectionService.getConnectionStatus(id);
      setConnectionStatus(response.data.status);
    } catch (error) {
      console.error('[Profile] Connection status error:', error);
      setConnectionStatus('none');
    }
  };

  const handleConnect = async () => {
    try {
      await connectionService.sendRequest(id);
      toast.success('Connection request sent!');
      setConnectionStatus('sent');
    } catch (error) {
      console.error('[Profile] Connection request error:', error);
      if (error.response?.status === 403) {
        toast.error('Connection requests are only available for alumni networking');
      } else {
        toast.error(error.response?.data?.message || 'Failed to send request');
      }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Profile not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const isAdminProfile = profile.role === 'super_admin' || profile.role === 'school_admin';
  const isProfileAlumni = profile.role === 'alumni';
  
  // FIXED: Only show connect/message buttons if both users are alumni
  const showConnectionButtons = !isOwnProfile && 
                                !isAdminProfile && 
                                !isCurrentUserAdmin && 
                                isProfileAlumni &&
                                currentUser?.role === 'alumni';

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors group"
      >
        <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back</span>
      </button>

      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="px-6 pb-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-24 space-y-6 sm:space-y-0">
            <div className="relative">
            <img
  src={profilePictureUrl}
  alt={profile.first_name}
  className="w-40 h-40 rounded-2xl border-4 border-white shadow-xl object-cover transform transition-transform hover:scale-105 duration-300"
  onError={(e) => handleImageError(e, profile.first_name, profile.last_name)}
/>

              {profile.role === 'alumni' && profile.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white p-2 rounded-full shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex-1 sm:ml-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  {profile.bio && (
<p className="mt-3 text-white max-w-2xl leading-relaxed">{profile.bio}</p>                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 mt-6 lg:mt-0">
                  {isOwnProfile && !isAdminProfile ? (
                    <Link
                      to="/edit-profile"
                      className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                    >
                      <FaEdit className="mr-2" />
                      Edit Profile
                    </Link>
                  ) : showConnectionButtons ? (
                    <>
                      {connectionStatus === 'none' && (
                        <button
                          onClick={handleConnect}
                          className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                        >
                          <FaUserPlus className="mr-2" />
                          Connect
                        </button>
                      )}
                      {connectionStatus === 'sent' && (
                        <button
                          disabled
                          className="inline-flex items-center px-5 py-3 bg-gray-400 text-white font-medium rounded-xl cursor-not-allowed"
                        >
                          <FaUserPlus className="mr-2" />
                          Request Sent
                        </button>
                      )}
                      {connectionStatus === 'accepted' && (
                        <button
                          onClick={() => navigate('/messages', { 
                            state: { 
                              selectedUserId: profile.user_id,
                              userName: `${profile.first_name} ${profile.last_name}`
                            } 
                          })}
                          className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 font-medium rounded-xl hover:from-gray-200 hover:to-gray-100 transition-all transform hover:-translate-y-0.5 shadow-sm hover:shadow border border-gray-200"
                        >
                          <FaEnvelope className="mr-2" />
                          Message
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-6 text-gray-600">
                {profile.current_city && (
                  <div className="flex items-center bg-gray-50 px-4 py-2 rounded-lg">
                    <FaMapMarkerAlt className="mr-2 text-purple-500" />
                    <span className="font-medium">{profile.current_city}, {profile.current_country}</span>
                  </div>
                )}
                {/* FIXED: Only show email if not admin OR if viewing own profile */}
                {profile.email && (isOwnProfile || !isAdminProfile) && (
                  <div className="flex items-center bg-gray-50 px-4 py-2 rounded-lg">
                    <FaEnvelope className="mr-2 text-indigo-500" />
                    <span className="font-medium">{profile.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-8 flex space-x-5">
                {profile.linkedin_url && (
                  <a 
                    href={profile.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all transform hover:-translate-y-1 shadow-sm hover:shadow-md"
                  >
                    <FaLinkedin className="text-2xl text-blue-700" />
                  </a>
                )}
                {profile.facebook_url && (
                  <a 
                    href={profile.facebook_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all transform hover:-translate-y-1 shadow-sm hover:shadow-md"
                  >
                    <FaFacebook className="text-2xl text-blue-600" />
                  </a>
                )}
                {profile.twitter_url && (
                  <a 
                    href={profile.twitter_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all transform hover:-translate-y-1 shadow-sm hover:shadow-md"
                  >
                    <FaTwitter className="text-2xl text-blue-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {profile.education && profile.education.length > 0 && (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-xl mr-4 shadow-md">
                  <FaGraduationCap className="text-2xl text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Education</h2>
              </div>
              <div className="space-y-6">
                {profile.education.map((edu) => (
                  <div 
                    key={edu.education_id} 
                    className="flex items-start bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center">
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
                    <div className="ml-6 flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{edu.school_name}</h3>
                      <p className="text-indigo-600 font-medium capitalize mt-1">
                        {edu.degree_level.replace(/_/g, ' ')}
                      </p>
                      {edu.field_of_study && (
                        <p className="text-gray-600 mt-1">{edu.field_of_study}</p>
                      )}
                      <div className="flex items-center mt-3">
                        <span className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-full text-sm font-medium">
                          {edu.start_year} - {edu.end_year}
                        </span>
                        {edu.is_verified && (
                          <span className="ml-3 px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-full text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.work_experience && profile.work_experience.length > 0 && (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-xl mr-4 shadow-md">
                  <FaBriefcase className="text-2xl text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Work Experience</h2>
              </div>
              <div className="space-y-6">
                {profile.work_experience.map((work) => (
                  <div 
                    key={work.experience_id} 
                    className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-blue-500"
                  >
                    <div className="absolute -left-2 top-6 w-4 h-4 bg-blue-500 rounded-full"></div>
                    <h3 className="font-bold text-gray-900 text-lg">{work.position}</h3>
                    <p className="text-blue-600 font-medium mt-1">{work.company_name}</p>
                    <div className="mt-3 flex items-center">
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-full text-sm font-medium">
                        {new Date(work.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                        {work.is_current ? ' Present' : (work.end_date ? new Date(work.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '')}
                      </span>
                    </div>
                    {work.description && (
                      <p className="mt-4 text-gray-700 leading-relaxed border-t border-gray-100 pt-4">{work.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.achievements && profile.achievements.length > 0 && (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-xl mr-4 shadow-md">
                  <FaTrophy className="text-2xl text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Achievements</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.achievements.map((achievement) => (
                  <div 
                    key={achievement.achievement_id} 
                    className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-100 hover:border-amber-200 transition-all duration-300"
                  >
                    <div className="flex items-start">
                      <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-2 rounded-lg mr-4 shadow-sm">
                        <FaTrophy className="text-xl text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{achievement.title}</h3>
                        {achievement.description && (
                          <p className="text-gray-600 mt-2 text-sm leading-relaxed">{achievement.description}</p>
                        )}
                        {achievement.achievement_date && (
                          <p className="mt-3 text-amber-600 text-sm font-medium">
                            {new Date(achievement.achievement_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Contact Information</h3>
            <div className="space-y-6">
              {/* FIXED: Only show email if not admin OR if viewing own profile */}
              {profile.email && (isOwnProfile || !isAdminProfile) && (
                <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-lg mr-4 shadow-sm">
                    <FaEnvelope className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Email</p>
                    <p className="text-gray-900 font-medium mt-1">{profile.email}</p>
                  </div>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-lg mr-4 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Phone</p>
                    <p className="text-gray-900 font-medium mt-1">{profile.phone}</p>
                  </div>
                </div>
              )}
              {profile.current_city && (
                <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-3 rounded-lg mr-4 shadow-sm">
                    <FaMapMarkerAlt className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Location</p>
                    <p className="text-gray-900 font-medium mt-1">{profile.current_city}, {profile.current_country}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {profile.skills && profile.skills.length > 0 && (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Skills</h3>
              <div className="flex flex-wrap gap-3">
                {profile.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-medium hover:from-indigo-200 hover:to-purple-200 transition-all duration-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;