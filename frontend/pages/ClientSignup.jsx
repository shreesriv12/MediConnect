import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const ClientSignup = ({ onSuccess }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add your signup logic here
      // const response = await registerClient(formData);
      
      // If successful
      setIsLoading(false);
      onSuccess();
    } catch (err) {
      setIsLoading(false);
      setError('Error creating account. Please try again.');
    }
  };

  return (
    <div>
      <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        Create Patient Account
      </h2>
      
      {error && (
        <div className={`mb-4 p-3 rounded ${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 rounded-md ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                  : 'bg-white text-gray-900 border-gray-300 focus:border-primary'
              } border focus:outline-none focus:ring-1 ${
                theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-primary'
              }`}
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 rounded-md ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                  : 'bg-white text-gray-900 border-gray-300 focus:border-primary'
              } border focus:outline-none focus:ring-1 ${
                theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-primary'
              }`}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="email" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={`w-full px-3 py-2 rounded-md ${
              theme === 'dark' 
                ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                : 'bg-white text-gray-900 border-gray-300 focus:border-primary'
            } border focus:outline-none focus:ring-1 ${
              theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-primary'
            }`}
          />
        </div>
        
        <div>
          <label htmlFor="phone" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className={`w-full px-3 py-2 rounded-md ${
              theme === 'dark' 
                ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                : 'bg-white text-gray-900 border-gray-300 focus:border-primary'
            } border focus:outline-none focus:ring-1 ${
              theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-primary'
            }`}
          />
        </div>
        
        <div>
          <label htmlFor="dateOfBirth" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Date of Birth
          </label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            required
            className={`w-full px-3 py-2 rounded-md ${
              theme === 'dark' 
                ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                : 'bg-white text-gray-900 border-gray-300 focus:border-primary'
            } border focus:outline-none focus:ring-1 ${
              theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-primary'
            }`}
          />
        </div>
        
        <div>
           <label htmlFor="password" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className={`w-full px-3 py-2 rounded-md ${
                        theme === 'dark' 
                          ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                          : 'bg-white text-gray-900 border-gray-300 focus:border-primary'
                      } border focus:outline-none focus:ring-1 ${
                        theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-primary'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className={`w-full px-3 py-2 rounded-md ${
                        theme === 'dark' 
                          ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                          : 'bg-white text-gray-900 border-gray-300 focus:border-primary'
                      } border focus:outline-none focus:ring-1 ${
                        theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-primary'
                      }`}
                    />
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="terms"
                        required
                        className="h-4 w-4 rounded"
                      />
                      <label htmlFor="terms" className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        I agree to the <a href="#" className={theme === 'dark' ? 'text-blue-400' : 'text-primary'}>Terms and Conditions</a> and verify that I am a licensed medical professional.
                      </label>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                      theme === 'dark' 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-primary hover:bg-primary-dark text-white'
                    } transition-colors duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                  </motion.button>
                </form>
              </div>
            );
          };
          
          export default ClientSignup;