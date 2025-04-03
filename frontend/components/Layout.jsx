import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import useDoctorAuthStore from '../stores/doctorAuthStore';
import useClientAuthStore from '../stores/clientAuthStore';
import ChatNotificationBadge from './ChatNotificationBadge';
import { FiHome, FiUser, FiLogOut, FiCalendar } from 'react-icons/fi';

const Layout = () => {
  const navigate = useNavigate();
  
  // Get auth state and actions from both stores
  const { isAuthenticated: isDoctorAuthenticated, doctor, logout: doctorLogout } = useDoctorAuthStore();
  const { isAuthenticated: isClientAuthenticated, client, logout: clientLogout } = useClientAuthStore();
  
  // Determine current user and role
  const currentUser = isDoctorAuthenticated ? doctor : client;
  const userRole = isDoctorAuthenticated ? 'doctor' : 'client';
  
  // Handle logout
  const handleLogout = () => {
    if (isDoctorAuthenticated) {
      doctorLogout();
    } else {
      clientLogout();
    }
    navigate('/login');
  };
  
  if (!isDoctorAuthenticated && !isClientAuthenticated) {
    return <Outlet />;
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-800">Health App</h2>
          <p className="text-sm text-gray-500 capitalize">{userRole}</p>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-2">
            {/* Dashboard Link */}
            <Link
              to={`/${userRole}/dashboard`}
              className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50"
            >
              <FiHome className="mr-3" />
              Dashboard
            </Link>
            
            {/* Appointments Link (for both roles) */}
            <Link
              to={`/${userRole}/appointments`}
              className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50"
            >
              <FiCalendar className="mr-3" />
              Appointments
            </Link>
            
            {/* Chat Link with Notification Badge */}
            <Link
              to="/chat"
              className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50"
            >
              <div className="mr-3">
                <ChatNotificationBadge />
              </div>
              Messages
            </Link>
            
            {/* Profile Link */}
            <Link
              to={`/${userRole}/profile`}
              className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50"
            >
              <FiUser className="mr-3" />
              Profile
            </Link>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50"
            >
              <FiLogOut className="mr-3" />
              Logout
            </button>
          </div>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-xl font-semibold capitalize">
              {/* Display page title based on current path */}
              {window.location.pathname.split('/').pop().replace('-', ' ')}
            </h1>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">
                {currentUser?.name || currentUser?.username || currentUser?.email}
              </span>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {(currentUser?.name || currentUser?.username || '?').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;