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
import DoctorDirectory from '../components/Doctordirectory';
import ChatPage from '../pages/ChatPage';
import ClientProfile from '../components/ClientProfile';
import VideoCallPage from '../pages/VideoPage';
function App() {
  
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
            <Route path='/doctordirectory' element={<DoctorDirectory/>}/>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/clientprofile" element={<ClientProfile />} />
            <Route path="/video-call" element={<VideoCallPage />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;