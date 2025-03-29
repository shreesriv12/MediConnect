import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import Services from '../components/Services';
import AboutUs from '../components/AboutUs';
import ContactForm from '../components/ContactForm';
import Footer from '../components/Footer'
import { ThemeProvider } from '../context/ThemeContext';
function App() {
  return (
    <div className="app">
      <ThemeProvider>
      <Navbar />
      <HeroSection />
      <Services />
      <AboutUs />
      <ContactForm />
      <Footer />
      </ThemeProvider>
    </div>
  );
}

export default App;