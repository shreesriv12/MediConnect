import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from "../components/HeroSection";
import Services from "../components/Services";
import AboutUs from "../components/AboutUs"; // Added missing import
import ContactForm from "../components/ContactForm";
import Footer from "../components/Footer";
import DoctorLogin from '../pages/DoctorLogin';
import DoctorSignup from '../pages/DoctorSignup';
import DoctorDashboard from '../pages/DoctorDashboard';
import { ThemeProvider } from '../context/ThemeContext';
import useDoctorAuthStore from '../store/doctorAuthStore';

const ProtectedRoute = ({ children }) => {
  const { doctor, accessToken, refreshTokens } = useDoctorAuthStore();
  
  useEffect(() => {
    if (!doctor && accessToken) {
      refreshTokens();
    }
  }, [accessToken, doctor, refreshTokens]);
  
  if (!doctor) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  const { getCurrentDoctor } = useDoctorAuthStore();
  
  useEffect(() => {
    getCurrentDoctor();
  }, [getCurrentDoctor]);
  
  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <Navbar />
          <HeroSection />
      <Services />
      <AboutUs />
      <ContactForm />
      <Footer />
          <Routes>
            <Route path="/login" element={<DoctorLogin />} />
            <Route path="/signup" element={<DoctorSignup />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;