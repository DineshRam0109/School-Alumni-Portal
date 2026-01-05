import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaCheckCircle, 
  FaUser, 
  FaGraduationCap, 
  FaCalendar, 
  FaEnvelope, 
  FaPhone,
  FaMapMarkerAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { getAvatarUrl ,handleImageError} from '../utils/profilePictureUtils';

const VerifyAlumni = () => {
  const [unverifiedAlumni, setUnverifiedAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState({});

  useEffect(() => {
    fetchUnverifiedAlumni();
  }, []);

  const fetchUnverifiedAlumni = async () => {
    try {
      setLoading(true);
      const response = await api.get('/school-admin/unverified-alumni');
      
      if (response.data.success) {
        setUnverifiedAlumni(response.data.unverified_alumni || []);
      } else {
        toast.error(response.data.message || 'Failed to load data');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load unverified alumni';
      toast.error(message);
      setUnverifiedAlumni([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (educationId, alumniName) => {
    if (verifying[educationId]) return;

    const confirmed = window.confirm(
      `Are you sure you want to verify ${alumniName}'s education record?\n\nThis will mark their education as verified and they will appear in the alumni directory.`
    );

    if (!confirmed) return;

    try {
      setVerifying(prev => ({ ...prev, [educationId]: true }));
      
      const response = await api.put(`/school-admin/verify/${educationId}`);
      
      if (response.data.success) {
        toast.success(response.data.message || `${alumniName} verified successfully!`);
        
        // Remove from list
        setUnverifiedAlumni(prev => 
          prev.filter(a => a.education_id !== educationId)
        );
      } else {
        toast.error(response.data.message || 'Verification failed');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to verify alumni';
      toast.error(message);
    } finally {
      setVerifying(prev => ({ ...prev, [educationId]: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Unknown date';
    }
  };

  const formatDegreeLevel = (level) => {
    if (!level) return '';
    
    const levels = {
      'primary': 'Primary',
      'secondary': 'Secondary',
      'higher_secondary': 'Higher Secondary',
      'diploma': 'Diploma',
      'undergraduate': 'Undergraduate',
      'postgraduate': 'Postgraduate',
      'doctorate': 'Doctorate'
    };
    
    return levels[level] || level;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading unverified alumni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Alumni</h1>
          <p className="text-gray-600 mt-1">Review and approve alumni education records</p>
        </div>
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
          {unverifiedAlumni.length} pending
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <FaInfoCircle className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Verification Process:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Review each alumni's profile and education details carefully</li>
            <li>Click "View Profile" to see complete information</li>
            <li>Click "Verify" to approve their education record</li>
            <li>Once verified, alumni will appear in the alumni directory</li>
          </ul>
        </div>
      </div>

      {/* Alumni List */}
      {unverifiedAlumni.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FaCheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending alumni verification requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {unverifiedAlumni.map((alumni) => {
            const fullName = `${alumni.first_name} ${alumni.last_name}`;
            const isVerifying = verifying[alumni.education_id];
            
            return (
              <div 
                key={alumni.education_id} 
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Profile Picture */}
                    <Link 
                      to={`/profile/${alumni.user_id}`}
                      className="flex-shrink-0"
                    >
<img
  src={getAvatarUrl(alumni)}
  alt={`${alumni.first_name} ${alumni.last_name}`}
  className="w-12 h-12 rounded-full object-cover"
  onError={(e) => handleImageError(e, alumni.first_name, alumni.last_name)}
/>
                    </Link>

                    {/* Alumni Information */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <Link 
                          to={`/profile/${alumni.user_id}`}
                          className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {fullName}
                        </Link>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full flex-shrink-0">
                          Pending Verification
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Contact Information */}
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <FaEnvelope className="mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{alumni.email}</span>
                          </div>
                          {alumni.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FaPhone className="mr-2 text-gray-400 flex-shrink-0" />
                              <span>{alumni.phone}</span>
                            </div>
                          )}
                          {(alumni.current_city || alumni.current_country) && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FaMapMarkerAlt className="mr-2 text-gray-400 flex-shrink-0" />
                              <span>
                                {[alumni.current_city, alumni.current_country]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Education Information */}
                        <div className="space-y-2">
                          <div className="flex items-start text-sm text-gray-700">
                            <FaGraduationCap className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                            <div>
                              <span className="font-medium">
                                {formatDegreeLevel(alumni.degree_level)}
                              </span>
                              {alumni.field_of_study && (
                                <span className="ml-1 text-gray-600">
                                  in {alumni.field_of_study}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FaCalendar className="mr-2 text-gray-400 flex-shrink-0" />
                            <span>
                              {alumni.start_year} - {alumni.end_year}
                              {alumni.school_name && (
                                <span className="ml-1 text-gray-500">
                                  • {alumni.school_name}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      {alumni.bio && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {alumni.bio}
                          </p>
                        </div>
                      )}

                      {/* Footer with Actions */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <p className="text-xs text-gray-500">
                          Registered: {formatDate(alumni.created_at)}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Link
                            to={`/profile/${alumni.user_id}`}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors flex items-center"
                          >
                            <FaUser className="mr-1" />
                            View Profile
                          </Link>
                          <button
                            onClick={() => handleVerify(alumni.education_id, fullName)}
                            disabled={isVerifying}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                              isVerifying
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isVerifying ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Verifying...
                              </>
                            ) : (
                              <>
                                <FaCheckCircle className="mr-1" />
                                Verify
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VerifyAlumni;