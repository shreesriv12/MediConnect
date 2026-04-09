import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import '../pages/theme.css'

const ContactForm = () => {
  const { theme } = useTheme(); // Use the theme hook
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission logic would go here
    alert('Thank you for your message. We will contact you soon!');
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };
  
  // Theme-based styles
  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';
  const cardBg = theme === 'dark' ? 'bg-gray-700' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
  const inputBg = theme === 'dark' ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300';
  const inputText = theme === 'dark' ? 'text-white' : 'text-gray-700';
  const buttonBg = theme === 'dark' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700';
  
  return (
    <section id="contact" className={`py-12 sm:py-16 md:py-20 lg:py-24 ${bgColor} transition-colors duration-300`}>
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16"
        >
          <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold ${textColor} mb-3 sm:mb-4`}>Contact Us</h2>
          <p className={`text-base sm:text-lg md:text-xl ${subTextColor} max-w-2xl mx-auto px-2 sm:px-0`}>
            Have questions or need assistance? Reach out to our team and we'll get back to you as soon as possible.
          </p>
        </motion.div>
        
        <div className="max-w-4xl mx-auto">
          <motion.form
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className={`${cardBg} rounded-lg sm:rounded-xl md:rounded-2xl shadow-md md:shadow-lg p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300`}
          >
            <div className="mb-4 sm:mb-5 md:mb-6">
              <label htmlFor="name" className={`block ${inputText} font-medium mb-1.5 sm:mb-2 text-sm md:text-base`}>Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm md:text-base border ${inputBg} rounded-md sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300`}
              />
            </div>
            
            <div className="mb-4 sm:mb-5 md:mb-6">
              <label htmlFor="email" className={`block ${inputText} font-medium mb-1.5 sm:mb-2 text-sm md:text-base`}>Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm md:text-base border ${inputBg} rounded-md sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300`}
              />
            </div>
            
            <div className="mb-4 sm:mb-5 md:mb-6">
              <label htmlFor="subject" className={`block ${inputText} font-medium mb-1.5 sm:mb-2 text-sm md:text-base`}>Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm md:text-base border ${inputBg} rounded-md sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300`}
              />
            </div>
            
            <div className="mb-6 sm:mb-8 md:mb-10">
              <label htmlFor="message" className={`block ${inputText} font-medium mb-1.5 sm:mb-2 text-sm md:text-base`}>Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="4"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm md:text-base border ${inputBg} rounded-md sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300 resize-none`}
              ></textarea>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className={`${buttonBg} text-white font-bold py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6 md:px-8 text-sm md:text-base rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg w-full flex items-center justify-center space-x-2 transition-colors duration-300`}
            >
              <span>Send Message</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </motion.button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;