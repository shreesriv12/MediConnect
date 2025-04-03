import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext'; // Import the theme context
import DoctorDashboardNavbar from './DoctorDahboardNavbar';

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme(); // Use the theme context

  useEffect(() => {
    fetchAppointments();
  }, [filter]);
  
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await axios.get(`${API_URL}/doctor/appointments${statusParam}`, {
        withCredentials: true
      });
      setAppointments(response.data.data.appointments);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
      setLoading(false);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/doctor/appointments/${appointmentId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      // Update the local state to reflect the change
      setAppointments(appointments.map(appointment => 
        appointment._id === appointmentId 
          ? { ...appointment, status: newStatus } 
          : appointment
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const formatDateTime = (dateTimeString) => {
    try {
      return format(new Date(dateTimeString), 'MMM dd, yyyy - h:mm a');
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return theme === 'dark' ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800';
      case 'cancelled':
        return theme === 'dark' ? 'bg-red-800 text-red-100' : 'bg-red-100 text-red-800';
      case 'pending':
        return theme === 'dark' ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return theme === 'dark' ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800';
      default:
        return theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800';
    }
  };

  // Dynamic classes based on theme
  const containerClass = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const headingClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const tableHeaderClass = theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-500';
  const tableBodyClass = theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200';
  const cellClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-900';
  const buttonClass = theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600';

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${containerClass}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <section >
        <DoctorDashboardNavbar/>
    <div className={`${containerClass} min-h-screen p-20`}>
        
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className={`text-2xl font-bold ${headingClass}`}>Manage Appointments</h1>
        </div>
        
        {error && (
          <div className={theme === 'dark' ? "bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded" : "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"}>
            {error}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <label className={cellClass}>Filter by status:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className={theme === 'dark' ? "border border-gray-600 bg-gray-700 text-white rounded p-2" : "border border-gray-300 rounded p-2"}
            >
              <option value="all">All Appointments</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button 
            onClick={fetchAppointments}
            className={`${buttonClass} text-white px-4 py-2 rounded`}
          >
            Refresh
          </button>
        </div>
        
        {appointments.length === 0 ? (
          <div className={theme === 'dark' ? "text-center py-8 bg-gray-800 rounded-lg" : "text-center py-8 bg-gray-50 rounded-lg"}>
            <p className={theme === 'dark' ? "text-gray-400" : "text-gray-500"}>No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={tableHeaderClass}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={tableBodyClass}>
                {appointments.map((appointment) => (
                  <tr key={appointment._id} className={theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className={`text-sm font-medium ${cellClass}`}>
                            {appointment.clientId?.name || 'Unknown'}
                          </div>
                          <div className={theme === 'dark' ? "text-sm text-gray-400" : "text-sm text-gray-500"}>
                            {appointment.clientId?.email}
                          </div>
                          <div className={theme === 'dark' ? "text-sm text-gray-400" : "text-sm text-gray-500"}>
                            {appointment.clientId?.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${cellClass}`}>
                        {formatDateTime(appointment.slotId?.startTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${cellClass}`}>
                        {appointment.slotId?.duration} minutes
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {appointment.status === 'pending' && (
                        <div className="space-x-2">
                          <button
                            onClick={() => updateAppointmentStatus(appointment._id, 'confirmed')}
                            className={theme === 'dark' ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-900"}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => updateAppointmentStatus(appointment._id, 'cancelled')}
                            className={theme === 'dark' ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {appointment.status === 'confirmed' && (
                        <div className="space-x-2">
                          <button
                            onClick={() => updateAppointmentStatus(appointment._id, 'completed')}
                            className={theme === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-900"}
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => updateAppointmentStatus(appointment._id, 'cancelled')}
                            className={theme === 'dark' ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-900"}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </section>

  );
};

export default DoctorAppointments;