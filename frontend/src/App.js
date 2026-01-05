import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './redux/store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

// Alumni Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/auth/ChangePassword';
import AlumniDirectory from './pages/AlumniDirectory';
import Connections from './pages/Connections';
import Messages from './pages/Messages';
import GroupChat from './pages/GroupChat';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import CreateEvent from './pages/CreateEvent';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import PostJob from './pages/PostJob';
import Schools from './pages/Schools';
import SchoolDetails from './pages/SchoolDetails';
import Notifications from './pages/Notifications';
import Companies from './pages/Companies';
import CompanyDetails from './pages/CompanyDetails';
import BatchView from './pages/BatchView';
import Mentorship from './pages/Mentorship';

// School Admin Pages
import SchoolAdmin from './pages/SchoolAdmin';
import VerifyAlumni from './pages/VerifyAlumni';
import SchoolAdminAnalytics from './pages/SchoolAdminAnalytics';
import SchoolAdminReports from './pages/SchoolAdminReports';
import SchoolAdminProfile from './pages/SchoolAdminProfile';

// Super Admin Pages
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ManageSchoolAdmins from './pages/ManageSchoolAdmins';
import Analytics from './pages/Analytics';
import ManageSchools from './pages/ManageSchools';
import Reports from './pages/Reports';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { token, user } = useSelector((state) => state.auth);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      switch (user.role) {
        case 'super_admin':
          return <Navigate to="/super-admin/dashboard" replace />;
        case 'school_admin':
          return <Navigate to="/school-admin/dashboard" replace />;
        default:
          return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { token, user } = useSelector((state) => state.auth);

  if (token && user) {
    switch (user.role) {
      case 'super_admin':
        return <Navigate to="/super-admin/dashboard" replace />;
      case 'school_admin':
        return <Navigate to="/school-admin/dashboard" replace />;
      case 'alumni':
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          
          {/* ✅ FORGOT PASSWORD ROUTES - BOTH USE SAME COMPONENT */}
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/school-admin-forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    {/* Common Routes */}
                    <Route path="/profile/:id" element={<Profile />} />
                    <Route path="/school-admin/profile/:id" element={<SchoolAdminProfile />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/schools/:id/batches" element={<BatchView />} />

                    {/* Alumni Routes */}
                    <Route 
                      path="/dashboard" 
                      element={<ProtectedRoute allowedRoles={['alumni']}><Dashboard /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/edit-profile" 
                      element={<ProtectedRoute allowedRoles={['alumni']}><EditProfile /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/connections" 
                      element={<ProtectedRoute allowedRoles={['alumni']}><Connections /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/mentorship" 
                      element={<ProtectedRoute allowedRoles={['alumni']}><Mentorship /></ProtectedRoute>} 
                    />

                    {/* Shared Routes */}
                    <Route 
                      path="/alumni" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin']}><AlumniDirectory /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/messages" 
                      element={<ProtectedRoute allowedRoles={['alumni']}><Messages /></ProtectedRoute>}
                    />
                    <Route 
                      path="/groups" 
                      element={<ProtectedRoute allowedRoles={['alumni']}><GroupChat /></ProtectedRoute>}
                    />
                    
                    {/* Events Routes */}
                    <Route 
                      path="/events" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><Events /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/events/:id" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><EventDetails /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/create-event" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin']}><CreateEvent /></ProtectedRoute>} 
                    />

                    {/* Jobs Routes */}
                    <Route 
                      path="/jobs" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><Jobs /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/jobs/:id" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><JobDetails /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/post-job" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin']}><PostJob /></ProtectedRoute>} 
                    />
                    
                    {/* Schools Routes */}
                    <Route 
                      path="/schools" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><Schools /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/schools/:id" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><SchoolDetails /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/schools/:id/analytics" 
                      element={<ProtectedRoute allowedRoles={['school_admin', 'super_admin']}><SchoolAdminAnalytics /></ProtectedRoute>} 
                    />
                    
                    {/* Companies Routes */}
                    <Route 
                      path="/companies" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><Companies /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/companies/:companyName" 
                      element={<ProtectedRoute allowedRoles={['alumni', 'school_admin', 'super_admin']}><CompanyDetails /></ProtectedRoute>} 
                    />

                    {/* School Admin Routes */}
                    <Route 
                      path="/school-admin/dashboard" 
                      element={<ProtectedRoute allowedRoles={['school_admin']}><SchoolAdmin /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/school-admin/analytics" 
                      element={<ProtectedRoute allowedRoles={['school_admin', 'super_admin']}><SchoolAdminAnalytics /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/school-admin/reports" 
                      element={<ProtectedRoute allowedRoles={['school_admin']}><SchoolAdminReports /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/school-admin/verify" 
                      element={<ProtectedRoute allowedRoles={['school_admin']}><VerifyAlumni /></ProtectedRoute>} 
                    />

                    {/* Super Admin Routes */}
                    <Route 
                      path="/super-admin/dashboard" 
                      element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/super-admin/reports" 
                      element={<ProtectedRoute allowedRoles={['super_admin']}><Reports /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/super-admin/school-admins" 
                      element={<ProtectedRoute allowedRoles={['super_admin']}><ManageSchoolAdmins /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/super-admin/schools" 
                      element={<ProtectedRoute allowedRoles={['super_admin']}><ManageSchools /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/super-admin/alumni" 
                      element={<ProtectedRoute allowedRoles={['super_admin']}><AlumniDirectory /></ProtectedRoute>} 
                    />
                    <Route 
                      path="/analytics" 
                      element={<ProtectedRoute allowedRoles={['super_admin']}><Analytics /></ProtectedRoute>} 
                    />

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;