import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { gsap } from 'gsap';

const MediConnectHomepage = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const threeJsContainer = useRef(null);
  const heroSection = useRef(null);
  const aboutSection = useRef(null);
  const contactSection = useRef(null);
  

  const ThreeJsAnimation = () => {
    const threeJsContainer = useRef(null);
  
    useEffect(() => {
      if (!threeJsContainer.current) return;
  
      // Scene setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        threeJsContainer.current.clientWidth / threeJsContainer.current.clientHeight,
        0.1,
        1000
      );
  
      const renderer = new THREE.WebGLRenderer({
        alpha: false, // No transparency issues
        antialias: true,
        powerPreference: "high-performance"
      });
  
      // Set canvas size
      renderer.setSize(
        threeJsContainer.current.clientWidth,
        threeJsContainer.current.clientHeight
      );
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
      // Add canvas to DOM
      setTimeout(() => {
        if (threeJsContainer.current) {
          threeJsContainer.current.appendChild(renderer.domElement);
        }
      }, 100);
  
      // Terrain with wave effect
      const planeGeometry = new THREE.PlaneGeometry(30, 30, 50, 50);
      const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        wireframe: false,
        metalness: 0.7,
        roughness: 0.2,
        side: THREE.DoubleSide
      });
  
      const terrain = new THREE.Mesh(planeGeometry, planeMaterial);
      terrain.rotation.x = -Math.PI / 2;
      terrain.position.y = -5;
      scene.add(terrain);
  
      // Store initial vertex positions for wave effect
      const initialPositions = [];
      const { array: positions } = terrain.geometry.attributes.position;
  
      for (let i = 0; i < positions.length; i += 3) {
        initialPositions.push({
          x: positions[i],
          y: positions[i + 1],
          z: positions[i + 2],
          rand: Math.random(),
          amp: 0.5 + Math.random() * 0.5,
          freq: 0.5 + Math.random() * 0.5
        });
      }
  
      // Floating spheres
      const spheres = [];
      const sphereCount = 15;
  
      for (let i = 0; i < sphereCount; i++) {
        const size = 0.2 + Math.random() * 0.5;
        const geometry = new THREE.SphereGeometry(size, 16, 16);
  
        const hue = Math.random() * 360;
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(`hsl(${hue}, 80%, 60%)`),
          emissive: new THREE.Color(`hsl(${hue}, 80%, 40%)`),
          emissiveIntensity: 0.2,
          metalness: 0.8,
          roughness: 0.2
        });
  
        const sphere = new THREE.Mesh(geometry, material);
  
        const radius = Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        sphere.position.set(
          Math.cos(angle) * radius,
          1 + Math.random() * 5,
          Math.sin(angle) * radius
        );
  
        sphere.userData = {
          speed: 0.005 + Math.random() * 0.01,
          radius,
          angle,
          verticalSpeed: 0.01 + Math.random() * 0.01,
          verticalRange: 0.5 + Math.random()
        };
  
        spheres.push(sphere);
        scene.add(sphere);
      }
  
      // Lighting
      const ambientLight = new THREE.AmbientLight(0x333344, 1);
      scene.add(ambientLight);
  
      const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
      mainLight.position.set(5, 10, 5);
      scene.add(mainLight);
  
      const blueLight = new THREE.PointLight(0x0066ff, 1, 20);
      blueLight.position.set(-5, 3, -5);
      scene.add(blueLight);
  
      // Camera position
      camera.position.set(0, 7, 15);
      camera.lookAt(0, 0, 0);
  
      // Animation loop
      let frame = 0;
      let animationFrameId;
  
      const animate = () => {
        frame++;
        animationFrameId = requestAnimationFrame(animate);
  
        // Wave animation on terrain
        for (let i = 0; i < initialPositions.length; i++) {
          const initialPos = initialPositions[i];
          const idx = i * 3;
  
          positions[idx + 2] = initialPos.z + 
            Math.sin(frame * 0.01 * initialPos.freq + initialPos.rand * 10) * initialPos.amp;
        }
  
        terrain.geometry.attributes.position.needsUpdate = true;
  
        // Animate spheres
        spheres.forEach((sphere) => {
          const { speed, radius, verticalSpeed, verticalRange } = sphere.userData;
  
          sphere.userData.angle += speed;
          sphere.position.x = Math.cos(sphere.userData.angle) * radius;
          sphere.position.z = Math.sin(sphere.userData.angle) * radius;
  
          sphere.position.y += Math.sin(frame * verticalSpeed) * 0.01 * verticalRange;
  
          sphere.rotation.x += 0.01;
          sphere.rotation.y += 0.01;
        });
  
        // Camera slight movement
        camera.position.x = Math.sin(frame * 0.0005) * 2;
        camera.position.y = 7 + Math.sin(frame * 0.0007) * 0.5;
        camera.lookAt(0, 0, 0);
  
        blueLight.intensity = 1 + Math.sin(frame * 0.01) * 0.3;
  
        renderer.render(scene, camera);
      };
  
      // Resize handler
      const handleResize = () => {
        if (!threeJsContainer.current) return;
  
        const width = threeJsContainer.current.clientWidth;
        const height = threeJsContainer.current.clientHeight;
  
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
  
      window.addEventListener("resize", handleResize);
  
      // Start animation
      animate();
  
      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animationFrameId);
  
        if (threeJsContainer.current) {
          threeJsContainer.current.removeChild(renderer.domElement);
        }
  
        planeGeometry.dispose();
        planeMaterial.dispose();
  
        spheres.forEach((sphere) => {
          sphere.geometry.dispose();
          sphere.material.dispose();
          scene.remove(sphere);
        });
  
        scene.remove(terrain);
        scene.remove(ambientLight);
        scene.remove(mainLight);
        scene.remove(blueLight);
  
        renderer.dispose();
      };
    }, []);

}
  // GSAP animations
  useEffect(() => {
    if (heroSection.current) {
      gsap.from('.hero-title', {
        duration: 1.2,
        y: 100,
        opacity: 0,
        ease: 'power4.out',
        delay: 0.2
      });
      
      gsap.from('.hero-subtitle', {
        duration: 1.2,
        y: 50,
        opacity: 0,
        ease: 'power4.out',
        delay: 0.4
      });
      
      gsap.from('.cta-button', {
        duration: 0.8,
        scale: 0.8,
        opacity: 0,
        ease: 'back.out(1.7)',
        delay: 0.6
      });
    }
    
    if (aboutSection.current) {
      const aboutTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: aboutSection.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });
      
      aboutTimeline
        .from('.about-title', {
          duration: 0.8,
          y: 50,
          opacity: 0,
          ease: 'power3.out'
        })
        .from('.about-card', {
          duration: 0.8,
          y: 40,
          opacity: 0,
          stagger: 0.2,
          ease: 'power3.out'
        }, '-=0.4');
    }
  }, []);
  
  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleNavigation = (section) => {
    setActiveSection(section);
    setIsMenuOpen(false);
  };
  
  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Form submission logic would go here
    alert('Thank you for your message! We will get back to you soon.');
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-gray-900 bg-opacity-90 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </motion.div>
            <motion.span 
              className="text-xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              MediConnect
            </motion.span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {['home', 'about', 'services', 'doctors', 'contact'].map((item) => (
              <motion.a
                key={item}
                href={`#${item}`}
                className={`text-sm uppercase font-medium tracking-wider hover:text-blue-400 transition-colors ${activeSection === item ? 'text-blue-400' : 'text-gray-300'}`}
                onClick={() => handleNavigation(item)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {item}
              </motion.a>
            ))}
            <motion.button
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              LOGIN/SIGNUP
            </motion.button>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <motion.button
              onClick={handleMenuToggle}
              className="text-gray-200 focus:outline-none"
              whileTap={{ scale: 0.95 }}
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="md:hidden bg-gray-800 border-b border-gray-700"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="container mx-auto px-4 py-2 flex flex-col space-y-2">
                {['home', 'about', 'services', 'doctors', 'contact'].map((item) => (
                  <a
                    key={item}
                    href={`#${item}`}
                    className={`py-2 px-4 text-sm uppercase font-medium tracking-wider hover:bg-gray-700 rounded ${activeSection === item ? 'text-blue-400' : 'text-gray-300'}`}
                    onClick={() => handleNavigation(item)}
                  >
                    {item}
                  </a>
                ))}
                <button className="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-md text-sm font-medium transition-colors">
                  BOOK APPOINTMENT
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="home" ref={heroSection} className="relative h-screen flex items-center overflow-hidden">
        {/* Three.js Animation Container */}
        <div ref={threeJsContainer} className="absolute inset-0 z-0" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <motion.h1 
              className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Your Health, Our Priority
            </motion.h1>
            
            <motion.p 
              className="hero-subtitle mt-4 text-xl text-gray-300 md:pr-8"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              Connect with top healthcare professionals and schedule appointments with ease. Your path to better health starts here.
            </motion.p>
            
            <motion.div 
              className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <motion.button
                className="cta-button bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Find a Doctor
              </motion.button>
              <motion.button
                className="cta-button border border-gray-400 hover:border-white text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Learn More
              </motion.button>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" ref={aboutSection} className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.h2 
            className="about-title text-3xl md:text-4xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            Why Choose <span className="text-blue-500">MediConnect</span>
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                title: "Verified Specialists",
                description: "All doctors are verified professionals with proven expertise in their medical fields."
              },
              {
                icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                title: "Quick Appointments",
                description: "Book appointments in minutes and see available doctors in real-time."
              },
              {
                icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                title: "Secure & Private",
                description: "Your health data is secure with our HIPAA-compliant platform and strict privacy measures."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="about-card bg-gray-900 p-6 rounded-lg border border-gray-700 flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.3)" }}
              >
                <div className="w-16 h-16 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              MediConnect has helped over 50,000 patients find the right healthcare specialists since 2022. Our mission is to make quality healthcare accessible to everyone.
            </p>
            <motion.button
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Our Story
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            Our <span className="text-blue-500">Services</span>
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Find Specialists",
                description: "Search for specialists by specialty, location, or availability",
                icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              },
              {
                title: "Book Appointments",
                description: "Schedule in-person or telehealth appointments in just a few clicks",
                icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              },
              {
                title: "Medical Records",
                description: "Access and share your medical records securely with providers",
                icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              },
              {
                title: "Prescription Refills",
                description: "Request prescription refills and manage medications online",
                icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              }
            ].map((service, index) => (
              <motion.div
                key={index}
                className="bg-gray-800 p-6 rounded-lg border border-gray-700"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)" }}
              >
                <div className="w-12 h-12 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={service.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-400">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" ref={contactSection} className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            Get in <span className="text-blue-500">Touch</span>
          </motion.h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-semibold mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-200">Phone</h4>
                    <p className="text-gray-400 mt-1">+1 (555) 123-4567</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-200">Email</h4>
                    <p className="text-gray-400 mt-1">support@mediconnect.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-200">Address</h4>
                    <p className="text-gray-400 mt-1">123 Health Avenue, Suite 400<br />San Francisco, CA 94103</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10">
                <h4 className="font-medium text-gray-200 mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  {['M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22', 
                  'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z', 
                  'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z', 
                  'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'
                  ].map((path, index) => (
                    <motion.a
                      key={index}
                      href="#"
                      className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                      whileHover={{ y: -3 }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                      </svg>
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-semibold mb-6">Send us a Message</h3>
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  ></textarea>
                </div>
                
                <motion.button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors w-full md:w-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Send Message
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span className="text-xl font-bold">MediConnect</span>
              </div>
              <p className="text-gray-400 mb-6">
                Connecting patients with healthcare providers for better health outcomes.
              </p>
              <div className="flex space-x-4">
                {['M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22', 
                'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'].map((path, index) => (
                  <a
                    key={index}
                    href="#"
                    className="w-8 h-8 bg-gray-800 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {['Home', 'About Us', 'Services', 'Find a Doctor', 'Contact Us'].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6">Services</h4>
              <ul className="space-y-3">
                {['Find Specialists', 'Book Appointments', 'Medical Records', 'Prescription Refills', 'Telehealth'].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6">Legal</h4>
              <ul className="space-y-3">
                {['Terms of Service', 'Privacy Policy', 'HIPAA Compliance', 'Accessibility', 'Cookie Policy'].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} MediConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MediConnectHomepage;