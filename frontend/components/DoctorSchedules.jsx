import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { format, addDays, startOfWeek, isAfter } from 'date-fns';
import DoctorDashboardNavbar from './DoctorDahboardNavbar';

const DoctorSchedule = () => {
  const { theme } = useTheme();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newSlot, setNewSlot] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '09:30',
    duration: 30,
    fee: 50
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);


  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";



  // Fetch doctor's slots
  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/doctor/slots`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      setSlots(response.data.data.slots);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  };

  // Create a new slot
  const createSlot = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const slotData = {
        ...newSlot,
        startTime: `${newSlot.date}T${newSlot.startTime}:00`,
        endTime: `${newSlot.date}T${newSlot.endTime}:00`,
      };

      if (isEditing) {
        await axios.patch(`${API_URL}/doctor/slots/${editingSlotId}`, slotData, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        });
      } else {
        await axios.post(`${API_URL}/doctor/slots`, slotData, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        });
      }

      // Reset form and refresh slots
      setNewSlot({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '09:30',
        duration: 30,
        fee: 50
      });
      setIsEditing(false);
      setEditingSlotId(null);
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  };

  // Delete a slot
  const deleteSlot = async (slotId) => {
    if (window.confirm('Are you sure you want to delete this slot?')) {
      try {
        setLoading(true);
        await axios.delete(`${API_URL}/doctor/slots/${slotId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        });
        fetchSlots();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete slot');
      } finally {
        setLoading(false);
      }
    }
  };

  // Edit a slot
  const editSlot = (slot) => {
    // Format the date and time values for the form
    const date = new Date(slot.date);
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);

    setNewSlot({
      date: format(date, 'yyyy-MM-dd'),
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      duration: slot.duration,
      fee: slot.fee
    });
    setIsEditing(true);
    setEditingSlotId(slot._id);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSlot({
      ...newSlot,
      [name]: value
    });
  };

  // Generate an array of 7 days starting from startDate
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  // Filter slots for the selected date
  const filteredSlots = slots.filter(slot => {
    const slotDate = new Date(slot.date);
    return format(slotDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  // Navigate to next week
  const nextWeek = () => {
    setStartDate(addDays(startDate, 7));
  };

  // Navigate to previous week
  const prevWeek = () => {
    setStartDate(addDays(startDate, -7));
  };

  return (
    <section >
        <DoctorDashboardNavbar/>
    <div className={`doctor-schedule ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-20 rounded-lg shadow-md`}>
      <h2 className="text-2xl font-bold mb-4">Manage Your Schedule</h2>
      
      {error && <div className="p-3 bg-red-500 text-white rounded mb-4">{error}</div>}
      
      {/* Week navigator */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={prevWeek}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Previous Week
        </button>
        <h3 className="text-lg font-semibold">
          {format(startDate, 'MMM d')} - {format(addDays(startDate, 6), 'MMM d, yyyy')}
        </h3>
        <button 
          onClick={nextWeek}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Next Week
        </button>
      </div>
      
      {/* Days of the week */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day, index) => (
          <button
            key={index}
            className={`p-2 rounded text-center ${
              format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                ? 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedDate(day)}
          >
            <div className="font-semibold">{format(day, 'EEE')}</div>
            <div>{format(day, 'd')}</div>
          </button>
        ))}
      </div>
      
      {/* Create/Edit slot form */}
      <form onSubmit={createSlot} className="mb-6 p-4 border rounded">
        <h3 className="text-xl font-semibold mb-3">
          {isEditing ? 'Edit Appointment Slot' : 'Create New Appointment Slot'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={newSlot.date}
              onChange={handleInputChange}
              className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
              required
            />
          </div>
          
          <div>
            <label className="block mb-1">Duration (minutes)</label>
            <select
              name="duration"
              value={newSlot.duration}
              onChange={handleInputChange}
              className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
              required
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-1">Start Time</label>
            <input
              type="time"
              name="startTime"
              value={newSlot.startTime}
              onChange={handleInputChange}
              className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
              required
            />
          </div>
          
          <div>
            <label className="block mb-1">End Time</label>
            <input
              type="time"
              name="endTime"
              value={newSlot.endTime}
              onChange={handleInputChange}
              className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
              required
            />
          </div>
          
          <div>
            <label className="block mb-1">Fee ($)</label>
            <input
              type="number"
              name="fee"
              value={newSlot.fee}
              onChange={handleInputChange}
              className={`w-full p-2 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
              required
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Processing...' : isEditing ? 'Update Slot' : 'Create Slot'}
          </button>
          
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setNewSlot({
                  date: format(new Date(), 'yyyy-MM-dd'),
                  startTime: '09:00',
                  endTime: '09:30',
                  duration: 30,
                  fee: 50
                });
                setIsEditing(false);
                setEditingSlotId(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      
      {/* Slots for selected date */}
      <div>
        <h3 className="text-xl font-semibold mb-3">
          Appointments for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        
        {loading && <p>Loading slots...</p>}
        
        {!loading && filteredSlots.length === 0 && (
          <p className="text-gray-500">No slots scheduled for this day.</p>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlots.map((slot) => {
            const startTime = new Date(slot.startTime);
            const endTime = new Date(slot.endTime);
            const isDisabled = slot.isBooked;
            
            return (
              <div 
                key={slot._id} 
                className={`p-4 rounded-lg shadow ${
                  isDisabled 
                    ? 'bg-gray-300 dark:bg-gray-700' 
                    : theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">
                      {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                    </p>
                    <p>Duration: {slot.duration} minutes</p>
                    <p>Fee: ${slot.fee}</p>
                  </div>
                  
                  {slot.isBooked && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                      Booked
                    </span>
                  )}
                </div>
                
                {!isDisabled && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => editSlot(slot)}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSlot(slot._id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </section>
  );
};

export default DoctorSchedule;