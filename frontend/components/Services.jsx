import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
const serviceItems = [
  {
    icon: "🏥",
    title: "Book Appointments",
    description: "Schedule appointments with doctors across various specialties with just a few clicks."
  },
  {
    icon: "👨‍⚕️",
    title: "Find Specialists",
    description: "Search for specialists by expertise, location, availability, and patient ratings."
  },
  {
    icon: "💬",
    title: "Online Consultations",
    description: "Connect with healthcare professionals through secure video consultations."
  },
  {
    icon: "📋",
    title: "Health Records",
    description: "Maintain your medical history and share it securely with your healthcare providers."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const Services = () => {
  const { theme } = useTheme();
  
  return (
    <section 
      id="services" 
      className={`py-16 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}
          >
            Our Services
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto transition-colors duration-300`}
          >
            We provide a comprehensive platform to connect patients with healthcare professionals.
          </motion.p>
        </div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {serviceItems.map((service, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`${
                theme === 'dark' 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                  : 'bg-white hover:shadow-lg text-gray-900'
              } p-6 rounded-lg shadow-md transition-all duration-300`}
            >
              <div className="text-4xl mb-4">{service.icon}</div>
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-300`}>
                {service.title}
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                {service.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;