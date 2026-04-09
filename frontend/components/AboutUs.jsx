import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import '../pages/theme.css'


const AboutUs = () => {
  const { theme } = useTheme();

  return (
    <section id="about" className="py-8 sm:py-12 md:py-16 lg:py-20">
      <div
        className={`container mx-auto px-4 sm:px-6 md:px-8 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white text-black' : 'bg-gray-900 text-white'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 md:gap-10 lg:gap-12">
          
          {/* Text Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="w-full lg:w-1/2"
          >
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 ${theme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
              About MediConnect
            </h2>
            
            <p className={`mb-3 sm:mb-4 text-sm sm:text-base md:text-lg leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              MediConnect was founded with a simple mission: to make healthcare more accessible for everyone.
              We bridge the gap between patients and healthcare professionals, making it easier to find and
              connect with the right medical expertise when you need it most.
            </p>
            
            <p className={`mb-3 sm:mb-4 text-sm sm:text-base md:text-lg leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              Our platform leverages technology to simplify the process of finding specialists, scheduling
              appointments, and maintaining your health records. We're committed to improving healthcare
              experiences through innovation and user-centered design.
            </p>
            
            <p className={`text-sm sm:text-base md:text-lg leading-relaxed ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
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
            className="w-full lg:w-1/2"
          >
            <div className="rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-lg md:shadow-xl">
              <img 
                src="/medicalphoto.jpg" 
                alt="Medical team" 
                className="w-full h-48 sm:h-56 md:h-72 lg:h-80 xl:h-96 object-cover" 
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
