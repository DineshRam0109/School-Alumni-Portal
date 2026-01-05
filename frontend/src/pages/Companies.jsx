import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaBriefcase, FaUsers, FaIndustry, FaSearch } from 'react-icons/fa';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [companiesRes, industriesRes] = await Promise.all([
        api.get('/companies', { params: { search, limit: 100 } }),
        api.get('/companies/industries')
      ]);
      setCompanies(companiesRes.data.companies);
      setIndustries(industriesRes.data.industries);
    } catch (error) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Companies Directory</h1>
        <p className="text-gray-600 mt-1">Discover where alumni are working</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Industries Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FaIndustry className="mr-2 text-purple-600" />
          Top Industries
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {industries.slice(0, 8).map((industry, index) => (
            <div key={index} className="p-4 border rounded-lg text-center">
              <p className="font-medium text-gray-900">{industry.industry}</p>
              <p className="text-sm text-gray-600 mt-1">{industry.alumni_count} alumni</p>
              <p className="text-xs text-gray-500">{industry.company_count} companies</p>
            </div>
          ))}
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Companies ({companies.length})</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : companies.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No companies found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company, index) => (
                <Link
                  key={index}
                  to={`/companies/${encodeURIComponent(company.company_name)}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{company.company_name}</h3>
                      {company.industry && (
                        <p className="text-sm text-gray-600 mt-1">{company.industry}</p>
                      )}
                    </div>
                    <div className="ml-2">
                      <FaBriefcase className="text-2xl text-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <FaUsers className="mr-1 text-xs" />
                      <span>{company.alumni_count} alumni</span>
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

export default Companies;