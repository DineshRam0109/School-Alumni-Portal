import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { jobService } from '../services/jobService';
import { toast } from 'react-toastify';
import { 
  FaBriefcase, FaMapMarkerAlt, FaClock, FaDollarSign, 
  FaExternalLinkAlt, FaCheckCircle, FaArrowLeft, FaUniversity, FaTrash,
  FaUserGraduate, FaCode, FaCalendarAlt, FaInfoCircle
} from 'react-icons/fa';
import { handleImageError, getAvatarUrl } from '../utils/profilePictureUtils';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // ✅ FIXED: Move this AFTER job state declaration and add null check
  const isAdmin = user?.role === 'school_admin' || user?.role === 'super_admin';
  
  const isJobPoster = job && user && (
    (user.role === 'school_admin' && job.posted_by_type === 'school_admin' && 
      (job.posted_by === user.admin_id || job.posted_by === user.user_id)) ||
    (user.role === 'alumni' && job.posted_by_type === 'alumni' && job.posted_by === user.user_id)
  );

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await jobService.getJobById(id);
      setJob(response.data.job);
    } catch (error) {
      toast.error('Failed to load job');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!window.confirm('Are you sure you want to delete this job posting? All applications will also be removed.')) {
      return;
    }

    try {
      setDeleting(true);
      await jobService.deleteJob(id);
      toast.success('Job deleted successfully');
      navigate('/jobs');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete job');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <p className="text-gray-600 text-lg mb-4">Job not found</p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  const getJobTypeColor = (type) => {
    const colors = {
      full_time: 'bg-blue-100 text-blue-700 border border-blue-200',
      part_time: 'bg-green-100 text-green-700 border border-green-200',
      contract: 'bg-purple-100 text-purple-700 border border-purple-200',
      internship: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      freelance: 'bg-pink-100 text-pink-700 border border-pink-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  const getExperienceColor = (level) => {
    const colors = {
      entry: 'bg-blue-50 text-blue-700',
      intermediate: 'bg-green-50 text-green-700',
      senior: 'bg-purple-50 text-purple-700',
      executive: 'bg-orange-50 text-orange-700'
    };
    return colors[level] || 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <button 
          onClick={() => navigate('/jobs')} 
          className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors font-medium group"
        >
          <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Jobs
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-3">{job.job_title}</h1>
                  <p className="text-2xl text-indigo-600 font-semibold mb-4">{job.company_name}</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap ${getJobTypeColor(job.job_type)}`}>
                    {job.job_type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getExperienceColor(job.experience_level)}`}>
                    {job.experience_level.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Mandatory Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center text-gray-700 mb-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                      <FaMapMarkerAlt className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Location</p>
                      <p className="font-semibold">{job.is_remote ? 'Remote' : job.location}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center text-gray-700 mb-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <FaUserGraduate className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Experience Level</p>
                      <p className="font-semibold capitalize">{job.experience_level} Level</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center text-gray-700 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <FaDollarSign className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Salary Range</p>
                      <p className="font-semibold">{job.salary_range}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center text-gray-700 mb-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      <FaCalendarAlt className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Posted Date</p>
                      <p className="font-semibold">
                        {new Date(job.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory Job Description */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
                    <FaBriefcase className="text-white text-sm" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Job Description</h2>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {job.job_description}
                  </div>
                </div>
              </div>

              {/* Mandatory Required Skills */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <FaCode className="text-white text-sm" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Required Skills</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {/* ✅ FIXED: Added null check for skills_required */}
                  {job.skills_required && job.skills_required.split(',').map((skill, index) => (
                    <span 
                      key={index} 
                      className="px-4 py-2.5 text-sm font-medium bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                  {!job.skills_required && (
                    <span className="text-gray-500 text-sm">No specific skills listed</span>
                  )}
                </div>
              </div>

              {/* Mandatory Application Deadline */}
              <div className={`p-5 rounded-xl border ${job.is_past_deadline ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}`}>
                <div className="flex items-center">
                  <FaClock className={`mr-3 ${job.is_past_deadline ? 'text-red-600' : 'text-yellow-600'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${job.is_past_deadline ? 'text-red-900' : 'text-yellow-900'}`}>
                      Application Deadline
                    </p>
                    <p className={`text-base font-bold ${job.is_past_deadline ? 'text-red-700' : 'text-yellow-700'}`}>
                      {job.application_deadline ? (
                        new Date(job.application_deadline).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      ) : (
                        'No deadline specified'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-6 border border-gray-100">
              <div className="space-y-4">
                {isJobPoster ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                      <div className="flex items-center justify-center">
                        <FaCheckCircle className="text-green-600 mr-2" />
                        <p className="text-sm text-green-800 font-semibold">Your Job Posting</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDeleteJob}
                      disabled={deleting}
                      className="w-full px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-red-700"
                    >
                      <FaTrash className="mr-2" />
                      {deleting ? 'Deleting...' : 'Delete Job Posting'}
                    </button>
                  </div>
                ) : isAdmin ? (
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-center mb-2">
                      <FaInfoCircle className="text-gray-600 mr-2" />
                      <p className="text-sm text-gray-700 font-semibold">Administrator View</p>
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      Job application features are available only for alumni
                    </p>
                  </div>
                ) : (
                  <>
                    {!job.is_past_deadline && job.application_url ? (
                      <a
                        href={job.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-6 py-4 text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center border border-indigo-700"
                      >
                        <FaExternalLinkAlt className="mr-2" />
                        Apply on Company Website
                      </a>
                    ) : job.is_past_deadline ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm text-red-800 text-center font-medium">
                          Applications are no longer being accepted for this position.
                        </p>
                      </div>
                    ) : !job.application_url ? (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <p className="text-sm text-yellow-800 text-center font-medium">
                          No application link provided. Contact the job poster for details.
                        </p>
                      </div>
                    ) : null}
                  </>
                )}

                {/* Mandatory Poster Information */}
                <div className="pt-6 border-t-2 border-gray-100">
                  <p className="text-sm text-gray-500 mb-3 font-semibold">Posted by</p>
                  
                  {job.posted_by_type === 'school_admin' ? (
                    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <img
                        src={job.profile_picture || `https://ui-avatars.com/api/?name=School+Admin&background=6366f1&color=fff`}
                        alt="School Admin"
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                      />
                      <div className="flex-1">
                        <div className="text-sm">
                          <div className="flex items-center text-gray-700">
                            <FaUniversity className="mr-1.5 text-indigo-500" />
                            <span className="font-semibold">{job.poster_school_name || 'School'}</span>
                          </div>
                          <div className="text-xs text-indigo-600 mt-1 font-medium">
                            School Administrator
                          </div>
                          {job.email && (
                            <div className="text-xs text-gray-500 mt-0.5">{job.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : job.posted_by_type === 'alumni' ? (
                    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      {/* ✅ FIXED: Proper avatar usage with correct parameter order */}
                      <img
                        src={getAvatarUrl(job, job.first_name, job.last_name)}
                        alt={`${job.first_name} ${job.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => handleImageError(e, job.first_name, job.last_name)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{job.first_name} {job.last_name}</p>
                        {job.email && (
                          <p className="text-sm text-gray-600">{job.email}</p>
                        )}
                        {job.alumni_school_name && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <FaUniversity className="mr-1.5 text-indigo-500" />
                            {job.alumni_school_name}
                          </div>
                        )}
                        <div className="text-xs text-indigo-600 mt-1 font-medium">Alumni</div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Mandatory Application Count */}
                {job.application_count > 0 && (
                  <div className="pt-6 border-t-2 border-gray-100">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <span className="text-sm font-semibold text-gray-700">Total Applicants</span>
                      <span className="text-2xl font-bold text-indigo-600">{job.application_count}</span>
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

export default JobDetails;