import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, Plus, Trash2, Eye, User, CheckCircle, XCircle } from 'lucide-react';

import useDoctorAuthStore from '../store/doctorAuthStore'; // Adjust the import path as necessary



const ScheduleManagement = () => {

  const { isAuthenticated, currentDoctor,getCurrentDoctor } = useDoctorAuthStore();
  const [activeTab, setActiveTab] = useState('create');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Create Schedule State
  const [newSchedule, setNewSchedule] = useState({
    date: '',
    slots: []
  });
  
  // View Schedule State
  const [viewDate, setViewDate] = useState('');
  const [currentSchedule, setCurrentSchedule] = useState(null);

  // Initialize doctor data on component mount
useEffect(() => {
  console.log('isAuthenticated:', isAuthenticated);
  console.log('currentDoctor:', currentDoctor);
  if (isAuthenticated && !currentDoctor) {
    console.log('Fetching current doctor...');
    getCurrentDoctor();
  }
}, [isAuthenticated, currentDoctor, getCurrentDoctor]);

  // Add new slot to create schedule
  const addSlot = () => {
    setNewSchedule(prev => ({
      ...prev,
      slots: [...prev.slots, { time: '', fee: '' }]
    }));
  };

  // Remove slot from create schedule
  const removeSlot = (index) => {
    setNewSchedule(prev => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index)
    }));
  };

  // Update slot data
  const updateSlot = (index, field, value) => {
    setNewSchedule(prev => ({
      ...prev,
      slots: prev.slots.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  // Create schedule API call
  const createSchedule = async () => {
    if (!newSchedule.date || newSchedule.slots.length === 0) {
      setMessage({ text: 'Please fill in date and at least one slot', type: 'error' });
      return;
    }

    // Validate slots
    const invalidSlots = newSchedule.slots.some(slot => !slot.time || !slot.fee);
    if (invalidSlots) {
      setMessage({ text: 'Please fill in all slot details', type: 'error' });
      return;
    }

    if (!currentDoctor?._id) {
      setMessage({ text: 'Doctor information not available', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/schedule/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('doctorAccessToken')}`
        },
        body: JSON.stringify({
          doctorId: currentDoctor._id, // Use doctor ID from store
          date: newSchedule.date,
          slots: newSchedule.slots.map(slot => ({
            time: slot.time,
            fee: parseFloat(slot.fee)
          }))
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: 'Schedule created successfully!', type: 'success' });
        setNewSchedule({ date: '', slots: [] });
      } else {
        setMessage({ text: data.message || 'Failed to create schedule', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error occurred', type: 'error' });
    }
    setLoading(false);
  };

  // Get doctor schedule
  const getDoctorSchedule = async () => {
    if (!viewDate) {
      setMessage({ text: 'Please select a date', type: 'error' });
      return;
    }

    if (!currentDoctor?._id) {
      setMessage({ text: 'Doctor information not available', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/schedule?doctorId=${currentDoctor._id}&date=${viewDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('doctorAccessToken')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentSchedule(data.schedule);
        setMessage({ text: 'Schedule loaded successfully!', type: 'success' });
      } else {
        setCurrentSchedule(null);
        setMessage({ text: data.message || 'No schedule found', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error occurred', type: 'error' });
    }
    setLoading(false);
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Doctor Schedule Manager</h1>
          <p className="text-gray-600">Manage your appointments and availability</p>
          {currentDoctor && (
            <p className="text-blue-600 font-medium mt-2">Welcome, {currentDoctor.name || 'Doctor'}</p>
          )}
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Plus className="inline-block mr-2" size={20} />
              Create Schedule
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'view'
                  ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eye className="inline-block mr-2" size={20} />
              View Schedule
            </button>
          </div>
        </div>

        {/* Create Schedule Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Calendar className="text-blue-500" />
              Create New Schedule
            </h2>

            {/* Date Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={newSchedule.date}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, date: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Slots Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Time Slots</h3>
                <button
                  onClick={addSlot}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Slot
                </button>
              </div>

              {newSchedule.slots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="mx-auto mb-2" size={48} />
                  <p>No slots added yet. Click "Add Slot" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newSchedule.slots.map((slot, index) => (
                    <div key={index} className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updateSlot(index, 'time', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee ($)</label>
                        <input
                          type="number"
                          value={slot.fee}
                          onChange={(e) => updateSlot(index, 'fee', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-400"
                        />
                      </div>
                      <button
                        onClick={() => removeSlot(index)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={createSchedule}
              disabled={loading || !newSchedule.date || newSchedule.slots.length === 0}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Creating Schedule...' : 'Create Schedule'}
            </button>
          </div>
        )}

        {/* View Schedule Tab */}
        {activeTab === 'view' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Eye className="text-blue-500" />
              View Schedule
            </h2>

            {/* Date Input Only */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>

            <button
              onClick={getDoctorSchedule}
              disabled={loading || !viewDate}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors font-medium mb-6"
            >
              {loading ? 'Loading Schedule...' : 'Get My Schedule'}
            </button>

            {/* Schedule Display */}
            {currentSchedule && (
              <div className="border-t pt-6">
                <div className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-800">
                  <Calendar className="text-blue-500" />
                  Schedule for {currentSchedule.date}
                </div>
                
                <div className="grid gap-4">
                  {currentSchedule.slots.map((slot, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-2 ${
                        slot.isBooked 
                          ? 'border-red-200 bg-red-50' 
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-600" />
                            <span className="font-medium text-gray-900">{slot.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign size={16} className="text-gray-600" />
                            <span className="font-medium text-gray-900">${slot.fee}</span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          slot.isBooked 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {slot.isBooked ? 'Booked' : 'Available'}
                        </div>
                      </div>
                      {slot.isBooked && slot.bookedBy && (
                        <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                          <User size={14} />
                          Booked by: {slot.bookedBy}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleManagement;