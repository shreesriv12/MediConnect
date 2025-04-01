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
  const [verificationStep, setVerificationStep] = useState('signup'); // signup, verify-otp
  const [otp, setOtp] = useState('');
  const [clientId, setClientId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
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
      // Send signup data to API
      // This would make a request to your backend API
      const response = await fetch('/clients/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error creating account');
      }
      
      // If successful, move to OTP verification step
      setClientId(data.data._id);
      setVerificationStep('verify-otp');
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Error creating account. Please try again.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Call API to verify OTP
      const response = await fetch('/api/clients/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          otp,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }
      
      // If OTP verification successful
      setIsLoading(false);
      onSuccess();
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'OTP verification failed. Please try again.');
    }
  };

  const resendOtp = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      // API call to resend OTP
      const response = await fetch('/clients/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }
      
      setIsLoading(false);
      // Show success message for OTP resend
      setError('OTP resent successfully');
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Failed to resend OTP. Please try again.');
    }
  };

  // Render OTP verification form
  if (verificationStep === 'verify-otp') {
    return (
      <div>
        <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Verify Your Phone Number
        </h2>
        
        <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          We've sent a verification code to your phone number. Please enter it below to complete your registration.
        </p>
        
        {error && (
          <div className={`mb-4 p-3 rounded ${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label htmlFor="otp" className={`block mb-1 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Verification Code
            </label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit code"
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
          
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                theme === 'dark' 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-primary hover:bg-primary-dark text-white'
              } transition-colors duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={resendOtp}
              disabled={isLoading}
              className={`py-2 px-4 rounded-md font-medium ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } transition-colors duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              Resend Code
            </motion.button>
          </div>
        </form>
      </div>
    );
  }

  // Render signup form
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
              I agree to the <a href="#" className={theme === 'dark' ? 'text-blue-400' : 'text-primary'}>Terms and Conditions</a>
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