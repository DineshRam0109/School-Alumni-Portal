import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, schoolAdminLogin, clearError } from '../../redux/slices/authSlice';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock, FaGraduationCap, FaUserShield, FaUserTie, FaArrowRight, FaCheckCircle } from 'react-icons/fa';

const Login = () => {
  const [loginType, setLoginType] = useState('alumni');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAnimating(true);
    
    setTimeout(() => {
      if (loginType === 'school_admin') {
        dispatch(schoolAdminLogin(formData));
      } else {
        dispatch(login(formData));
      }
      setIsAnimating(false);
    }, 600);
  };

  const loginTypes = [
    {
      id: 'alumni',
      label: 'Alumni',
      icon: FaGraduationCap,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-500',
      description: 'Connect with your alma mater',
      forgotPasswordPath: '/forgot-password'
    },
    {
      id: 'school_admin',
      label: 'School Admin',
      icon: FaUserTie,
      gradient: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-500',
      description: 'Manage your institution',
      forgotPasswordPath: '/school-admin-forgot-password'
    },
    {
      id: 'super_admin',
      label: 'Super Admin',
      icon: FaUserShield,
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-500',
      description: 'System administration',
      forgotPasswordPath: '/school-admin-forgot-password' // Super admin uses same as school admin
    }
  ];

  const currentType = loginTypes.find(t => t.id === loginType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-20"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden md:block text-white space-y-6 animate-fade-in-left">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center transform hover:scale-110 transition-transform">
                  <FaGraduationCap className="text-4xl" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Alumni Portal</h1>
                  <p className="text-white/80">Stay Connected, Stay Inspired</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              <div className="flex items-start space-x-3 transform hover:translate-x-2 transition-transform">
                <FaCheckCircle className="text-2xl mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Connect with Alumni</h3>
                  <p className="text-white/80">Network with thousands of alumni worldwide</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 transform hover:translate-x-2 transition-transform">
                <FaCheckCircle className="text-2xl mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Career Opportunities</h3>
                  <p className="text-white/80">Access exclusive job postings and mentorship</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 transform hover:translate-x-2 transition-transform">
                <FaCheckCircle className="text-2xl mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Events & Reunions</h3>
                  <p className="text-white/80">Stay updated with alumni gatherings</p>
                </div>
              </div>
            </div>
          </div>

          {/* Made by section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl text-center">
            <p className="text-white/90">Made by</p>
            <p className="text-2xl font-bold mt-2 text-white">Dinesh Ram A</p>
            <p className="text-white/70 text-sm mt-1">Full Stack Developer</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full animate-fade-in-right">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 transform hover:scale-[1.02] transition-transform">
            {/* Header */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${currentType.gradient} rounded-2xl mb-4 transform hover:rotate-12 transition-transform shadow-lg`}>
                <currentType.icon className="text-3xl text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">{currentType.description}</p>
            </div>

            {/* Login Type Selector */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {loginTypes.map((type) => {
                const Icon = type.icon;
                const isActive = loginType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setLoginType(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                      isActive
                        ? `${type.borderColor} ${type.bgColor} shadow-lg`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className={`mx-auto text-2xl mb-2 transition-all ${
                      isActive ? type.textColor : 'text-gray-400'
                    }`} />
                    <p className={`text-xs font-semibold ${
                      isActive ? type.textColor : 'text-gray-600'
                    }`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaEnvelope className={`transition-colors ${
                      formData.email ? currentType.textColor : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className={`transition-colors ${
                      formData.password ? currentType.textColor : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 group-hover:text-gray-900">Remember me</span>
                </label>
                {/* ✅ DYNAMIC FORGOT PASSWORD LINK BASED ON LOGIN TYPE */}
                <Link 
                  to={currentType.forgotPasswordPath}
                  className={`font-semibold ${currentType.textColor} hover:underline`}
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || isAnimating}
                className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl shadow-lg text-white font-semibold bg-gradient-to-r ${currentType.gradient} hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading || isAnimating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <FaArrowRight className="animate-bounce-x" />
                  </>
                )}
              </button>
            </form>

            {loginType === 'alumni' && (
              <p className="mt-6 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Register here
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in-left {
          animation: fade-in-left 0.6s ease-out;
        }
        .animate-fade-in-right {
          animation: fade-in-right 0.6s ease-out;
        }
        .animate-bounce-x {
          animation: bounce-x 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;