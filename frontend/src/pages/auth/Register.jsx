import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, clearError } from '../../redux/slices/authSlice';
import { schoolService } from '../../services/schoolService';
import { toast } from 'react-toastify';
import { FaGraduationCap, FaMapMarkerAlt, FaUser, FaEnvelope, FaLock, FaPhone, FaSchool, FaCalendar, FaCheckCircle, FaArrowRight, FaArrowLeft } from 'react-icons/fa';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    current_city: '',
    current_country: '',
    school_id: '',
    start_year: '',
    end_year: '',
    degree_level: 'secondary'
  });

  const [schools, setSchools] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchSchools();
  }, []);

  // CRITICAL FIX: Proper token and user check
  useEffect(() => {
    if (token && user) {
      console.log('Registration successful, redirecting to dashboard...');
      toast.success('Registration successful! Welcome aboard! 🎉');
      
      // Determine redirect based on role
      const redirectPath = 
        user.role === 'super_admin' ? '/super-admin/dashboard' :
        user.role === 'school_admin' ? '/school-admin/dashboard' :
        '/dashboard';
      
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 100);
    }
  }, [token, user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const fetchSchools = async () => {
    try {
      const response = await schoolService.getAllSchools({ limit: 1000 });
      setSchools(response.data.schools || []);
    } catch (error) {
      toast.error('Failed to fetch schools');
      console.error('Fetch schools error:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.email) {
        toast.error('Please fill all required fields');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        toast.error('Please enter a valid email');
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.password || !formData.confirm_password) {
        toast.error('Please fill all password fields');
        return false;
      }
      if (formData.password !== formData.confirm_password) {
        toast.error('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return false;
      }
      if (!formData.current_city || !formData.current_country) {
        toast.error('Please provide your current location');
        return false;
      }
    }
    
    if (step === 3) {
      if (!formData.school_id || !formData.start_year || !formData.end_year) {
        toast.error('Please fill all education fields');
        return false;
      }
      const startYear = parseInt(formData.start_year);
      const endYear = parseInt(formData.end_year);
      if (endYear < startYear) {
        toast.error('End year must be after start year');
        return false;
      }
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    
    // Remove confirm_password before submission
    const { confirm_password, ...submitData } = formData;
    
    console.log('Submitting registration data:', submitData);
    
    // Dispatch registration action
    dispatch(register(submitData));
  };

  const steps = [
    { number: 1, title: 'Personal Info', icon: FaUser },
    { number: 2, title: 'Security & Location', icon: FaLock },
    { number: 3, title: 'Education', icon: FaSchool }
  ];

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    
    return { strength, label: labels[strength - 1] || '', color: colors[strength - 1] || '' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[FaGraduationCap, FaSchool, FaUser, FaMapMarkerAlt].map((Icon, i) => (
          <Icon
            key={i}
            className="absolute text-white opacity-10 animate-float"
            style={{
              fontSize: Math.random() * 30 + 20 + 'px',
              top: Math.random() * 80 + 10 + '%',
              left: Math.random() * 80 + 10 + '%',
              animationDelay: `${i * 2}s`,
              animationDuration: `${Math.random() * 5 + 10}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-5">
            {/* Left Sidebar - Progress */}
            <div className="md:col-span-2 bg-gradient-to-br from-purple-600 to-pink-600 p-8 text-white">
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center">
                    <FaGraduationCap className="text-2xl" />
                  </div>
                  <h1 className="text-2xl font-bold">Join Us</h1>
                </div>
                <p className="text-white/80 text-sm">Become part of our alumni community</p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-6 mb-8">
                {steps.map((s, index) => {
                  const Icon = s.icon;
                  const isCompleted = step > s.number;
                  const isCurrent = step === s.number;
                  
                  return (
                    <div key={s.number} className="relative">
                      {index !== steps.length - 1 && (
                        <div className={`absolute left-5 top-12 w-0.5 h-12 ${
                          isCompleted ? 'bg-white' : 'bg-white/30'
                        }`}></div>
                      )}
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-white text-purple-600 shadow-lg'
                            : isCurrent
                            ? 'bg-white/20 border-2 border-white shadow-lg scale-110'
                            : 'bg-white/10 border border-white/30'
                        }`}>
                          {isCompleted ? (
                            <FaCheckCircle className="text-lg" />
                          ) : (
                            <Icon className="text-lg" />
                          )}
                        </div>
                        <div className={`transition-opacity ${
                          isCurrent ? 'opacity-100' : 'opacity-60'
                        }`}>
                          <p className={`font-semibold ${isCurrent ? 'text-lg' : 'text-sm'}`}>
                            {s.title}
                          </p>
                          <p className="text-xs text-white/70">Step {s.number} of 3</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Benefits */}
              <div className="space-y-3 pt-6 border-t border-white/20">
                <p className="font-semibold mb-3">What you'll get:</p>
                {[
                  'Connect with alumni worldwide',
                  'Access exclusive job opportunities',
                  'Attend networking events',
                  'Mentorship programs'
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center space-x-2 text-sm">
                    <FaCheckCircle className="flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="md:col-span-3 p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Personal Info */}
                {step === 1 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
                      <p className="text-gray-600 text-sm">Let's start with the basics</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          required
                          className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          required
                          className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="john.doe@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <FaPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Security & Location */}
                {step === 2 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Security & Location</h2>
                      <p className="text-gray-600 text-sm">Secure your account and tell us where you are</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          className="block w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      {formData.password && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">Password strength:</span>
                            <span className={`font-semibold ${
                              passwordStrength.strength >= 3 ? 'text-green-600' : 
                              passwordStrength.strength >= 2 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${passwordStrength.color} transition-all`}
                              style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                          required
                          className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center mb-3">
                        <FaMapMarkerAlt className="text-purple-600 mr-2" />
                        <h3 className="font-semibold text-gray-900">Current Location *</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            name="current_city"
                            value={formData.current_city}
                            onChange={handleChange}
                            required
                            className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="Mumbai"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Country
                          </label>
                          <input
                            type="text"
                            name="current_country"
                            value={formData.current_country}
                            onChange={handleChange}
                            required
                            className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="India"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Education */}
                {step === 3 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Education Details</h2>
                      <p className="text-gray-600 text-sm">Tell us about your academic background</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        School / Institution *
                      </label>
                      <div className="relative">
                        <FaSchool className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <select
                          name="school_id"
                          value={formData.school_id}
                          onChange={handleChange}
                          required
                          className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white"
                        >
                          <option value="">Select your school</option>
                          {schools.map((school) => (
                            <option key={school.school_id} value={school.school_id}>
                              {school.school_name} {school.city ? `- ${school.city}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Degree Level *
                      </label>
                      <select
                        name="degree_level"
                        value={formData.degree_level}
                        onChange={handleChange}
                        required
                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="higher_secondary">Higher Secondary</option>
                        <option value="diploma">Diploma</option>
                        <option value="undergraduate">Undergraduate</option>
                        <option value="postgraduate">Postgraduate</option>
                        <option value="doctorate">Doctorate</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Start Year *
                        </label>
                        <div className="relative">
                          <FaCalendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            name="start_year"
                            value={formData.start_year}
                            onChange={handleChange}
                            required
                            min="1950"
                            max={new Date().getFullYear()}
                            className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="2015"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          End Year *
                        </label>
                        <div className="relative">
                          <FaCalendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            name="end_year"
                            value={formData.end_year}
                            onChange={handleChange}
                            required
                            min="1950"
                            max={new Date().getFullYear() + 10}
                            className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="2020"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      <FaArrowLeft />
                      <span>Back</span>
                    </button>
                  ) : (
                    <Link
  to="/login"
  className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors duration-200 font-medium"
>
  Already have an account?
</Link>
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                      <span>Next</span>
                      <FaArrowRight />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle />
                          <span>Create Account</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Register;