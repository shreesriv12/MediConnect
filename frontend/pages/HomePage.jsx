import React from 'react'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import Services from '../components/Services'
import AboutUs from '../components/AboutUs'
import ContactForm from '../components/ContactForm'
import Footer from '../components/Footer'

const HomePage = () => {
  return (
    <div>
    <Navbar />
    <HeroSection />
<Services />
<AboutUs />
<ContactForm />
<Footer />
</div>
  )
}

export default HomePage
