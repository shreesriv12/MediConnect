import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import Services from '../components/Services';
import AboutUs from '../components/AboutUs';
import ContactForm from '../components/ContactForm';
import Footer from '../components/Footer'

function App() {
  return (
    <div className="app">
      <Navbar />
      <HeroSection />
      <Services />
      <AboutUs />
      <ContactForm />
      <Footer />
    </div>
  );
}

export default App;