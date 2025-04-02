import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import DoctorDashboardNavbar from './DoctorDahboardNavbar';

const DoctorDirectory = () => {
  const { theme, toggleTheme } = useTheme(); // Use the theme context
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('confirmed');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";


  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateRange]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/doctor/appointments?status=${statusFilter}`, {
        withCredentials: true
      });
      
      // Filter by date range if needed
      const filteredAppointments = response.data.data.appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.slotId.startTime);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of day
        return appointmentDate >= startDate && appointmentDate <= endDate;
      });
      
      setAppointments(filteredAppointments);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
      setLoading(false);
    }
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/doctor/appointments/${appointmentId}/status`, {
        status: newStatus
      }, {
        withCredentials: true
      });
      // Refresh the appointment list
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
    }
  };

  const formatAppointmentTime = (startTime) => {
    return format(new Date(startTime), 'MMM dd, yyyy - h:mm a');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return `${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`;
      case 'completed':
        return `${theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`;
      case 'cancelled':
        return `${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`;
      case 'pending':
        return `${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`;
      default:
        return `${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`;
    }
  };

  // Theme-specific classes
  const containerClass = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900';
  const cardClass = theme === 'dark' ? 'bg-gray-800 shadow-dark' : 'bg-white shadow';
  const headingClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const labelClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const inputClass = theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900';
  const tableHeaderClass = theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-500';
  const tableRowHoverClass = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const dividerClass = theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200';

  return (
    <section>
        <DoctorDashboardNavbar/>
    <div className={`p-25 max-w-6xl mx-auto transition-colors duration-200 ${containerClass}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${headingClass}`}>Patient Directory</h1>
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-800'}`}
        >
          {theme === 'dark' ? (
            // Sun icon for dark mode
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            // Moon icon for light mode
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Filters */}
      <div className={`${cardClass} p-4 rounded-lg mb-6 transition-colors duration-200`}>
        <h2 className={`text-lg font-semibold mb-3 ${headingClass}`}>Filters</h2>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-full md:w-1/3">
            <label className={`block text-sm font-medium ${labelClass} mb-1`}>Status</label>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className={`w-full p-2 border rounded-md ${inputClass}`}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="w-full md:w-1/3">
            <label className={`block text-sm font-medium ${labelClass} mb-1`}>From</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className={`w-full p-2 border rounded-md ${inputClass}`}
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <label className={`block text-sm font-medium ${labelClass} mb-1`}>To</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className={`w-full p-2 border rounded-md ${inputClass}`}
            />
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className={`${theme === 'dark' ? 'bg-red-900 border-red-800 text-red-200' : 'bg-red-100 border-red-400 text-red-700'} border px-4 py-3 rounded mb-4`}>
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${theme === 'dark' ? 'border-blue-400' : 'border-blue-500'}`}></div>
        </div>
      ) : (
        <>
          {/* Appointments count */}
          <div className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Showing {appointments.length} patient{appointments.length !== 1 ? 's' : ''}
          </div>
          
          {/* Appointments table */}
          {appointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className={`min-w-full ${cardClass} rounded-lg transition-colors duration-200`}>
                <thead className={tableHeaderClass}>
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Patient</th>
                    <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Contact</th>
                    <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Appointment Time</th>
                    <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Notes</th>
                    <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className={`${dividerClass} divide-y`}>
                  {appointments.map((appointment) => (
                    <tr key={appointment._id} className={tableRowHoverClass}>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          {appointment.clientId.avatar ? (
                            <img 
                              src={appointment.clientId.avatar} 
                              alt={appointment.clientId.name} 
                              className="h-10 w-10 rounded-full mr-3"
                            />
                          ) : (
                            <div className={`h-10 w-10 rounded-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} flex items-center justify-center mr-3`}>
                              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                                {appointment.clientId.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{appointment.clientId.name}</div>
                            {appointment.clientId.age && (
                              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {appointment.clientId.age} years old • {appointment.clientId.gender}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>{appointment.clientId.email}</div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{appointment.clientId.phone}</div>
                      </td>
                      <td className={`py-4 px-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatAppointmentTime(appointment.slotId.startTime)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} max-w-xs truncate`}>
                        {appointment.notes || 'No notes provided'}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'completed')}
                            className={`${theme === 'dark' ? 'bg-green-700 hover:bg-green-800' : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1 rounded-md mr-2 transition-colors`}
                          >
                            Mark Complete
                          </button>
                        )}
                        {appointment.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'confirmed')}
                            className={`${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-500 hover:bg-blue-600'} text-white px-3 py-1 rounded-md mr-2 transition-colors`}
                          >
                            Confirm
                          </button>
                        )}
                        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'cancelled')}
                            className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : 'bg-red-500 hover:bg-red-600'} text-white px-3 py-1 rounded-md transition-colors`}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`${cardClass} p-8 rounded-lg text-center transition-colors duration-200`}>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>No patients found with the selected filters.</p>
              <button 
                onClick={() => {
                  setStatusFilter('all');
                  setDateRange({
                    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  });
                }}
                className={`mt-4 ${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded-md transition-colors`}
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </section>
  );
};

export default DoctorDirectory;