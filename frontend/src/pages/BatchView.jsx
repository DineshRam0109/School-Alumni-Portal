import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { schoolService } from '../services/schoolService';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaUsers, FaCalendar } from 'react-icons/fa';
import { getAvatarUrl ,handleImageError} from '../utils/profilePictureUtils';

const BatchView = () => {
  const { id } = useParams(); // school_id
  const [school, setSchool] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState(null);

  useEffect(() => {
    fetchBatchData();
  }, [id]);

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      const [schoolRes, batchRes] = await Promise.all([
        schoolService.getSchoolById(id),
        schoolService.getSchoolById(id).then(res => 
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/schools/${id}/batches`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(r => r.json())
        )
      ]);
      
      setSchool(schoolRes.data.school);
      setBatches(batchRes.batches);
    } catch (error) {
      toast.error('Failed to load batch data');
    } finally {
      setLoading(false);
    }
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {school?.logo ? (
              <img src={school.logo} alt={school.school_name} className="w-16 h-16 rounded-lg" />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaGraduationCap className="text-3xl text-blue-600" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school?.school_name}</h1>
            <p className="text-gray-600">Alumni by Batch Year</p>
          </div>
        </div>
      </div>

      {/* Batch Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Batches</p>
              <p className="text-3xl font-bold text-gray-900">{batches.length}</p>
            </div>
            <FaCalendar className="text-3xl text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Alumni</p>
              <p className="text-3xl font-bold text-gray-900">
                {batches.reduce((sum, batch) => sum + batch.alumni_count, 0)}
              </p>
            </div>
            <FaUsers className="text-3xl text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Largest Batch</p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.max(...batches.map(b => b.alumni_count))}
              </p>
            </div>
            <FaGraduationCap className="text-3xl text-purple-600" />
          </div>
        </div>
      </div>

      {/* Batches List */}
      <div className="space-y-4">
        {batches.map((batch) => (
          <div key={batch.batch_year} className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setExpandedBatch(expandedBatch === batch.batch_year ? null : batch.batch_year)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaGraduationCap className="text-xl text-blue-600" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Batch of {batch.batch_year}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {batch.start_year} - {batch.batch_year} • {batch.alumni_count} alumni
                  </p>
                </div>
              </div>
              <div className="text-gray-400">
                {expandedBatch === batch.batch_year ? '▲' : '▼'}
              </div>
            </button>

            {expandedBatch === batch.batch_year && (
              <div className="border-t p-6 bg-gray-50">
                {batch.alumni && batch.alumni.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {batch.alumni.map((person) => (
                      <Link
                        key={person.user_id}
                        to={`/profile/${person.user_id}`}
                        className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center space-x-3">
                          
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
                            {person.position && person.company_name && (
                              <p className="text-sm text-gray-600 truncate">
                                {person.position} at {person.company_name}
                              </p>
                            )}
                            {person.current_city && (
                              <p className="text-xs text-gray-500">{person.current_city}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No alumni data available</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchView;

