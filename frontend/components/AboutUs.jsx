import React from 'react';
import { motion } from 'framer-motion';

const AboutUs = () => {
  return (
    <section id="about" className="py-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:w-1/2 lg:pr-12 mb-8 lg:mb-0"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About MediConnect</h2>
            <p className="text-gray-600 mb-4">
              MediConnect was founded with a simple mission: to make healthcare more accessible for everyone.
              We bridge the gap between patients and healthcare professionals, making it easier to find and
              connect with the right medical expertise when you need it most.
            </p>
            <p className="text-gray-600 mb-4">
              Our platform leverages technology to simplify the process of finding specialists, scheduling
              appointments, and maintaining your health records. We're committed to improving healthcare
              experiences through innovation and user-centered design.
            </p>
            <p className="text-gray-600">
              With MediConnect, you can take control of your healthcare journey with confidence, knowing that
              qualified medical professionals are just a few clicks away.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="bg-gray-200 rounded-lg overflow-hidden shadow-xl">
              <img src="/api/placeholder/600/400" alt="Medical team" className="w-full h-auto" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
