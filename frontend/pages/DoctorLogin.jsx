import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useDoctorAuthStore from '../store/doctorAuthStore';
import { useTheme } from '../context/ThemeContext';

const DoctorLogin = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { login, doctor, error, isLoading, clearError } = useDoctorAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [formErrors, setFormErrors] = useState({});

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (doctor) {
      navigate('/doctordashboard');
    }
  }, [doctor, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Pass credentials as a single object instead of separate parameters
    const result = await login({
      email: formData.email,
      password: formData.password
    });
    
    if (result.success) {
      navigate('/doctordashboard'); // Also fixed the route to match the useEffect check
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 rounded-lg shadow-md ${
      theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    }`}>
      <div className={`max-w-md w-full space-y-8 p-8 rounded-xl shadow-md ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Doctor Login
          </h2>
          <p className={`mt-2 text-center text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Access your doctor dashboard
          </p>
        </div>
        
        {error && (
          <div className={`p-3 rounded ${
            theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
          }`} role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={`block mb-2 text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                } border focus:outline-none focus:ring-1 ${
                  formErrors.email 
                    ? theme === 'dark' ? 'border-red-500' : 'border-red-500' 
                    : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                }`}
                placeholder="Email address"
              />
              {formErrors.email && <p className="mt-1 text-red-500 text-xs">{formErrors.email}</p>}
            </div>
            
            <div>
              <label htmlFor="password" className={`block mb-2 text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                } border focus:outline-none focus:ring-1 ${
                  formErrors.password 
                    ? theme === 'dark' ? 'border-red-500' : 'border-red-500' 
                    : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                }`}
                placeholder="Password"
              />
              {formErrors.password && <p className="mt-1 text-red-500 text-xs">{formErrors.password}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded"
              />
              <label htmlFor="remember-me" className={`ml-2 text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="/forgot-password" className={`font-medium ${
                theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
              }`}>
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                theme === 'dark'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </motion.button>
          </div>
          
        
        </form>
      </div>
    </div>
  );
};

export default DoctorLogin;