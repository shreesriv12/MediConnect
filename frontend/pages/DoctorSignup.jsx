import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const DoctorSignup = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    experience: '',
    degree: '',
    age: '',
    gender: 'male',
    avatar: null
  });
  
  const [avatarPreview, setAvatarPreview] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        avatar: file
      });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
    
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone)) errors.phone = 'Phone must be 10 digits';
    
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.specialization) errors.specialization = 'Specialization is required';
    if (!formData.experience) errors.experience = 'Experience is required';
    if (!formData.degree) errors.degree = 'Degree is required';
    
    if (!formData.age) errors.age = 'Age is required';
    else if (formData.age < 20 || formData.age > 100) errors.age = 'Age must be between 20 and 100';
    
    if (!formData.avatar) errors.avatar = 'Profile picture is required';
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create FormData for file upload
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'confirmPassword' && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });
      
      // Simulate successful registration
      setDoctorId("DOCTOR123");
      setShowOtpModal(true);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError('Registration failed. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setFormErrors({
        ...formErrors,
        otp: 'Please enter a valid 6-digit OTP'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful verification
      setIsLoading(false);
      navigate('/doctor/dashboard');
    } catch (err) {
      setIsLoading(false);
      setFormErrors({
        ...formErrors,
        otp: 'Invalid OTP. Please try again.'
      });
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 rounded-lg shadow-md ${
      theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    }`}>
      <h2 className={`text-2xl font-bold text-center mb-6 ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>Doctor Registration</h2>
      
      {error && (
        <div className={`mb-4 p-3 rounded ${
          theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
        }`}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Personal Information */}
          <div>
            <h3 className={`text-lg font-medium mb-3 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Personal Information</h3>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.name ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="Dr. John Doe"
              />
              {formErrors.name && <p className="mt-1 text-red-500 text-sm">{formErrors.name}</p>}
            </div>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.email ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="doctor@example.com"
              />
              {formErrors.email && <p className="mt-1 text-red-500 text-sm">{formErrors.email}</p>}
            </div>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.phone ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="1234567890"
              />
              {formErrors.phone && <p className="mt-1 text-red-500 text-sm">{formErrors.phone}</p>}
            </div>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.age ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="35"
              />
              {formErrors.age && <p className="mt-1 text-red-500 text-sm">{formErrors.age}</p>}
            </div>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                }`}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          {/* Professional Information & Security */}
          <div>
            <h3 className={`text-lg font-medium mb-3 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Professional Information</h3>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.specialization ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="Cardiology"
              />
              {formErrors.specialization && <p className="mt-1 text-red-500 text-sm">{formErrors.specialization}</p>}
            </div>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Experience (years)</label>
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.experience ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="10"
              />
              {formErrors.experience && <p className="mt-1 text-red-500 text-sm">{formErrors.experience}</p>}
            </div>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Degree</label>
              <input
                type="text"
                name="degree"
                value={formData.degree}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.degree ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="MD, MBBS"
              />
              {formErrors.degree && <p className="mt-1 text-red-500 text-sm">{formErrors.degree}</p>}
            </div>
            
            <h3 className={`text-lg font-medium mb-3 mt-6 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Security</h3>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.password ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
              />
              {formErrors.password && <p className="mt-1 text-red-500 text-sm">{formErrors.password}</p>}
            </div>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.confirmPassword ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
              />
              {formErrors.confirmPassword && <p className="mt-1 text-red-500 text-sm">{formErrors.confirmPassword}</p>}
            </div>
          </div>
        </div>
        
        {/* Avatar Upload */}
        <div className="mb-6 mt-4">
          <label className={`block mb-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>Profile Picture</label>
          <div className="flex items-center">
            {avatarPreview && (
              <div className={`w-24 h-24 rounded-full overflow-hidden mr-4 ${
                theme === 'dark' ? 'border border-gray-600' : 'border border-gray-300'
              }`}>
                <img 
                  src={avatarPreview} 
                  alt="Avatar preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <input
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label 
                htmlFor="avatar"
                className={`px-4 py-2 rounded cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-blue-400 hover:bg-gray-600' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                Select Image
              </label>
              {formErrors.avatar && <p className="mt-1 text-red-500 text-sm">{formErrors.avatar}</p>}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium ${
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } transition-colors duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </motion.button>
        </div>
        
      
      </form>
      
      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-md w-full ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>Verify Your Phone</h3>
            <p className={`mb-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              We've sent a 6-digit OTP to your phone number. Please enter it below to verify your account.
            </p>
            
            <div className="mb-4">
              <label className={`block mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={`w-full px-4 py-2 rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                } border focus:outline-none focus:ring-1 ${
                  theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                } ${formErrors.otp ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
              />
              {formErrors.otp && <p className="mt-1 text-red-500 text-sm">{formErrors.otp}</p>}
            </div>
            
            <div className="flex justify-between">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowOtpModal(false)}
                className={`px-4 py-2 rounded ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerifyOtp}
                disabled={isLoading}
                className={`px-4 py-2 rounded ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </motion.button>
            </div>
            
            <div className="mt-4 text-center">
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Didn't receive the OTP?{' '}
                <button 
                  type="button"
                  className={`${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  } hover:underline`}
                  onClick={() => {
                    // Simulated resend functionality
                    alert('OTP resent to your phone number.');
                  }}
                >
                  Resend
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSignup;