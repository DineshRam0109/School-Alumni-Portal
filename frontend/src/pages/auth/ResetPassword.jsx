import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';
import { FaLock, FaGraduationCap, FaUserTie } from 'react-icons/fa';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userType = searchParams.get('type') || 'user'; // ✅ GET TYPE FROM URL
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (formData.password !== formData.confirm_password) {
    toast.error('Passwords do not match');
    return;
  }

  if (formData.password.length < 6) {
    toast.error('Password must be at least 6 characters');
    return;
  }

  setLoading(true);

  try {
    await authService.resetPassword(token, { password: formData.password }, userType);
    toast.success('Password reset successful! Redirecting to login...');
    
    // Redirect after 2 seconds
    setTimeout(() => {
      navigate(userType === 'school_admin' ? '/school-admin-login' : '/login');
    }, 2000);
    
  } catch (error) {
    // ✅ Show specific error message from backend
    const errorMessage = error.response?.data?.message || 'Failed to reset password';
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};
  // ✅ SHOW DIFFERENT ICON BASED ON USER TYPE
  const Icon = userType === 'school_admin' ? FaUserTie : FaGraduationCap;
  const title = userType === 'school_admin' ? 'School Admin Reset Password' : 'Reset Password';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Icon className="text-3xl text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-2">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;