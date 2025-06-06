import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DoctorDashboardNavbar from '../components/DoctorDahboardNavbar';
import ChatBot from '../components/ChatBot';
import useDoctorAuthStore from '../store/doctorAuthStore';
import { useTheme } from '../context/ThemeContext';

const DoctorDashboard = () => {
  const { isAuthenticated, isCheckingAuth, checkAuth } = useDoctorAuthStore();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        await checkAuth();
      }
      setLoading(false);
    };

    verifyAuth();
  }, [isAuthenticated, checkAuth]);

  useEffect(() => {
    // Hide welcome animation after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || isCheckingAuth) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  // Welcome Animation Screen
  if (showWelcome) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-blue-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center"
        >
          <motion.h1
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className={`text-6xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
          >
            Welcome to
          </motion.h1>
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex items-center justify-center"
          >
            <span className="text-7xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              MediConnect
            </span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className={`text-xl mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Doctor Portal
          </motion.p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="mt-8"
          >
            <div className="animate-pulse">
              <div className="h-2 w-32 bg-blue-500 rounded-full mx-auto"></div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const dashboardCards = [
    {
      title: "My Schedule",
      description: "View and manage your daily appointments and availability",
      icon: "📅",
      link: "/doctorschedule",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Appointments",
      description: "Manage patient appointments and consultations",
      icon: "🏥",
      link: "/doctorappointments",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Messages",
      description: "Communicate with patients and colleagues",
      icon: "💬",
      link: "/chat",
      color: "from-purple-500 to-purple-600"
    },
   
    {
      title: "Video Call",
      description: "Conduct virtual consultations with patients",
      icon: "📹",
      link: "/video-call",
      color: "from-red-500 to-red-600"
    },
    {
      title: "My Profile",
      description: "Update your professional information and settings",
      icon: "👨‍⚕️",
      link: "/doctorprofile",
      color: "from-indigo-500 to-indigo-600"
    }
  ];

  const quickStats = [
    { label: "Today's Appointments", value: "12", icon: "📋" },
    { label: "Pending Messages", value: "5", icon: "📨" },
    { label: "Video Calls", value: "3", icon: "📞" },
    { label: "New Patients", value: "8", icon: "👤" }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <DoctorDashboardNavbar />
      
      {/* Main Content */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Doctor Dashboard
          </h1>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Welcome back! Here's what's happening with your practice today.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {quickStats.map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className={`p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Dashboard Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          {dashboardCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="group"
            >
              <Link to={card.link}>
                <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700 hover:border-gray-600' : 'bg-white border border-gray-200 hover:shadow-xl'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{card.icon}</div>
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition-opacity`}></div>
                  </div>
                  <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {card.title}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {card.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-500 text-sm font-medium group-hover:text-blue-600 transition-colors">
                    <span>Access {card.title}</span>
                    <svg className="ml-1 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Activity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className={`rounded-xl shadow-lg p-6 mb-8 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        >
          <h2 className={`text-2xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Recent Activity
          </h2>
          <div className="space-y-4">
            {[
              { action: "New appointment booked", time: "2 hours ago", icon: "📅" },
              { action: "Message from Patient John Doe", time: "3 hours ago", icon: "💬" },
              { action: "Video consultation completed", time: "5 hours ago", icon: "📹" },
              { action: "Profile updated", time: "1 day ago", icon: "👨‍⚕️" }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1">
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {activity.action}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <ChatBot />
    </div>
  );
};

export default DoctorDashboard;