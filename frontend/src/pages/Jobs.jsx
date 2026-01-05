import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../services/jobService';
import { schoolService } from '../services/schoolService';
import { toast } from 'react-toastify';
import { FaBriefcase, FaMapMarkerAlt, FaClock, FaPlus, FaFilter, FaUniversity, FaHistory } from 'react-icons/fa';
import { useSelector } from 'react-redux';

const Jobs = () => {
  const { user } = useSelector((state) => state.auth);
  const [jobs, setJobs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [showPastJobs, setShowPastJobs] = useState(false);
  const [filters, setFilters] = useState({
    job_type: '',
    location: '',
    experience_level: '',
    search: '',
    school_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // ✅ FIXED: Super admin cannot post jobs
  const canPostJob = user?.role === 'alumni' || user?.role === 'school_admin';

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [filters, showPastJobs]);

  const fetchSchools = async () => {
    try {
      setLoadingSchools(true);
      const response = await schoolService.getAllSchools();
      setSchools(response.data?.schools || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setLoadingSchools(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await jobService.getAllJobs({ 
        ...filters, 
        show_past: showPastJobs.toString()
      });
      setJobs(response.data.jobs);
    } catch (error) {
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({ 
      job_type: '', 
      location: '', 
      experience_level: '', 
      search: '',
      school_id: ''
    });
  };

  const getJobTypeColor = (type) => {
    const colors = {
      full_time: 'bg-blue-100 text-blue-600',
      part_time: 'bg-green-100 text-green-600',
      contract: 'bg-purple-100 text-purple-600',
      internship: 'bg-yellow-100 text-yellow-600',
      freelance: 'bg-pink-100 text-pink-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const hasActiveFilters = filters.job_type || filters.location || filters.experience_level || filters.search || filters.school_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showPastJobs ? 'Past Job Opportunities' : 'Job Portal'}
          </h1>
          <p className="text-gray-600 mt-1">
            {showPastJobs 
              ? 'Browse expired job postings'
              : user?.role === 'super_admin' 
                ? 'View all job postings across the system'
                : user?.role === 'school_admin'
                ? 'View and post jobs for your school alumni'
                : 'Find opportunities posted by alumni'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPastJobs(!showPastJobs)}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
              showPastJobs 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FaHistory className="mr-2" />
            {showPastJobs ? 'Active Jobs' : 'Past Jobs'}
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            <FaFilter className="mr-2" />
            Filters
          </button>
          {canPostJob && !showPastJobs && (
            <Link
              to="/post-job"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FaPlus className="mr-2" />
              Post Job
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Search jobs by title, company, or skills..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={`lg:block ${showFilters ? 'block' : 'hidden'} bg-white rounded-lg shadow p-6 h-fit`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School
              </label>
              <div className="relative">
                <FaUniversity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                <select
                  value={filters.school_id}
                  onChange={(e) => handleFilterChange('school_id', e.target.value)}
                  disabled={loadingSchools}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">All Schools</option>
                  {schools.map((school) => (
                    <option key={school.school_id} value={school.school_id}>
                      {school.school_name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Filter by alumni from specific schools
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Type
              </label>
              <select
                value={filters.job_type}
                onChange={(e) => handleFilterChange('job_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                value={filters.experience_level}
                onChange={(e) => handleFilterChange('experience_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                placeholder="City or country"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2">Active Filters:</p>
              <div className="space-y-2">
                {filters.school_id && (
                  <div className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                    <span className="text-blue-700">
                      {schools.find(s => s.school_id === parseInt(filters.school_id))?.school_name || 'School'}
                    </span>
                    <button
                      onClick={() => handleFilterChange('school_id', '')}
                      className="text-blue-900 hover:text-blue-700 ml-2"
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.job_type && (
                  <div className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1 rounded">
                    <span className="text-purple-700 capitalize">{filters.job_type.replace('_', ' ')}</span>
                    <button
                      onClick={() => handleFilterChange('job_type', '')}
                      className="text-purple-900 hover:text-purple-700 ml-2"
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.experience_level && (
                  <div className="flex items-center justify-between text-xs bg-green-50 px-2 py-1 rounded">
                    <span className="text-green-700 capitalize">{filters.experience_level} Level</span>
                    <button
                      onClick={() => handleFilterChange('experience_level', '')}
                      className="text-green-900 hover:text-green-700 ml-2"
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.location && (
                  <div className="flex items-center justify-between text-xs bg-orange-50 px-2 py-1 rounded">
                    <span className="text-orange-700">{filters.location}</span>
                    <button
                      onClick={() => handleFilterChange('location', '')}
                      className="text-orange-900 hover:text-orange-700 ml-2"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FaBriefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {showPastJobs ? 'No past jobs found' : 'No jobs found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results' 
                  : showPastJobs
                  ? 'No expired job postings match your criteria'
                  : 'Check back later for new opportunities'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Link
                  key={job.job_id}
                  to={`/jobs/${job.job_id}`}
                  className={`block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
                    job.is_past_deadline ? 'opacity-75 border-l-4 border-gray-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{job.job_title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getJobTypeColor(job.job_type)}`}>
                          {job.job_type.replace('_', ' ')}
                        </span>
                       
                      </div>
                      
                      <p className="text-gray-700 font-medium mb-2">{job.company_name}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="mr-1 text-xs" />
                          {job.is_remote ? 'Remote' : job.location}
                        </div>
                        {job.salary_range && (
                          <div className="flex items-center">
                            <FaBriefcase className="mr-1 text-xs" />
                            {job.salary_range}
                          </div>
                        )}
                        <div className="flex items-center">
                          <FaClock className="mr-1 text-xs" />
                          {new Date(job.created_at).toLocaleDateString()}
                        </div>
                        {job.application_deadline && (
                          <div className={`flex items-center ${job.is_past_deadline ? 'text-red-600' : 'text-orange-600'}`}>
                            <FaClock className="mr-1 text-xs" />
                            Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">{job.job_description}</p>
                      
                      {job.skills_required && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.skills_required.split(',').slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 text-right">
                      {/* ✅ FIXED: Never show super_admin, no names for school_admin */}
                      {job.posted_by_type === 'school_admin' ? (
                        <div className="text-sm">
                          <div className="flex items-center justify-end text-xs text-gray-500">
                            <FaUniversity className="mr-1" />
                            <span>{job.poster_school_name || 'School'}</span>
                          </div>
                          <div className="text-xs text-indigo-600 mt-0.5 font-medium">
                            School Administrator
                          </div>
                        </div>
                      ) : job.posted_by_type === 'alumni' ? (
                        <div className="text-sm">
                          <div className="text-gray-700 font-medium">
                            {job.first_name} {job.last_name}
                          </div>
                          {job.alumni_school_name && (
                            <div className="flex items-center justify-end text-xs text-gray-500 mt-1">
                              <FaUniversity className="mr-1" />
                              <span>{job.alumni_school_name}</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-0.5">Alumni</div>
                        </div>
                      ) : null}
                      
                      {/* ✅ FIXED: Only show if application_count > 0 */}
                      {job.application_count > 0 && (
                        <div className="text-xs text-gray-400 mt-2">
                          {job.application_count} application{job.application_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
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

export default Jobs;