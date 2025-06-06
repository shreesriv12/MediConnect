import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const useScheduleStore = create(
  devtools(
    (set, get) => ({
      // State
      schedules: [],
      currentSchedule: null,
      availableSlots: [],
      analytics: null,
      generatedTimeSlots: [],
      loading: false,
      error: null,


      // Helper function for API calls
      apiCall: async (url, options = {}) => {
        try {
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('doctorAccessToken')}`,
              ...options.headers,
            },
            ...options,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API call failed');
          }

          return await response.json();
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Create Schedule
      createSchedule: async (scheduleData) => {
        set({ loading: true, error: null });
        try {
          const response = await get().apiCall(`${API_URL}/schedule/create`, {
            method: 'POST',
            body: JSON.stringify(scheduleData),
          });

          const newSchedule = response.data;
          set((state) => ({
            schedules: [...state.schedules, newSchedule],
            currentSchedule: newSchedule,
            loading: false,
          }));

          return newSchedule;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Get Doctor Schedule
      getDoctorSchedule: async (params = {}) => {
        set({ loading: true, error: null });
        try {
          const queryParams = new URLSearchParams(params).toString();
          const response = await get().apiCall(
            `${API_URL}/schedule/my-schedule${queryParams ? `?${queryParams}` : ''}`
          );

          const schedules = response.data;
          set({
            schedules,
            currentSchedule: schedules.length > 0 ? schedules[0] : null,
            loading: false,
          });

          return schedules;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Update Schedule
      updateSchedule: async (scheduleId, updateData) => {
        set({ loading: true, error: null });
        try {
          const response = await get().apiCall(`${API_URL}/schedule/update/${scheduleId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
          });

          const updatedSchedule = response.data;
          set((state) => ({
            schedules: state.schedules.map((schedule) =>
              schedule._id === scheduleId ? updatedSchedule : schedule
            ),
            currentSchedule: state.currentSchedule?._id === scheduleId 
              ? updatedSchedule 
              : state.currentSchedule,
            loading: false,
          }));

          return updatedSchedule;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Delete Schedule
      deleteSchedule: async (scheduleId) => {
        set({ loading: true, error: null });
        try {
          await get().apiCall(`${API_URL}/schedule/delete/${scheduleId}`, {
            method: 'DELETE',
          });

          set((state) => ({
            schedules: state.schedules.filter((schedule) => schedule._id !== scheduleId),
            currentSchedule: state.currentSchedule?._id === scheduleId 
              ? null 
              : state.currentSchedule,
            loading: false,
          }));

          return true;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Generate Time Slots
      generateTimeSlots: async (slotData) => {
        set({ loading: true, error: null });
        try {
          const response = await get().apiCall(`${API_URL}/schedule/generate-slots`, {
            method: 'POST',
            body: JSON.stringify(slotData),
          });

          const timeSlots = response.data;
          set({
            generatedTimeSlots: timeSlots,
            loading: false,
          });

          return timeSlots;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Get Available Slots (Public - for patients)
      getAvailableSlots: async (doctorId, date) => {
        set({ loading: true, error: null });
        try {
          const response = await get().apiCall(
            `${API_URL}/schedule/doctor/${doctorId}/available-slots/${date}`,
            {
              headers: {
                // No auth header for public route
                'Content-Type': 'application/json',
              },
            }
          );

          const slotsData = response.data;
          set({
            availableSlots: slotsData.availableSlots,
            loading: false,
          });

          return slotsData;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Get Available Slots (Doctor's own)
      getMyAvailableSlots: async (date) => {
        set({ loading: true, error: null });
        try {
          const response = await get().apiCall(`${API_URL}/schedule/available-slots/${date}`);

          const slotsData = response.data;
          set({
            availableSlots: slotsData.availableSlots,
            loading: false,
          });

          return slotsData;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Add Holiday
      addHoliday: async (scheduleId, holidayData) => {
        set({ loading: true, error: null });
        try {
          const response = await get().apiCall(`${API_URL}/schedule/${scheduleId}/holidays`, {
            method: 'POST',
            body: JSON.stringify(holidayData),
          });

          const holidays = response.data;
          set((state) => ({
            schedules: state.schedules.map((schedule) =>
              schedule._id === scheduleId 
                ? { ...schedule, holidays }
                : schedule
            ),
            currentSchedule: state.currentSchedule?._id === scheduleId
              ? { ...state.currentSchedule, holidays }
              : state.currentSchedule,
            loading: false,
          }));

          return holidays;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Remove Holiday
      removeHoliday: async (scheduleId, holidayId) => {
        set({ loading: true, error: null });
        try {
          await get().apiCall(`${API_URL}/schedule/${scheduleId}/holidays/${holidayId}`, {
            method: 'DELETE',
          });

          set((state) => ({
            schedules: state.schedules.map((schedule) =>
              schedule._id === scheduleId
                ? {
                    ...schedule,
                    holidays: schedule.holidays.filter((h) => h._id !== holidayId),
                  }
                : schedule
            ),
            currentSchedule: state.currentSchedule?._id === scheduleId
              ? {
                  ...state.currentSchedule,
                  holidays: state.currentSchedule.holidays.filter((h) => h._id !== holidayId),
                }
              : state.currentSchedule,
            loading: false,
          }));

          return true;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Add Temporary Change
      addTemporaryChange: async (scheduleId, changeData) => {
        set({ loading: true, error: null });
        try {
          const response = await get().apiCall(
            `${API_URL}/schedule/${scheduleId}/temporary-changes`,
            {
              method: 'POST',
              body: JSON.stringify(changeData),
            }
          );

          const temporaryChanges = response.data;
          set((state) => ({
            schedules: state.schedules.map((schedule) =>
              schedule._id === scheduleId
                ? { ...schedule, temporaryChanges }
                : schedule
            ),
            currentSchedule: state.currentSchedule?._id === scheduleId
              ? { ...state.currentSchedule, temporaryChanges }
              : state.currentSchedule,
            loading: false,
          }));

          return temporaryChanges;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Get Schedule Analytics
      getScheduleAnalytics: async (scheduleId, params = {}) => {
        set({ loading: true, error: null });
        try {
          const queryParams = new URLSearchParams(params).toString();
          const response = await get().apiCall(
            `${API_URL}/schedule/${scheduleId}/analytics${queryParams ? `?${queryParams}` : ''}`
          );

          const analytics = response.data;
          set({
            analytics,
            loading: false,
          });

          return analytics;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      // Set Current Schedule
      setCurrentSchedule: (schedule) => set({ currentSchedule: schedule }),

      // Clear Generated Time Slots
      clearGeneratedTimeSlots: () => set({ generatedTimeSlots: [] }),

      // Clear Available Slots
      clearAvailableSlots: () => set({ availableSlots: [] }),

      // Clear Analytics
      clearAnalytics: () => set({ analytics: null }),

      // Utility functions
      getScheduleById: (scheduleId) => {
        const { schedules } = get();
        return schedules.find((schedule) => schedule._id === scheduleId);
      },

      getWeeklyScheduleByDay: (scheduleId, dayOfWeek) => {
        const schedule = get().getScheduleById(scheduleId);
        if (!schedule || schedule.scheduleType !== 'weekly') return null;
        
        return schedule.weeklySchedule.find((day) => day.dayOfWeek === dayOfWeek);
      },

      getAvailableSlotsForDate: (scheduleId, date) => {
        const schedule = get().getScheduleById(scheduleId);
        if (!schedule) return [];

        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        
        if (schedule.scheduleType === 'weekly') {
          const daySchedule = get().getWeeklyScheduleByDay(scheduleId, dayOfWeek);
          return daySchedule?.timeSlots.filter((slot) => !slot.isBooked) || [];
        } else if (schedule.scheduleType === 'specific_date') {
          const scheduleDate = new Date(schedule.specificDate).toDateString();
          const targetDate = new Date(date).toDateString();
          
          if (scheduleDate === targetDate) {
            return schedule.specificDateSchedule.timeSlots.filter((slot) => !slot.isBooked);
          }
        }
        
        return [];
      },

      getBookedSlotsForDate: (scheduleId, date) => {
        const schedule = get().getScheduleById(scheduleId);
        if (!schedule) return [];

        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        
        if (schedule.scheduleType === 'weekly') {
          const daySchedule = get().getWeeklyScheduleByDay(scheduleId, dayOfWeek);
          return daySchedule?.timeSlots.filter((slot) => slot.isBooked) || [];
        } else if (schedule.scheduleType === 'specific_date') {
          const scheduleDate = new Date(schedule.specificDate).toDateString();
          const targetDate = new Date(date).toDateString();
          
          if (scheduleDate === targetDate) {
            return schedule.specificDateSchedule.timeSlots.filter((slot) => slot.isBooked);
          }
        }
        
        return [];
      },

      isHoliday: (scheduleId, date) => {
        const schedule = get().getScheduleById(scheduleId);
        if (!schedule) return false;

        return schedule.holidays.some((holiday) => {
          const holidayDate = new Date(holiday.date).toDateString();
          const checkDate = new Date(date).toDateString();
          return holidayDate === checkDate;
        });
      },

      hasTemporaryChange: (scheduleId, date) => {
        const schedule = get().getScheduleById(scheduleId);
        if (!schedule) return null;

        return schedule.temporaryChanges.find((change) => {
          const changeDate = new Date(change.date).toDateString();
          const checkDate = new Date(date).toDateString();
          return changeDate === checkDate && new Date() < new Date(change.expiresAt);
        });
      },

      // Reset store
      reset: () => set({
        schedules: [],
        currentSchedule: null,
        availableSlots: [],
        analytics: null,
        generatedTimeSlots: [],
        loading: false,
        error: null,
      }),
    }),
    {
      name: 'schedule-store',
    }
  )
);

export default useScheduleStore;