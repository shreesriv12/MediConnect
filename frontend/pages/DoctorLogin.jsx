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
    <div className="w-full space-y-4 sm:space-y-6">
      {error && (
        <div className={`p-3 rounded-lg ${
          theme === 'dark' ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
        }`} role="alert">
          <span className="block text-sm">{error}</span>
        </div>
      )}
        
        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className={`block mb-1.5 sm:mb-2 text-sm font-medium ${
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
                className={`w-full px-3 py-2 text-sm rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                } border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                  formErrors.email 
                    ? 'border-red-500' 
                    : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                }`}
                placeholder="Email address"
              />
              {formErrors.email && <p className="mt-1 text-red-500 text-xs">{formErrors.email}</p>}
            </div>
            
            <div>
              <label htmlFor="password" className={`block mb-1.5 sm:mb-2 text-sm font-medium ${
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
                className={`w-full px-3 py-2 text-sm rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                } border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                  formErrors.password 
                    ? 'border-red-500' 
                    : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                }`}
                placeholder="Password"
              />
              {formErrors.password && <p className="mt-1 text-red-500 text-xs">{formErrors.password}</p>}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
              theme === 'dark'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </motion.button>
        </form>
      </div>
    );
};

export default DoctorLogin;