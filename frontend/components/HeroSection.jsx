import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { gsap } from 'gsap';
import '../pages/theme.css'

import { useTheme } from '../context/ThemeContext';

const HeroSection = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const { theme } = useTheme();
  
  useEffect(() => {
    // Intersection Observer setup to detect when section is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1  // Trigger when at least 10% of the element is visible
      }
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    // Three.js scene setup
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100);
    camera.position.z = 7;
    camera.position.x = 2.5;
    camera.position.y = 0.5;
    scene.add(camera);
    
    // High-quality renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    rendererRef.current = renderer;
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Professional color palette - adjust based on theme
    const isDarkTheme = theme === 'dark';
    
    const colors = {
      primary: new THREE.Color(isDarkTheme ? '#2563eb' : '#0056b3'),    // Deep blue
      secondary: new THREE.Color(isDarkTheme ? '#3b82f6' : '#00a0e3'),  // Lighter blue
      accent: new THREE.Color(isDarkTheme ? '#1d4ed8' : '#e0f7fa'),     // Very light cyan / darker blue
      highlight: new THREE.Color(isDarkTheme ? '#60a5fa' : '#80deea')   // Light cyan / lighter blue
    };
    
    // Main sphere - more refined
    const sphereGeometry = new THREE.SphereGeometry(3.5, 96, 96); // Higher polygon count
    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      color: colors.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      metalness: 0.2,
      roughness: 0.5
    });
    const mainSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    mainSphere.position.set(4.5, 0, 0);
    mainSphere.castShadow = true;
    scene.add(mainSphere);
    
    // Glow sphere with better material
    const glowGeometry = new THREE.SphereGeometry(4, 96, 96);
    const glowMaterial = new THREE.MeshPhysicalMaterial({
      color: colors.secondary,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      metalness: 0.1,
      roughness: 0.3
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    glowSphere.position.set(4.5, 0, 0);
    scene.add(glowSphere);
    
    // Inner core for depth
    const coreGeometry = new THREE.SphereGeometry(2.8, 64, 64);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: colors.accent,
      wireframe: false,
      transparent: true,
      opacity: 0.05,
      metalness: 0.2,
      roughness: 0.8
    });
    const coreSphere = new THREE.Mesh(coreGeometry, coreMaterial);
    coreSphere.position.set(4.5, 0, 0);
    scene.add(coreSphere);
    
    // Enhanced particles system
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 350; // More particles
    
    const posArray = new Float32Array(particlesCount * 3);
    const scaleArray = new Float32Array(particlesCount);
    
    for (let i = 0; i < particlesCount; i++) {
      // Position
      posArray[i * 3] = (Math.random() - 0.5) * 12;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 12;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 12;
      
      // Scale variation
      scaleArray[i] = Math.random();
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('scale', new THREE.BufferAttribute(scaleArray, 1));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.03,
      sizeAttenuation: true,
      color: colors.highlight,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    
    // Professional lighting setup - adjusted for theme
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkTheme ? 0.2 : 0.3);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, isDarkTheme ? 0.6 : 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const pointLight1 = new THREE.PointLight(colors.primary.getHex(), isDarkTheme ? 1.2 : 1.5);
    pointLight1.position.set(3, 4, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(colors.secondary.getHex(), isDarkTheme ? 0.8 : 1);
    pointLight2.position.set(-4, -2, -3);
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(colors.highlight.getHex(), isDarkTheme ? 0.5 : 0.7);
    pointLight3.position.set(0, 3, -5);
    scene.add(pointLight3);
    
    // Enhanced GSAP Animations
    const animations = [];
    
    // Main sphere rotation - more natural movement
    animations.push(
      gsap.to(mainSphere.rotation, {
        y: Math.PI * 2,
        duration: 35,
        ease: "power1.inOut",
        repeat: -1
      })
    );
    
    animations.push(
      gsap.to(mainSphere.rotation, {
        x: Math.PI * 0.2,
        duration: 20,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    // Subtle scale pulsing for main sphere
    animations.push(
      gsap.to(mainSphere.scale, {
        x: 1.05,
        y: 1.05,
        z: 1.05,
        duration: 8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    // Glow sphere animations - counter rotation
    animations.push(
      gsap.to(glowSphere.rotation, {
        y: -Math.PI * 2,
        duration: 40,
        ease: "none",
        repeat: -1
      })
    );
    
    animations.push(
      gsap.to(glowSphere.rotation, {
        x: -Math.PI * 0.15,
        duration: 25,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    // Core animations
    animations.push(
      gsap.to(coreSphere.rotation, {
        y: Math.PI * 2,
        duration: 15,
        ease: "power1.inOut",
        repeat: -1
      })
    );
    
    animations.push(
      gsap.to(coreSphere.scale, {
        x: 1.1,
        y: 1.1,
        z: 1.1,
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    // Smooth camera movement
    animations.push(
      gsap.to(camera.position, {
        y: 0.3,
        duration: 10,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    animations.push(
      gsap.to(camera.position, {
        x: 2.7,
        duration: 15,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    // Particles animation - slow rotation
    animations.push(
      gsap.to(particlesMesh.rotation, {
        y: Math.PI * 0.15,
        duration: 40,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    animations.push(
      gsap.to(particlesMesh.rotation, {
        x: Math.PI * 0.1,
        duration: 45,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      })
    );
    
    // Function to pause/resume animations
    const toggleAnimations = (play) => {
      animations.forEach(anim => {
        if (play) {
          anim.play();
        } else {
          anim.pause();
        }
      });
    };
    
    // Enhanced mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    
    const handleMouseMove = (event) => {
      if (!isVisible) return;
      mouseX = (event.clientX / sizes.width - 0.5) * 0.2;
      mouseY = (event.clientY / sizes.height - 0.5) * 0.15;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    // Resize handling
    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    
    window.addEventListener('resize', handleResize);
    
    // Enhanced animation loop with mouse interaction
    const animate = () => {
      if (isVisible) {
        // Apply subtle mouse movement
        const targetX = mainSphere.position.x + mouseX * 0.5;
        const targetY = mainSphere.position.y + mouseY * 0.5;
        
        mainSphere.position.x += (targetX - mainSphere.position.x) * 0.05;
        mainSphere.position.y += (targetY - mainSphere.position.y) * 0.05;
        
        glowSphere.position.x = mainSphere.position.x;
        glowSphere.position.y = mainSphere.position.y;
        
        coreSphere.position.x = mainSphere.position.x;
        coreSphere.position.y = mainSphere.position.y;
        
        // Subtle particle movement
        particlesMesh.rotation.y += 0.0005;
        
        renderer.render(scene, camera);
      }
      
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      // Clean up observer
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Clean up event listeners
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      
      // Kill all GSAP animations
      animations.forEach(anim => anim.kill());
      
      // Cleanup scene
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [theme]); // Add theme as dependency to re-create scene when theme changes
  
  // Effect to pause/resume animations based on visibility
  useEffect(() => {
    const renderer = rendererRef.current;
    
    if (isVisible) {
      // Resume rendering
      if (animationFrameRef.current === null && renderer) {
        const animate = () => {
          renderer.render(sceneRef.current, sceneRef.current.children.find(child => child instanceof THREE.Camera));
          animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
      }
    } else {
      // Pause rendering
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isVisible]);
  
  return (
    <section ref={sectionRef} id="home" className="relative h-screen flex items-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0"></canvas>
      
      {/* Adjust gradient overlay based on theme */}
      <div className={`absolute inset-0 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-gray-900/60 via-gray-900/40 to-gray-900/30' 
          : 'bg-gradient-to-r from-gray-900/40 via-gray-900/20 to-gray-900/10'
      } z-0`}></div>
      
      <div className="container mx-auto px-6 z-10 relative">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.span 
              className={`inline-block ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              } font-semibold mb-3 text-lg tracking-wide transition-colors duration-300`}
            >
              Welcome to MediConnect
            </motion.span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className={`text-4xl md:text-6xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            } mb-6 leading-tight transition-colors duration-300`}
          >
            Connecting You With Healthcare Professionals
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
            className={`text-xl ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            } mb-8 leading-relaxed transition-colors duration-300`}
          >
            Schedule appointments with qualified doctors online, anytime, anywhere.
          </motion.p>
          
          <div className="flex flex-wrap gap-4">
            <motion.button 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              className={`${
                theme === 'dark' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-bold py-3 px-8 rounded-lg shadow-lg transform transition-all duration-300`}
            >
              Find a Doctor
            </motion.button>
            
            <motion.button 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)', 
                transition: { duration: 0.2 } 
              }}
              whileTap={{ scale: 0.98 }}
              className={`${
                theme === 'dark'
                  ? 'bg-slate-800 text-blue-400 border-2 border-blue-500'
                  : 'bg-white text-blue-600 border-2 border-blue-600'
              } font-bold py-3 px-8 rounded-lg shadow-md transform transition-all duration-300`}
            >
              Learn More
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;