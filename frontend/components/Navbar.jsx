import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import AuthModal from './AuthModal'; // Import the new modal component
import '../pages/theme.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false); // New state for the modal
  
  return (
    <>
      <nav className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-md fixed w-full z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className={`${theme === 'dark' ? 'text-blue-400' : 'text-primary'} text-2xl font-bold`}>MediConnect</span>
                </motion.div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="#home" className={`border-transparent ${theme === 'dark' ? 'text-white' : 'text-gray-900'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Home
                </a>
                <a href="#services" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Services
                </a>
                <a href="#about" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  About Us
                </a>
                <a href="#contact" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Contact
                </a>
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
              
              {/* Book Appointment Button - Updated to open modal */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${theme === 'dark' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-primary hover:bg-primary-dark'} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300`}
                onClick={() => setIsModalOpen(true)} // Open the modal on click
              >
                Book Appointment
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
              <a href="#home" className={`${theme === 'dark' ? 'bg-gray-900 border-blue-500 text-white' : 'bg-primary-light border-primary text-primary-dark'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Home
              </a>
              <a href="#services" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Services
              </a>
              <a href="#about" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                About Us
              </a>
              <a href="#contact" className={`border-transparent ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Contact
              </a>
              {/* Add Book Appointment button for mobile */}
              <div className="pl-3 pr-4 py-2">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={`w-full ${theme === 'dark' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-primary hover:bg-primary-dark'} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300`}
                >
                  Book Appointment
                </button>
              </div>
              {/* Add theme toggle button for mobile */}
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

      {/* Auth Modal */}
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Navbar;