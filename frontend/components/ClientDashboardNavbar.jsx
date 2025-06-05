import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import useClientAuthStore from '../store/clientAuthStore';
import '../pages/theme.css';

const ClientDashboardNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { logout, isLoading } = useClientAuthStore();
  
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/ '); // Redirect to login page after successful logout
    }
  };
  
  return (
    <>
      <nav className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-md fixed w-full z-50 transition-colors duration-300`}>
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className={`${theme === 'dark' ? 'text-blue-400' : 'text-primary'} text-2xl font-bold`}>
                    MediConnect <span className="text-sm font-normal">Client Portal</span>
                  </span>
                </motion.div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/clientdashboard" className={`border-transparent ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Dashboard
                </Link>
                <Link to="/bookappointment" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Book Appointment
                </Link>
                <Link to="/clientappointments" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  My Appointments
                </Link>
                  <Link to="/nearby-clinics" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                 Nearby Clinics 
                </Link>
                <Link to="/chat" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Messages
                </Link>
                <Link to="/finddoctors" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Find Doctors
                </Link>
              <Link to="/video-call" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                Video Call
              </Link>
                 <Link to="/medicines-search" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                Search Medicine
              </Link>

              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme Toggle Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-800'}`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </motion.button>
              
              {/* Notification Bell */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              </motion.button>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/clientprofile')}
                  className={`flex items-center space-x-2 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-md p-2`}
                >
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <span className="font-medium">CL</span>
                  </div>
                  <span className="hidden md:inline-block">My Profile</span>
                </motion.button>
              </div>
              
              {/* Logout Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                disabled={isLoading}
                className={`flex items-center space-x-1 ${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'} text-white px-3 py-1 rounded-md transition-colors duration-200`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline-block">Logout</span>
              </motion.button>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center justify-center p-2 rounded-md ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500`}
              >
                <span className="sr-only">Open main menu</span>
                {!isOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className={`sm:hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="pt-2 pb-3 space-y-1">
              <Link to="/clientdashboard" className={`${theme === 'dark' ? 'bg-gray-900 border-blue-500 text-white' : 'bg-primary-light border-primary text-primary-dark'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Dashboard
              </Link>
              <Link to="/bookappointment" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Book Appointment
              </Link>
              <Link to="/clientappointments" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                My Appointments
              </Link>
              <Link to="/clientmessages" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Messages
              </Link>
                 <Link to="/clientmessages" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Messages
              </Link>
              <Link to="/finddoctors" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Find Doctors
              </Link>
              <Link to="/clientprofile" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                My Profile
              </Link>
            
              {/* Logout option for mobile */}
              <button 
                onClick={handleLogout}
                disabled={isLoading}
                className={`w-full text-left border-transparent ${theme === 'dark' ? 'text-red-300 hover:bg-red-900 hover:border-red-700 hover:text-white' : 'text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Logout
              </button>
              {/* Theme toggle button for mobile */}
              <div className="flex items-center pl-3 py-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-800'}`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default ClientDashboardNavbar;