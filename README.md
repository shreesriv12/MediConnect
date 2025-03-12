# MediConnect

MediConnect is an all-in-one healthcare platform designed to seamlessly connect **doctors** and **clients** for hassle-free appointment scheduling, real-time consultations, and easy access to medical resources. Whether you need to **book a doctor**, **chat for advice**, or **search for medicines**, MediConnect provides a smooth and secure experience.

## 🚀 Key Features

### 🔑 1. User Authentication & Roles
- Separate **Doctor & Client Signups**.
- JWT-based **authentication**.
- Role-based access control.

### 👨‍⚕️ 2. Doctor Features
- **Profile Management** (specialization, experience, fees).
- **Set Availability** (schedule open slots for consultations).
- **Manage Appointments** (approve/reject client requests).
- **View Payment History** (track payments from clients).
- **Real-time Chat with Clients**.

### 🏥 3. Client Features
- **Search & Filter Doctors** (specialization, experience, fees).
- **Request Appointments** (select an available time slot).
- **Cancel/Reschedule Requests**.
- **Make UPI Payments for Appointments**.
- **Real-time Chat with Doctors**.

### 📅 4. Appointment & Scheduling System
- Doctors set **available slots**.
- Clients **request appointments** (pending until approved).
- Doctors can **approve/reject** appointment requests.
- Clients get **email/notification reminders**.
- **Google Calendar integration** (optional).

### 💬 5. Real-time Chat System
- **Doctor-Client Messaging**.
- **Real-time Chat using Socket.io**.
- **Unread Message Notifications**.
- **File Uploads** (e.g., prescriptions, reports).

### 💳 6. UPI Payment Integration
- **Clients pay before appointment confirmation**.
- **Razorpay/PhonePe API integration**.
- **Track Payment Status** (pending, successful, failed).
- **Refund Handling for Cancellations**.

### 🤖 7. Chatbot for Medicine Search
- Users can **search for medicines**.
- Shows **basic info, uses, and side effects**.
- **Suggests alternative medicines** if unavailable.
- Data from **HealthOS, MediSearch API, or PharmGKB**.

### 📍 8. Nearby Hospitals Locator
- Users can **find hospitals near them**.
- Uses **Google Places API** to fetch hospital data.
- **Map integration** (Google Maps / OpenStreetMap).
- **Navigation & Directions**.

### 🏪 9. Pharmaceutical Product Search
- Users can **search for medicines & health products**.
- Filter by **category** (tablets, syrups, injections).
- Show **availability** (local pharmacies, online stores).
- Data from **HealthOS API or MongoDB database**.

### ⚙️ 10. Admin Panel (Optional)
- Manage **doctors & clients**.
- Approve new **doctor registrations**.
- View **payment history & transactions**.

### 📄 11. E-Prescriptions & Medical Records
- Doctors can **digitally prescribe medicines**.
- Clients can **download prescriptions** in PDF format.
- Secure storage of **past medical records & prescriptions**.

### 🎥 12. Video Consultation
- Secure **video calls** for remote consultations.
- **Twilio / WebRTC integration**.
- **Screen sharing & file uploads** (e.g., reports, X-rays).

### ⏰ 13. Health Tracker & Reminders
- Clients can **track vitals** (blood pressure, sugar levels, weight).
- Automated **medication & appointment reminders** via email/SMS.
- Daily health **tips & suggestions**.

### 🏦 14. Insurance & Health Plans Integration
- Clients can **link health insurance policies**.
- Show **coverage details & claim eligibility**.
- Integration with **insurance providers**.

### 🌍 15. Multilingual Support
- Support for **multiple languages** (English, Hindi, Spanish, etc.).
- Auto-translation for **chat messages & prescriptions**.

### 🏥 16. AI-Powered Symptom Checker
- Users input symptoms, and an **AI model** suggests possible conditions.
- Provides **advice on consulting a doctor**.
- Uses **NLP-based health diagnosis models**.

### ⭐ 17. Doctor Ratings & Reviews
- Clients can **rate & review doctors**.
- Reviews can include **feedback on consultation quality**.
- Doctors can **respond to reviews**.

### 🚨 18. Emergency Services & SOS Button
- Quick access to **emergency contacts & ambulance services**.
- **One-tap SOS button** to call an ambulance.
- Integration with **local emergency numbers**.

### 👨‍👩‍👧‍👦 19. Family Account Management
- Clients can **add family members** under one account.
- Manage **appointments & records** for parents, children, etc.
- Doctors can **view family medical history**.

### 🎯 20. AI-Based Doctor Recommendation
- Recommends **best doctors** based on specialization, reviews, and availability.
- Uses **ML algorithms** for better doctor-client matching.

### 🌑 21. Dark & Light Mode
- **Toggle between dark and light mode** for better accessibility.
- Uses **Tailwind CSS dark mode** (`darkMode: 'class'`).
- Saves preference in **local storage**.

## 🛠 Tech Stack

### **Frontend:**
- **React.js** (with Tailwind CSS for styling).
- **Context API / Redux** for state management.

### **Backend:**
- **Node.js + Express.js** (REST API development).
- **MongoDB + Mongoose** (Database).
- **Socket.io** (for real-time chat and notifications).

### **APIs & Integrations:**
- **Google Maps API** (Nearby hospitals).
- **Razorpay/PhonePe API** (UPI payments).
- **HealthOS, PharmGKB API** (Medicine search).
- **Twilio / WebRTC** (Video Consultation).

## 📌 Installation & Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/shreesriv12/MediConnect.git
   cd MediConnect
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables in a `.env` file.
4. Run the development server:
   ```sh
   npm run dev
   ```

## 🎯 Future Enhancements
- AI-powered **voice-based chat assistant**.
- Integration with **wearable health devices**.
- **Blockchain-based** medical record storage.

---

### 🚀 **MediConnect – Making Healthcare More Accessible & Convenient!**
