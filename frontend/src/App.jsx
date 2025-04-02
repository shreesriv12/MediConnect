import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, RouterProvider } from 'react-router-dom';
import DoctorLogin from '../pages/DoctorLogin';
import DoctorSignup from '../pages/DoctorSignup';
import DoctorDashboard from '../pages/DoctorDashboard';
import { ThemeProvider } from '../context/ThemeContext';
import useDoctorAuthStore from '../store/doctorAuthStore';
import ClientDashboard from '../pages/ClientDashboard';
import HomePage from '../pages/HomePage';
import DoctorProfile from '../components/DoctorProfile';
import DoctorAppointments from '../components/doctorAppointments';
import DoctorSchedule from '../components/DoctorSchedules';
import DoctorDirectory from '../components/Doctordirectory';
import ChatBot from '../components/ChatBot';
function App() {
  const { getCurrentDoctor } = useDoctorAuthStore();
  
  useEffect(() => {
    getCurrentDoctor();
  }, [getCurrentDoctor]);
  
  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <Routes>
          <Route path="/" element={<HomePage/>}/>
            <Route path="/login" element={<DoctorLogin />} />
            <Route path="/signup" element={<DoctorSignup />} />
            <Route path="/doctordashboard" element={<DoctorDashboard /> } />
            <Route path="/clientdashboard" element={<ClientDashboard/>}/>
            <Route path='/doctorprofile' element={<DoctorProfile/>}/>
            <Route path='/doctorappointments' element={<DoctorAppointments/>}/>
            <Route path='/doctorschedule' element={<DoctorSchedule/>}/>
            <Route path='/doctordirectory' element={<DoctorDirectory/>}/>
            <Route path='/chatbot' element={<ChatBot/>}/>
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;