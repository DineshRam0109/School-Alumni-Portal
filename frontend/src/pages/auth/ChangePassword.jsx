import React, { useState } from 'react';
import { userService } from '../../services/userService';
import { toast } from 'react-toastify';
import { FaLock, FaCheckCircle, FaEye, FaEyeSlash, FaShieldAlt, FaKey, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const toggleShowPassword = (field) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  

  // ✅ NEW: Check if new password is same as current password
  const isSameAsCurrentPassword = () => {
    return passwordData.current_password && 
           passwordData.new_password && 
           passwordData.current_password === passwordData.new_password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ CHECK: New password cannot be same as current password
    if (isSameAsCurrentPassword()) {
      toast.error('New password must be different from your current password');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!passwordData.current_password) {
      toast.error('Please enter your current password');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      toast.success('Password changed successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4 group"
        >
          <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md mr-4">
            <FaShieldAlt className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Change Password
            </h1>
            <p className="text-gray-600 mt-1">Update your password to keep your account secure</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="current_password"
                value={passwordData.current_password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="Enter your current password"
              />
              <div className="absolute left-4 top-3.5 text-gray-400">
                <FaKey />
              </div>
              <button
                type="button"
                onClick={() => toggleShowPassword('current')}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-blue-600"
              >
                {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="new_password"
                value={passwordData.new_password}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 pl-12 border rounded-lg focus:ring-2 bg-white ${
                  isSameAsCurrentPassword()
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Create a new password"
              />
              <div className="absolute left-4 top-3.5 text-gray-400">
                <FaLock />
              </div>
              <button
                type="button"
                onClick={() => toggleShowPassword('new')}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-blue-600"
              >
                {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            
            {/* ✅ WARNING: Same as current password */}
            {isSameAsCurrentPassword() && (
              <div className="mt-3 flex items-center text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <FaTimes className="mr-2 flex-shrink-0" />
                <span className="text-sm font-medium">
                  New password must be different from your current password
                </span>
              </div>
            )}
            
            
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 pl-12 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white ${
                  passwordData.confirm_password
                    ? passwordData.new_password === passwordData.confirm_password
                      ? 'border-green-500'
                      : 'border-red-500'
                    : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
              />
              <div className="absolute left-4 top-3.5 text-gray-400">
                <FaLock />
              </div>
              <button
                type="button"
                onClick={() => toggleShowPassword('confirm')}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-blue-600"
              >
                {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordData.confirm_password && (
              <div className="mt-3">
                {passwordData.new_password === passwordData.confirm_password ? (
                  <div className="flex items-center text-green-600">
                    <FaCheckCircle className="mr-2" />
                    <span className="text-sm font-medium">Passwords match</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <FaTimes className="mr-2" />
                    <span className="text-sm font-medium">Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={
                loading || 
                passwordData.new_password !== passwordData.confirm_password ||
                isSameAsCurrentPassword()
              }
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Updating Password...
                </>
              ) : (
                <>
                  <FaLock className="mr-2" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>

       
      </div>
    </div>
  );
};

export default ChangePassword;