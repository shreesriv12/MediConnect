import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import useClientAuthStore from '../store/clientAuthStore';

const ClientProfile = () => {
  const { client, isLoading, error, updateProfile, clearError } = useClientAuthStore();
  console.log(client);
  const { theme, toggleTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    password: '',
    confirmPassword: ''
  });
  
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize form data with doctor data when available
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        age: client.age || '',
        gender: client.gender || '',
        password: '',
        confirmPassword: ''
      });
      setAvatarPreview(client.avatar || '');
    }
  }, [client]);
  
  // Clear any error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);
  
  // Display error as toast if it exists
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match if changing password
    if (formData.password && formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    
    // Create FormData for API request
    const submitData = new FormData();
    for (const key in formData) {
      if (formData[key] && key !== 'confirmPassword') {
        submitData.append(key, formData[key]);
      }
    }
    
    // Add avatar if changed
    if (avatar) {
      submitData.append('avatar', avatar);
    }
    
    const result = await updateProfile(submitData);
    if (result.success) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      setAvatar(null);
    }
  };
  
  if (!client) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8">
        <div className={`${theme === 'dark' ? 'bg-gray-800 shadow-lg' : 'bg-white shadow-md'} rounded-lg overflow-hidden max-w-4xl mx-auto transition-colors duration-300`}>
          <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-indigo-700 to-purple-800' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} px-6 py-4 flex justify-between items-center`}>
            <h2 className="text-2xl font-bold text-white">Client Profile</h2>
            <button 
              onClick={toggleTheme} 
              className={`flex items-center justify-center rounded-full p-2 ${theme === 'dark' ? 'bg-gray-700 text-yellow-300' : 'bg-blue-400 text-gray-800'}`}
              aria-label={`Toggle ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="p-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-6">
                  <div className={`w-32 h-32 rounded-full overflow-hidden mb-4 ${theme === 'dark' ? 'ring-2 ring-indigo-500' : 'ring-2 ring-blue-300'}`}>
                    <img 
                      src={avatarPreview || client.avatar || '/placeholder-avatar.png'} 
                      alt="Client Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className={`cursor-pointer ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-4 rounded transition-colors duration-200`}>
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' : 'bg-white border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                      required
                    />
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' : 'bg-white border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                      required
                    />
                  </div>
                  
                  {/* Phone */}
                  <div>
                    <label className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' : 'bg-white border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                      required
                    />
                  </div>
                
          
                  
                  {/* Age */}
                  <div>
                    <label className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>Age</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className={`w-full border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' : 'bg-white border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                      required
                    />
                  </div>
                  
                  {/* Gender */}
                  <div>
                    <label className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`w-full border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' : 'bg-white border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {/* Password */}
                  <div>
                    <label className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' : 'bg-white border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                    />
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <label className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full border rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' : 'bg-white border-gray-300 focus:ring-blue-500'} focus:outline-none focus:ring-2`}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={`${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'} py-2 px-6 rounded transition-colors duration-200`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-6 rounded transition-colors duration-200`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex flex-col md:flex-row">
                  {/* Avatar Display */}
                  <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-8">
                    <div className={`w-40 h-40 rounded-full overflow-hidden ${theme === 'dark' ? 'ring-2 ring-indigo-500' : 'ring-2 ring-blue-300'}`}>
                      <img 
                        src={client.avatar || '/placeholder-avatar.png'} 
                        alt="Client Avatar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Basic Info */}
                  <div className="flex-grow">
                    <h3 className="text-2xl font-bold mb-2">{client.name}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                        <p className="font-medium">{client.phone}</p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Age</p>
                        <p className="font-medium">{client.age} years</p>
                      </div>
                      <div>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Gender</p>
                        <p className="font-medium">{client.gender && client.gender.charAt(0).toUpperCase() + client.gender.slice(1)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-6 rounded transition-colors duration-200`}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;