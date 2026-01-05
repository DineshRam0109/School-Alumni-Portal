import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaFileExport, FaFileCsv, FaFilePdf, FaDownload, FaSpinner, 
  FaUsers, FaCalendar, FaGraduationCap, FaBriefcase
} from 'react-icons/fa';

const SchoolAdminReports = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');

  const reports = [
    {
      id: 'alumni',
      title: 'Alumni Report',
      description: 'Comprehensive alumni directory with education, work experience, and contact details',
      icon: FaUsers,
      gradient: 'from-blue-500 to-blue-700',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-300'
    },
    {
      id: 'events',
      title: 'Events Report',
      description: 'Event details with registration statistics, attendance, and engagement metrics',
      icon: FaCalendar,
      gradient: 'from-purple-500 to-purple-700',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-300'
    },
    {
      id: 'batches',
      title: 'Batch Report',
      description: 'Year-wise alumni statistics with verification status and employment rates',
      icon: FaGraduationCap,
      gradient: 'from-green-500 to-green-700',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-300'
    },
    {
      id: 'employment',
      title: 'Employment Statistics',
      description: 'Detailed employment data including companies, positions, industries, and salaries',
      icon: FaBriefcase,
      gradient: 'from-orange-500 to-orange-700',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-300'
    }
  ];

  const handleExport = async (reportType, format = 'csv') => {
    try {
      setLoading(true);
      setSelectedReport(reportType);

      const response = await api.post('/school-admin/export', {
        report_type: reportType,
        format: format
      }, {
        responseType: 'blob',
        validateStatus: (status) => status < 500
      });

      // Check if response is JSON error
      if (response.headers['content-type']?.includes('application/json')) {
        const text = await response.data.text();
        const responseData = JSON.parse(text);
        
        if (responseData.success === false) {
          throw new Error(responseData.message || 'Export failed');
        }
        
        if (responseData.count === 0) {
          toast.warning('Report is empty. No data available for this report type.');
          return;
        }
      }

      const mimeTypes = {
        csv: 'text/csv',
        pdf: 'application/pdf'
      };

      const blob = new Blob([response.data], { 
        type: mimeTypes[format] || 'application/octet-stream'
      });
      
      if (blob.size < 100) {
        toast.warning('Report contains no data. Please try again later.');
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${user?.school_name?.replace(/\s+/g, '_')}_${reportType}_${timestamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Report downloaded successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error('Export error:', error);
      
      if (error.response?.status === 404) {
        toast.error('Export endpoint not found. Please check server configuration.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to export this report.');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error(error.message || 'Failed to export report');
      }
    } finally {
      setLoading(false);
      setSelectedReport('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">Reports</h1>
        <p className="text-indigo-100 text-lg">
          Generate comprehensive reports for {user?.school_name || 'your school'}
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className={`${report.bgColor} border-2 ${report.borderColor} rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-4 rounded-xl bg-white shadow-lg ${report.iconColor}`}>
                  <Icon className="text-3xl" />
                </div>
                {loading && selectedReport === report.id && (
                  <FaSpinner className="animate-spin text-3xl text-gray-700" />
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {report.title}
              </h3>
              <p className="text-sm text-gray-700 mb-5 min-h-[60px] leading-relaxed">
                {report.description}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(report.id, 'csv')}
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r ${report.gradient} text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold`}
                >
                  <FaFileCsv className="mr-2 text-lg" />
                  CSV
                </button>
                <button
                  onClick={() => handleExport(report.id, 'pdf')}
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r ${report.gradient} text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold`}
                >
                  <FaFilePdf className="mr-2 text-lg" />
                  PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

     
    </div>
  );
};

export default SchoolAdminReports;