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
        <div className="fixed inset-0 z-50 overflow-y-auto pt-4">
          {/* Backdrop */}
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <div className="flex min-h-screen sm:min-h-auto sm:items-center sm:justify-center p-3 sm:p-4">
            <motion.div 
              className={`relative w-full sm:max-w-xl max-h-[90vh] sm:max-h-none rounded-lg overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-xl`}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
                exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                className={`sticky top-3 right-3 z-10 rounded-full p-1 ml-auto block ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-colors`}
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  {authMode === 'login' ? 'Welcome Back' : 'Join MediConnect'}
                </h3>
              </div>
              
              {/* User Type Tabs */}
              <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} px-4 sm:px-6`}>
                <button 
                  className={`py-3 px-3 sm:px-4 text-sm sm:text-base font-medium transition-colors flex-1 text-center ${
                    activeTab === 'client' 
                      ? theme === 'dark' 
                        ? 'border-b-2 border-blue-400 text-blue-400' 
                        : 'border-b-2 border-blue-600 text-blue-600' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab('client')}
                >
                  Patient
                </button>
                <button 
                  className={`py-3 px-3 sm:px-4 text-sm sm:text-base font-medium transition-colors flex-1 text-center ${
                    activeTab === 'doctor' 
                      ? theme === 'dark' 
                        ? 'border-b-2 border-blue-400 text-blue-400' 
                        : 'border-b-2 border-blue-600 text-blue-600' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab('doctor')}
                >
                  Doctor
                </button>
              </div>
              
              {/* Dynamic Content - Scrollable */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto max-h-[calc(90vh-200px)] sm:max-h-none">
                {getActiveComponent()}
              </div>
              
              {/* Footer - Switch between login and signup */}
              <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-3 sm:p-4 text-center sticky bottom-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                {authMode === 'login' ? (
                  <p className="text-sm sm:text-base">
                    Don't have an account?{' '}
                    <button 
                      className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`} 
                      onClick={() => setAuthMode('signup')}
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-sm sm:text-base">
                    Already have an account?{' '}
                    <button 
                      className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`} 
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