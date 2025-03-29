import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import '../pages/theme.css'


const AboutUs = () => {
  const { theme } = useTheme();

  return (
    <section id="about" className="py-16">
      <div
        className={`container mx-auto px-6 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white text-black' : 'bg-gray-900 text-white'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-center">
          
          {/* Text Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:w-1/2 lg:pr-12 mb-8 lg:mb-0"
          >
            <h2 className={`text-3xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
              About MediConnect
            </h2>
            
            <p className={`mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              MediConnect was founded with a simple mission: to make healthcare more accessible for everyone.
              We bridge the gap between patients and healthcare professionals, making it easier to find and
              connect with the right medical expertise when you need it most.
            </p>
            
            <p className={`mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              Our platform leverages technology to simplify the process of finding specialists, scheduling
              appointments, and maintaining your health records. We're committed to improving healthcare
              experiences through innovation and user-centered design.
            </p>
            
            <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              With MediConnect, you can take control of your healthcare journey with confidence, knowing that
              qualified medical professionals are just a few clicks away.
            </p>
          </motion.div>

          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img 
                src="/medicalphoto.jpg" 
                alt="Medical team" 
                className="w-full h-[400px] object-cover" 
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
