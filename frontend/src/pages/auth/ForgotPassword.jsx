import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';
import { FaEnvelope, FaGraduationCap, FaUserTie } from 'react-icons/fa';

const ForgotPassword = () => {
  const location = useLocation();
  // Check if this is for school admin based on URL path or state
  const isSchoolAdmin = location.pathname.includes('school-admin') || location.state?.isSchoolAdmin;
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use different API endpoint based on user type
      if (isSchoolAdmin) {
        await authService.schoolAdminForgotPassword({ email });
      } else {
        await authService.forgotPassword({ email });
      }
      setSent(true);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  // Different colors and icons based on user type
  const bgGradient = isSchoolAdmin 
    ? 'from-indigo-500 to-purple-600' 
    : 'from-blue-500 to-purple-600';
  
  const iconBg = isSchoolAdmin ? 'bg-indigo-100' : 'bg-blue-100';
  const iconColor = isSchoolAdmin ? 'text-indigo-600' : 'text-blue-600';
  const buttonBg = isSchoolAdmin 
    ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' 
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
  const linkColor = isSchoolAdmin ? 'text-indigo-600 hover:text-indigo-500' : 'text-blue-600 hover:text-blue-500';
  const loginPath = isSchoolAdmin ? '/school-admin-login' : '/login';
  
  const Icon = isSchoolAdmin ? FaUserTie : FaGraduationCap;
  const title = isSchoolAdmin ? 'School Admin Portal' : 'Alumni Portal';
  const placeholder = isSchoolAdmin ? 'admin@school.com' : 'you@example.com';

  if (sent) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center px-4`}>
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <FaEnvelope className="text-3xl text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <Link
            to={loginPath}
            className={`inline-block px-6 py-2 ${buttonBg.split(' ')[0]} text-white rounded-md ${buttonBg.split(' ')[1]}`}
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center px-4`}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${iconBg} rounded-full mb-4`}>
            <Icon className={`text-3xl ${iconColor}`} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <h3 className="text-xl font-semibold text-gray-700 mt-2">Forgot Password?</h3>
          <p className="text-gray-600 mt-2">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={placeholder}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link to={loginPath} className={`font-medium ${linkColor}`}>
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;