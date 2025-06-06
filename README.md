# MediConnect

MediConnect is an all-in-one healthcare platform designed to seamlessly connect doctors and patients for hassle-free appointment scheduling, real-time consultations, secure payments, and easy access to medical resources. Built as my first solo MERN stack project, it offers robust features to enhance healthcare accessibility and communication.

---

## Table of Contents

- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Getting Started](#getting-started)  
- [Environment Variables](#environment-variables)  
- [Installation](#installation)  
- [Usage](#usage)  
- [Folder Structure](#folder-structure)  
- [API Endpoints](#api-endpoints)  
- [Contributing](#contributing)  
- [License](#license)  
- [Acknowledgments](#acknowledgments)  

---

## Features

- Separate dashboards & signup/login flows for doctors and patients with OTP and email verification  
- Doctor schedule management: create, edit, and track appointment slots and pricing  
- Patient functionalities: search doctors by name/specialization, book slots, and request appointments  
- Secure payments integrated via Razorpay  
- Real-time chat supporting text, images, and file sharing using Socket.IO  
- High-quality video calls with microphone, camera, and screen sharing powered by WebRTC  
- AI chatbot assistance via Hugging Face API  
- Nearby hospitals, pharmacies, and dispensaries search using Overpass API and Geolocation API, visualized with Leaflet.js  
- Comprehensive medicine search by name, price, and composition  
- User profile management with avatar uploads via Cloudinary  
- Authentication using JWT (access & refresh tokens), OTP via Twilio, and email verification via Nodemailer  
- File uploads handled with Multer and stored on Cloudinary  
- Notification system for appointment reminders and announcements  

---

## Tech Stack

**Frontend:**  
- React.js (Vite)  
- Tailwind CSS  
- GSAP & Three.js  
- Leaflet.js  

**Backend:**  
- Node.js & Express.js  
- MongoDB & Mongoose  
- JWT (Authentication)  
- Multer & Cloudinary (File uploads)  
- Twilio (OTP SMS verification)  
- Nodemailer (Email verification)  

**Real-time Communication:**  
- Socket.IO  
- WebRTC  

**Payments:**  
- Razorpay  

**AI Integration:**  
- Hugging Face API  

---

## Getting Started

### Prerequisites

- Node.js (v16 or later recommended)  
- npm or yarn  
- MongoDB instance (local or cloud)  
- Cloudinary account for file storage  
- Twilio account for OTP services  
- Razorpay account for payment integration  

### Environment Variables

Create a `.env` file in the root folder with the following variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SERVICE_SID=your_twilio_service_sid
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
EMAIL_USER=your_email_address_for_nodemailer
EMAIL_PASS=your_email_password_or_app_specific_password
HUGGINGFACE_API_KEY=your_huggingface_api_key
