import React from 'react'
import ChatBot from '../components/ChatBot'
import ClientDashboardNavbar from '../components/ClientDashboardNavbar'
import { Navigate } from 'react-router-dom';
import useClientAuthStore from '../store/clientAuthStore';
import { useState,useEffect } from 'react'

const ClientDashboard = () => {
  const { isAuthenticated, isCheckingAuth, checkAuth } = useClientAuthStore();
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
      <ClientDashboardNavbar />
      <ChatBot />
    </div>
  );
};

export default ClientDashboard
