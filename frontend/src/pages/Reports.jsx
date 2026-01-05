import React, { useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { toast } from 'react-toastify';
import { FaFileExport, FaFileCsv, FaFilePdf, FaDownload, FaSpinner } from 'react-icons/fa';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');

  const reports = [
    {
      id: 'users',
      title: 'Alumni Report',
      description: 'Complete list of all registered alumni with their details, education, and work experience',
      icon: '👥',
      color: 'blue'
    },
    {
      id: 'school_admins',
      title: 'School Admins Report',
      description: 'All school administrators with their school details and contact information',
      icon: '👨‍💼',
      color: 'indigo'
    },
    {
      id: 'schools',
      title: 'Schools Report',
      description: 'All schools with alumni count, admins, events, and connection statistics',
      icon: '🏫',
      color: 'green'
    },
    {
      id: 'events',
      title: 'Events Report',
      description: 'All events with registration, attendance data, and revenue',
      icon: '📅',
      color: 'purple'
    },
    {
      id: 'jobs',
      title: 'Jobs Report',
      description: 'Job postings with application statistics, company details, and posted by information',
      icon: '💼',
      color: 'orange'
    },
    {
      id: 'connections',
      title: 'Connections Report',
      description: 'Alumni network connections and statistics',
      icon: '🤝',
      color: 'pink'
    },
    
    {
      id: 'companies_alumni',
      title: 'Companies Alumni Report',
      description: 'Alumni working at various companies',
      icon: '🏢',
      color: 'red'
    }
  ];

  const handleExport = async (reportType, format = 'csv') => {
    try {
      setLoading(true);
      setSelectedReport(reportType);

      const response = await analyticsService.exportReport({
        report_type: reportType,
        format: format
      });

      if (format === 'pdf') {
        // For PDF, response should already be a blob
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${reportType}_report_${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // For CSV
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${reportType}_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || 'Failed to export report');
    } finally {
      setLoading(false);
      setSelectedReport('');
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      green: 'bg-green-100 text-green-600 border-green-200',
      purple: 'bg-purple-100 text-purple-600 border-purple-200',
      orange: 'bg-orange-100 text-orange-600 border-orange-200',
      pink: 'bg-pink-100 text-pink-600 border-pink-200',
      indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
      teal: 'bg-teal-100 text-teal-600 border-teal-200',
      cyan: 'bg-cyan-100 text-cyan-600 border-cyan-200',
      lime: 'bg-lime-100 text-lime-600 border-lime-200',
      amber: 'bg-amber-100 text-amber-600 border-amber-200',
      red: 'bg-red-100 text-red-600 border-red-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Export</h1>
        <p className="text-gray-600 mt-1">Generate and download system reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`border-2 rounded-lg p-6 hover:shadow-lg transition-shadow ${getColorClasses(report.color)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{report.icon}</div>
              {loading && selectedReport === report.id && (
                <FaSpinner className="animate-spin text-2xl" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {report.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {report.description}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport(report.id, 'csv')}
                disabled={loading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaFileCsv className="mr-2" />
                CSV
              </button>
              <button
                onClick={() => handleExport(report.id, 'pdf')}
                disabled={loading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaFilePdf className="mr-2" />
                PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;