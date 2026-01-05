import { useSelector } from 'react-redux';

export const useAuth = () => {
  const { user, token, loading } = useSelector((state) => state.auth);
  
  return {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'super_admin' || user?.role === 'school_admin',
    isSuperAdmin: user?.role === 'super_admin'
  };
};