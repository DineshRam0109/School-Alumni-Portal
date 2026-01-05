import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaBriefcase, FaUsers, FaMapMarkerAlt, FaBuilding, FaIndustry, FaArrowLeft } from 'react-icons/fa';
import { getAvatarUrl, handleImageError } from '../utils/profilePictureUtils';

const CompanyDetails = () => {
  const { companyName } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCompanyData();
  }, [companyName, page]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/companies/${encodeURIComponent(companyName)}/alumni`, {
        params: { page, limit: 20 }
      });
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12">Company not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/companies')} 
        className="flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium"
      >
        <FaArrowLeft className="mr-2" />
        Back to Companies
      </button>

      {/* Company Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaBuilding className="text-4xl text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{decodeURIComponent(companyName)}</h1>
            {data.stats && (
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                {data.stats.industry && (
                  <div className="flex items-center text-gray-600">
                    <FaIndustry className="mr-2" />
                    {data.stats.industry}
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <FaUsers className="mr-2" />
                  {data.stats.current_employees} current employees
                </div>
                {data.stats.past_employees > 0 && (
                  <div className="flex items-center text-gray-600">
                    <FaUsers className="mr-2" />
                    {data.stats.past_employees} past employees
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Alumni</p>
              <p className="text-3xl font-bold text-gray-900">{data.pagination.total}</p>
            </div>
            <FaUsers className="text-3xl text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Current Employees</p>
              <p className="text-3xl font-bold text-green-900">{data.stats?.current_employees || 0}</p>
            </div>
            <FaBriefcase className="text-3xl text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Past Employees</p>
              <p className="text-3xl font-bold text-gray-900">{data.stats?.past_employees || 0}</p>
            </div>
            <FaBriefcase className="text-3xl text-gray-600" />
          </div>
        </div>
      </div>

      {/* Alumni List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Alumni at {decodeURIComponent(companyName)}</h2>
        </div>
        <div className="p-6">
          {data.alumni.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No alumni found</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.alumni.map((person) => (
                  <Link
                    key={person.user_id}
                    to={`/profile/${person.user_id}`}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <img
                        src={getAvatarUrl(person)}
                        alt={`${person.first_name} ${person.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => handleImageError(e, person.first_name, person.last_name)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {person.first_name} {person.last_name}
                        </p>
                        <p className="text-sm text-gray-600 truncate">{person.position}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-500">
                      {person.current_city && (
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="mr-1" />
                          {person.current_city}
                        </div>
                      )}
                      {person.school_name && (
                        <div>
                          {person.school_name} '{person.end_year}
                        </div>
                      )}
                      <div className={`inline-block px-2 py-1 rounded ${person.is_current ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                        {person.is_current ? 'Current' : 'Past'} Employee
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.pages > 1 && (
                <div className="mt-6 flex justify-center">
                  <nav className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Page {page} of {data.pagination.pages}
                    </span>
                    
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === data.pagination.pages}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
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

export default CompanyDetails;