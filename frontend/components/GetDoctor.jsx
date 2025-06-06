import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Search, Phone, Mail, User, Award, Calendar, Stethoscope, Sun, Moon, MapPin, Star } from "lucide-react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      ) : (
        <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-yellow-500 transition-colors" />
      )}
    </button>
  );
};

const AllDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState([]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/doctor");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch doctors");
      }

      setDoctors(data.data.doctors);
      setFilteredDoctors(data.data.doctors);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Search functionality
  useEffect(() => {
    const filtered = doctors.filter(doctor =>
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDoctors(filtered);
  }, [searchTerm, doctors]);

  // Enhanced loading component
  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <ThemeToggle />
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 dark:border-t-blue-300 animate-spin" style={{ animationDelay: '0.3s', animationDuration: '1.5s' }}></div>
        </div>
        <p className="text-center mt-6 text-xl text-gray-700 dark:text-gray-300 font-medium">Loading doctors...</p>
        <p className="text-center mt-2 text-gray-500 dark:text-gray-400">Please wait while we fetch the latest information</p>
      </div>
    </div>
  );

  // Enhanced error component
  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <ThemeToggle />
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Oops! Something went wrong</h3>
          <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
          <button
            onClick={fetchDoctors}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <ThemeToggle />
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
            All Verified Doctors
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Meet our team of experienced and certified medical professionals ready to provide you with exceptional healthcare.
          </p>
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span>All doctors are verified and certified</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search doctors by name, specialization, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-lg"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              Found {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} matching "{searchTerm}"
            </p>
          )}
        </div>

        {/* Doctors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor._id}
              className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
            >
              {/* Doctor Image & Status */}
              <div className="relative flex justify-center mb-6">
                <div className="relative">
                  <img
                    src={doctor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=4f46e5&color=fff&size=120`}
                    alt={doctor.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-xl group-hover:border-blue-500 transition-colors duration-300"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=4f46e5&color=fff&size=120`;
                    }}
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Dr. {doctor.name}
                </h2>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium mb-3">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  {doctor.specialization}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                  <Mail className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate">{doctor.email}</span>
                </div>
                
                <div className="flex items-center text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                  <Phone className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0" />
                  <span className="text-sm">{doctor.phone}</span>
                </div>
              </div>

              {/* Professional Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Award className="w-4 h-4 text-blue-500 mr-1" />
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{doctor.experience}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Years Exp.</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <User className="w-4 h-4 text-purple-500 mr-1" />
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{doctor.age}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{doctor.gender}</div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center">Educational Qualification</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white text-center bg-white dark:bg-gray-600 rounded-lg py-2 px-3">
                    {doctor.degree}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                View Profile
              </button>
            </div>
          ))}
        </div>

        {/* No results message */}
        {filteredDoctors.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No doctors found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search terms or clear the search to see all doctors.</p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && !error && filteredDoctors.length > 0 && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">
                Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredDoctors.length}</span> verified doctor{filteredDoctors.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDoctors;