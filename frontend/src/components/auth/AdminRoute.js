import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const AdminRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  
  if (!user || (user.role !== 'super_admin' && user.role !== 'school_admin')) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default AdminRoute;
