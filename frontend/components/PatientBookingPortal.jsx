import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Phone, 
  Mail, 
  Stethoscope, 
  ArrowLeft, 
  Search,
  Star,
  Award,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import useClientAuthStore from '../store/clientAuthStore';


const PatientBookingPortal = () => {
  const [currentView, setCurrentView] = useState('doctors'); // 'doctors' or 'booking'
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [bookingLoading, setBookingLoading] = useState(false);

  // Mock patient data - in real app, get from auth store
  const {getCurrentClient} = useClientAuthStore();

  // Fetch all doctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/doctor");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch doctors");
      }

      setDoctors(data.data.doctors);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctor's schedule for a specific date
  const fetchDoctorSchedule = async (doctorId, date) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/schedule?doctorId=${doctorId}&date=${date}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clientAccessToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        return data.schedule;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };


  // Request a slot
  const requestSlot = async (scheduleId, slotIndex) => {
    console.log(localStorage.getItem('clientAccessToken'));

    try {
      setBookingLoading(true);
      const response = await fetch('http://localhost:5000/slots/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('clientAccessToken')}`
        },
        body: JSON.stringify({
          doctorId: selectedDoctor._id,
          scheduleId: scheduleId,
          slotIndex: slotIndex
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: 'Slot request sent successfully! Waiting for doctor approval.', type: 'success' });
        // Refresh the schedule
        if (selectedDate) {
          const updatedSchedule = await fetchDoctorSchedule(selectedDoctor._id, selectedDate);
          if (updatedSchedule) {
            setDoctorSchedules([updatedSchedule]);
          }
        }
      } else {
        setMessage({ text: data.message || 'Failed to request slot', type: 'error' });
      }
    } catch (error) {
      console.error('Error requesting slot:', error);
      setMessage({ text: 'Network error occurred', type: 'error' });
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Handle doctor selection
  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setCurrentView('booking');
    setSelectedDate('');
    setDoctorSchedules([]);
  };

  // Handle date selection and fetch schedule
  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    if (selectedDoctor && date) {
      const schedule = await fetchDoctorSchedule(selectedDoctor._id, date);
      if (schedule) {
        setDoctorSchedules([schedule]);
        setMessage({ text: 'Schedule loaded successfully!', type: 'success' });
      } else {
        setDoctorSchedules([]);
        setMessage({ text: 'No schedule available for this date', type: 'error' });
      }
    }
  };

  // Filter doctors based on search
  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Clear messages after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Get today's date for min date input
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
            {currentView === 'doctors' ? 'Book Your Appointment' : `Book with Dr. ${selectedDoctor?.name}`}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {currentView === 'doctors' 
              ? 'Choose from our verified doctors and book your appointment'
              : 'Select a date and time slot for your appointment'
            }
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 max-w-2xl mx-auto ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* Doctors List View */}
        {currentView === 'doctors' && (
          <>
            {/* Search Bar */}
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search doctors by name, specialization, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-lg"
                />
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                <p className="text-center mt-6 text-xl text-gray-700 font-medium">Loading doctors...</p>
              </div>
            )}

            {/* Doctors Grid */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor._id}
                    className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl p-6 border border-gray-200 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] cursor-pointer"
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    {/* Doctor Image */}
                    <div className="relative flex justify-center mb-6">
                      <div className="relative">
                        <img
                          src={doctor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=4f46e5&color=fff&size=120`}
                          alt={doctor.name}
                          className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl group-hover:border-blue-500 transition-colors duration-300"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=4f46e5&color=fff&size=120`;
                          }}
                        />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Doctor Info */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        Dr. {doctor.name}
                      </h2>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-3">
                        <Stethoscope className="w-4 h-4 mr-2" />
                        {doctor.specialization}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors">
                        <Mail className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0" />
                        <span className="text-sm truncate">{doctor.email}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors">
                        <Phone className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0" />
                        <span className="text-sm">{doctor.phone}</span>
                      </div>
                    </div>

                    {/* Professional Details */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Award className="w-4 h-4 text-blue-500 mr-1" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{doctor.experience}</div>
                          <div className="text-xs text-gray-500">Years Exp.</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <User className="w-4 h-4 text-purple-500 mr-1" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{doctor.age}</div>
                          <div className="text-xs text-gray-500">{doctor.gender}</div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-1 text-center">Educational Qualification</div>
                        <div className="text-sm font-semibold text-gray-900 text-center bg-white rounded-lg py-2 px-3">
                          {doctor.degree}
                        </div>
                      </div>
                    </div>

                    {/* Book Button */}
                    <button className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                      Book Appointment
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* No results message */}
            {!loading && filteredDoctors.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
                <p className="text-gray-600">Try adjusting your search terms or clear the search to see all doctors.</p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear search
                </button>
              </div>
            )}
          </>
        )}

        {/* Booking View */}
        {currentView === 'booking' && selectedDoctor && (
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => setCurrentView('doctors')}
              className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Doctors
            </button>

            {/* Doctor Summary Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-6">
                <img
                  src={selectedDoctor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDoctor.name)}&background=4f46e5&color=fff&size=80`}
                  alt={selectedDoctor.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Dr. {selectedDoctor.name}</h2>
                  <p className="text-blue-600 font-medium mb-2">{selectedDoctor.specialization}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Award size={16} />
                      {selectedDoctor.experience} years exp.
                    </span>
                    <span>{selectedDoctor.degree}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="text-blue-500" />
                Select Appointment Date
              </h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                min={today}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {/* Available Slots */}
            {selectedDate && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="text-blue-500" />
                  Available Time Slots for {selectedDate}
                </h3>

                {loading && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600 rounded-full animate-spin border-t-transparent mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading available slots...</p>
                  </div>
                )}

                {!loading && doctorSchedules.length > 0 && (
                  <div className="grid gap-4">
                    {doctorSchedules[0].slots.map((slot, index) => {
                      const hasRequest = slot.requestId !== null;
                      const isBooked = slot.isBooked;
                      const isAvailable = !isBooked && !hasRequest;
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            isAvailable 
                              ? 'border-green-200 bg-green-50 hover:border-green-300 hover:shadow-md' 
                              : isBooked
                              ? 'border-red-200 bg-red-50'
                              : 'border-yellow-200 bg-yellow-50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <Clock size={18} className="text-gray-600" />
                                <span className="font-semibold text-gray-900 text-lg">{slot.time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign size={18} className="text-gray-600" />
                                <span className="font-semibold text-gray-900 text-lg">${slot.fee}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                                isAvailable 
                                  ? 'bg-green-100 text-green-800' 
                                  : isBooked
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {isAvailable ? 'Available' : isBooked ? 'Booked' : 'Pending Request'}
                              </div>
                              
                              {isAvailable && (
                                <button
                                  onClick={() => requestSlot(doctorSchedules[0]._id, index)}
                                  disabled={bookingLoading}
                                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors font-medium"
                                >
                                  {bookingLoading ? 'Requesting...' : 'Request Slot'}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {hasRequest && (
                            <div className="mt-3 text-sm text-yellow-700 flex items-center gap-2">
                              <AlertCircle size={16} />
                              <span>A request is pending for this slot</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!loading && doctorSchedules.length === 0 && selectedDate && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="mx-auto mb-4" size={48} />
                    <h4 className="text-lg font-medium mb-2">No Schedule Available</h4>
                    <p>Dr. {selectedDoctor.name} hasn't set up any appointments for this date.</p>
                    <p className="text-sm mt-2">Please try a different date or contact the doctor directly.</p>
                  </div>
                )}
              </div>
            )}

            {!selectedDate && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="mx-auto mb-4" size={64} />
                <h4 className="text-xl font-medium mb-2">Select a Date</h4>
                <p>Choose a date above to view available appointment slots.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientBookingPortal;