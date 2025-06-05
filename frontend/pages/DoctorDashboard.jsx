import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import DoctorDashboardNavbar from '../components/DoctorDahboardNavbar';
import ChatBot from '../components/ChatBot';
import useDoctorAuthStore from '../store/doctorAuthStore';
const DoctorDashboard = () => {
  const { isAuthenticated, isCheckingAuth, checkAuth } = useDoctorAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        await checkAuth();
      }
      setLoading(false);
    };

    verifyAuth();
  }, [isAuthenticated, checkAuth]);
  if (loading || isCheckingAuth) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }


  return (
    <div>
      <DoctorDashboardNavbar />
      <ChatBot />
    </div>
  );
};

export default DoctorDashboard;