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
    <section id="contact" className={`py-16 ${bgColor} transition-colors duration-300`}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className={`text-3xl font-bold ${textColor} mb-4`}>Contact Us</h2>
          <p className={`text-xl ${subTextColor} max-w-2xl mx-auto`}>
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
            className={`${cardBg} rounded-lg shadow-md p-8 transition-colors duration-300`}
          >
            <div className="mb-6">
              <label htmlFor="name" className={`block ${inputText} font-medium mb-2`}>Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border ${inputBg} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300`}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="email" className={`block ${inputText} font-medium mb-2`}>Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border ${inputBg} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300`}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="subject" className={`block ${inputText} font-medium mb-2`}>Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border ${inputBg} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300`}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="message" className={`block ${inputText} font-medium mb-2`}>Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="5"
                className={`w-full px-4 py-2 border ${inputBg} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${inputText} transition-colors duration-300`}
              ></textarea>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className={`${buttonBg} text-white font-bold py-3 px-6 rounded-lg shadow-lg w-full flex items-center justify-center space-x-2 transition-colors duration-300`}
            >
              <span>Send Message</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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