import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import useDoctorAuthStore from '../store/doctorAuthStore';

const DoctorSignup = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // Get store functions and state
  const { register, verifyOtp, verifyEmail, isLoading, error, clearError } = useDoctorAuthStore();
  
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
    gender: 'Male',
    avatar: null
  });
  
  const [avatarPreview, setAvatarPreview] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [otp, setOtp] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [storeError, setStoreError] = useState('');
  const [verificationMethod, setVerificationMethod] = useState('email'); // 'email' or 'phone'
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value.trim(), // Trim whitespace from user input
    }));
  };
  
const handleFileChange = (e) => {
  const file = e.target.files[0];
  console.log('handleFileChange triggered, file:', file); // Log the selected file

  if (file) {
    setFormData({
      ...formData,
      avatar: file
    });
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      console.log('Avatar preview set');
    };
    reader.readAsDataURL(file);
  } else {
    console.warn('No file selected');
  }
};

const validateForm = () => {
  const errors = {};
  
  if (!formData.name.trim()) errors.name = 'Name is required';
  if (!formData.email.trim()) errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
  
  if (!formData.phone.trim()) errors.phone = 'Phone number is required';
  else if (!/^\+91\d{10}$/.test(formData.phone)) {
    errors.phone = 'Phone number must be in the format +91XXXXXXXXXX';
  }
      
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
  
  if (!formData.avatar) {
    errors.avatar = 'Profile picture is required';
    console.error('Validation error: avatar is missing');
  }
  
  console.log('Validation errors:', errors);
  return errors;
};

const handleSubmit = async (e) => {
  e.preventDefault();
  clearError();
  setStoreError('');
  
  console.log('Submitting form with data:', formData);
  
  const errors = validateForm();
  if (Object.keys(errors).length > 0) {
    console.warn('Form validation failed:', errors);
    setFormErrors(errors);
    return;
  }
  
  // Create FormData for file upload
  const data = new FormData();
  console.log("Sending FormData:");
for (let [key, value] of data.entries()) {
  console.log(`${key}:`, value);
  if (key === 'avatar') {
    console.log('avatar is File?', value instanceof File);
    console.log('avatar name:', value.name);
  }
}
  Object.keys(formData).forEach(key => {
    if (key !== 'confirmPassword' && formData[key] !== null) {
      data.append(key, formData[key]);
    }
  });
  console.log('FormData entries:', Array.from(data.entries()));

  try {
    const result = await register(data);
    console.log('Register API result:', result);
    
    if (result.success) {
      setDoctorId(result.doctorId);
      setShowVerificationModal(true);
    } else {
      setStoreError(result.error || 'Registration failed. Please try again.');
    }
  } catch (err) {
    console.error('Registration error:', err);
    setStoreError('Registration failed. Please try again.');
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
    
    clearError();
    setStoreError('');
    
    try {
      const result = await verifyOtp(doctorId, otp);
      console.log(doctorId);
      console.log(otp);
      if (result.success) {
        navigate('/doctordashboard');
      } else {
        setFormErrors({
          ...formErrors,
          otp: result.error || 'Invalid OTP. Please try again.'
        });
      }
    } catch (err) {
      setFormErrors({
        ...formErrors,
        otp: 'Error verifying OTP. Please try again.'
      });
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode || emailCode.length !== 6) {
      setFormErrors({
        ...formErrors,
        emailCode: "Please enter a valid 6-digit verification code",
      });
      return;
    }
  
    clearError();
    setStoreError("");
  
    try {
      console.log("Verifying:", formData.email, emailCode);

      const result = await verifyEmail(formData.email, emailCode);
      if (result.success) {
        navigate("/doctordashboard");
      } else {
        setFormErrors({
          ...formErrors,
          emailCode: result.error || "Invalid verification code. Please try again.",
        });
      }
    } catch (err) {
      setFormErrors({
        ...formErrors,
        emailCode: "Error verifying email. Please try again.",
      });
    }
  };

  const handleVerify = () => {
    if (verificationMethod === 'phone') {
      handleVerifyOtp();
    } else {
      handleVerifyEmail();
    }
  };

  // Display error from store or local state
  const displayError = storeError || error;

  return (
    <div className={`max-w-4xl mx-auto p-6 rounded-lg shadow-md ${
      theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    }`}>
      <h2 className={`text-2xl font-bold text-center mb-6 ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}>Doctor Registration</h2>
      
      {displayError && (
        <div className={`mb-4 p-3 rounded ${
          theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
        }`}>
          {displayError}
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
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
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
      
      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-md w-full ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>Verify Your Account</h3>
            
            {/* Verification method tabs */}
            <div className="flex mb-6 border-b border-gray-600">
              <button
                onClick={() => setVerificationMethod('email')}
                className={`flex-1 py-2 px-4 text-center ${
                  verificationMethod === 'email' 
                    ? theme === 'dark' 
                      ? 'bg-gray-700 border-b-2 border-blue-500' 
                      : 'bg-gray-100 border-b-2 border-blue-600'
                    : ''
                }`}
              >
                Email Verification
              </button>
              <button
                onClick={() => setVerificationMethod('phone')}
                className={`flex-1 py-2 px-4 text-center ${
                  verificationMethod === 'phone' 
                    ? theme === 'dark' 
                      ? 'bg-gray-700 border-b-2 border-blue-500' 
                      : 'bg-gray-100 border-b-2 border-blue-600'
                    : ''
                }`}
              >
                Phone Verification
              </button>
            </div>
            
            {verificationMethod === 'email' ? (
              <div>
                <p className={`mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  We've sent a 6-digit verification code to your email address. Please enter it below to verify your account.
                </p>
                
                <div className="mb-4">
                  <label className={`block mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Enter Email Verification Code</label>
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    className={`w-full px-4 py-2 rounded-md ${
                      theme === 'dark' 
                        ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                        : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                    } border focus:outline-none focus:ring-1 ${
                      theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                    } ${formErrors.emailCode ? (theme === 'dark' ? 'border-red-500' : 'border-red-500') : ''}`}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                  {formErrors.emailCode && <p className="mt-1 text-red-500 text-sm">{formErrors.emailCode}</p>}
                </div>
              </div>
            ) : (
              <div>
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
              </div>
            )}
            
            <div className="flex justify-between">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowVerificationModal(false)}
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
                onClick={handleVerify}
                disabled={isLoading}
                className={`px-4 py-2 rounded ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </motion.button>
            </div>
            
            <div className="mt-4 text-center">
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Didn't receive the {verificationMethod === 'email' ? 'code' : 'OTP'}?{' '}
                <button 
                  type="button"
                  className={`${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  } hover:underline`}
                  onClick={() => {
                    // Could implement resend functionality here
                    alert(`${verificationMethod === 'email' ? 'Verification code' : 'OTP'} resent to your ${verificationMethod === 'email' ? 'email address' : 'phone number'}.`);
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