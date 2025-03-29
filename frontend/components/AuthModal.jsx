import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import DoctorLogin from '../pages/DoctorLogin';
import DoctorSignup from '../pages/DoctorSignup';
import ClientLogin from '../pages/ClientLogin';
import ClientSignup from '../pages/ClientSignup';

const AuthModal = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('client'); // 'client' or 'doctor'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  // Combine the two states to determine which component to show
  const getActiveComponent = () => {
    if (activeTab === 'client') {
      return authMode === 'login' ? <ClientLogin onSuccess={onClose} /> : <ClientSignup onSuccess={() => setAuthMode('login')} />;
    } else {
      return authMode === 'login' ? <DoctorLogin onSuccess={onClose} /> : <DoctorSignup onSuccess={() => setAuthMode('login')} />;
    }
  };

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: 50, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div 
              className={`relative mx-auto max-w-lg rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-xl`}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                className={`absolute right-3 top-3 rounded-full p-1 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Modal Header */}
              <div className="px-6 py-4">
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-primary'}`}>
                  {authMode === 'login' ? 'Welcome Back' : 'Join MediConnect'}
                </h3>
              </div>
              
              {/* User Type Tabs */}
              <div className="flex border-b border-gray-200 px-6">
                <button 
                  className={`py-2 px-4 font-medium transition-colors ${
                    activeTab === 'client' 
                      ? theme === 'dark' 
                        ? 'border-b-2 border-blue-400 text-blue-400' 
                        : 'border-b-2 border-primary text-primary' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('client')}
                >
                  I'm a Patient
                </button>
                <button 
                  className={`py-2 px-4 font-medium transition-colors ${
                    activeTab === 'doctor' 
                      ? theme === 'dark' 
                        ? 'border-b-2 border-blue-400 text-blue-400' 
                        : 'border-b-2 border-primary text-primary' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('doctor')}
                >
                  I'm a Doctor
                </button>
              </div>
              
              {/* Dynamic Content */}
              <div className="p-6">
                {getActiveComponent()}
              </div>
              
              {/* Footer - Switch between login and signup */}
              <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-4 text-center`}>
                {authMode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button 
                      className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-primary hover:text-primary-dark'}`} 
                      onClick={() => setAuthMode('signup')}
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button 
                      className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-primary hover:text-primary-dark'}`} 
                      onClick={() => setAuthMode('login')}
                    >
                      Log in
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;