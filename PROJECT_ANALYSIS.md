# MediConnect Project Structure Analysis

**Project Type:** Full-stack MERN (MongoDB, Express, React, Node.js) Healthcare Platform  
**Deployment:** Vercel (Frontend), Render (Backend)  
**Last Updated:** April 2026

---

## Table of Contents
1. [Frontend Structure](#frontend-structure)
2. [Backend Structure](#backend-structure)
3. [Database Models](#database-models)
4. [Tech Stack](#tech-stack)

---

## FRONTEND STRUCTURE

### Frontend Base Directory: `frontend/`

---

### 1. COMPONENTS (`frontend/components/`)

#### UI & Layout Components

| Component File | Purpose | Key Features |
|---|---|---|
| [Navbar.jsx](frontend/components/Navbar.jsx) | Main navigation bar for homepage | Auth modal integration, theme toggle, responsive menu |
| [Layout.jsx](frontend/components/Layout.jsx) | Root layout wrapper | Outlets, auth state management, navigation logic |
| [Footer.jsx](frontend/components/Footer.jsx) | Footer section | Links, branding, copyright info |
| [HeroSection.jsx](frontend/components/HeroSection.jsx) | Landing page hero with 3D animation | Three.js integration, GSAP animations, IntersectionObserver |
| [Services.jsx](frontend/components/Services.jsx) | Services showcase section | Appointment booking, doctor search, consultations, health records |
| [AboutUs.jsx](frontend/components/AboutUs.jsx) | About MediConnect section | Framer motion animations, theme support |
| [ContactForm.jsx](frontend/components/ContactForm.jsx) | Contact form component | Form submission, theme aware styling |

#### Authentication Components

| Component File | Purpose | Key Features |
|---|---|---|
| [AuthModal.jsx](frontend/components/AuthModal.jsx) | Modal for client/doctor auth switching | Tabs for client/doctor, login/signup toggle |
| [ClientDashboardNavbar.jsx](frontend/components/ClientDashboardNavbar.jsx) | Navbar for authenticated clients | Logout, theme toggle, responsive menu |
| [DoctorDahboardNavbar.jsx](frontend/components/DoctorDahboardNavbar.jsx) | Navbar for authenticated doctors | Logout, theme toggle, responsive menu |

#### User Profile Components

| Component File | Purpose | Key Features |
|---|---|---|
| [ClientProfile.jsx](frontend/components/ClientProfile.jsx) | Client profile edit/view page | Avatar upload, form validation, profile update |
| [DoctorProfile.jsx](frontend/components/DoctorProfile.jsx) | Doctor profile edit/view page | Avatar upload, specialization, experience fields |

#### Feature Components

| Component File | Purpose | Key Features |
|---|---|---|
| [PatientBookingPortal.jsx](frontend/components/PatientBookingPortal.jsx) | Doctor booking interface for patients | Doctor search, schedule view, slot booking |
| [DoctorSchedue.jsx](frontend/components/DoctorSchedue.jsx) | Schedule management for doctors | Create/view/edit schedules, slot management |
| [Doctordirectory.jsx](frontend/components/Doctordirectory.jsx) | Doctor appointments list | Filter by status, date range, appointment details |
| [DoctorPayementPortal.jsx](frontend/components/DoctorPayementPortal.jsx) | Payment history dashboard | Transaction list, filtering, status tracking |
| [ChatBot.jsx](frontend/components/ChatBot.jsx) | AI chatbot widget | Session management, message history, API integration |
| [GetDoctor.jsx](frontend/components/GetDoctor.jsx) | Add all doctors directory/search | Doctor listing, search, filter by specialization |
| [NearbyClinicMap.jsx](frontend/components/NearbyClinicMap.jsx) | Medical facilities finder map | Leaflet map, location search, radius filtering |

---

### 2. PAGES (`frontend/pages/`)

| Page File | Route Purpose | Key Features |
|---|---|---|
| [HomePage.jsx](frontend/pages/HomePage.jsx) | Landing page (`/`) | Navbar, HeroSection, Services, AboutUs, ContactForm, Footer |
| [ClientLogin.jsx](frontend/pages/ClientLogin.jsx) | Client login page (`/clientlogin`) | Email/password auth, form validation, error handling |
| [ClientSignup.jsx](frontend/pages/ClientSignup.jsx) | Client registration (`/clientsignup`) | Multi-step signup, OTP verification, avatar upload |
| [DoctorLogin.jsx](frontend/pages/DoctorLogin.jsx) | Doctor login page (`/doctorlogin`) | Email/password auth, redirect to dashboard |
| [DoctorSignup.jsx](frontend/pages/DoctorSignup.jsx) | Doctor registration (`/doctorsignup`) | Specialization, experience fields, OTP verification |
| [ClientDashboard.jsx](frontend/pages/ClientDashboard.jsx) | Client dashboard (`/clientdashboard`) | Protected route, welcome message, ChatBot integration |
| [DoctorDashboard.jsx](frontend/pages/DoctorDashboard.jsx) | Doctor dashboard (`/doctordashboard`) | Protected route, welcome message, navigation |
| [ChatPage.jsx](frontend/pages/ChatPage.jsx) | Chat interface (`/chat`) | Real-time chat with Socket.io, message pagination |
| [VideoPage.jsx](frontend/pages/VideoPage.jsx) | Video call page (`/video`) | WebRTC video calls, media controls, call history |
| [MedicineSearch.jsx](frontend/pages/MedicineSearch.jsx) | Medicine search (`/medicines`) | Real-time search, debounced queries, medicine details |
| [theme.css](frontend/pages/theme.css) | Global theme styles | Light/dark mode CSS variables |

---

### 3. STATE MANAGEMENT - STORES (`frontend/store/`)

#### Using Zustand for state management

| Store File | Purpose | Key State | Methods |
|---|---|---|---|
| [clientAuthStore.js](frontend/store/clientAuthStore.js) | Client authentication | `client`, `isAuthenticated`, `error`, `isLoading` | `register()`, `login()`, `logout()`, `updateProfile()`, `verifyOtp()`, `verifyEmail()` |
| [doctorAuthStore.js](frontend/store/doctorAuthStore.js) | Doctor authentication | `doctor`, `isAuthenticated`, `error`, `isLoading` | `register()`, `login()`, `logout()`, `updateProfile()`, `getCurrentDoctor()` |
| [chatStore.js](frontend/store/chatStore.js) | Chat management | `chats`, `messages`, `currentChat`, `socket`, `pagination` | `connectSocket()`, `sendMessage()`, `fetchChats()`, `loadMessages()` |
| [videoStore.js](frontend/store/videoStore.js) | Video call state | `calls`, `activeCalls`, `currentCall`, `mediaState` | `initiateCall()`, `acceptCall()`, `endCall()`, `toggleCamera()`, `toggleMicrophone()` |
| [schedule.store.js](frontend/store/schedule.store.js) | Schedule management | `schedules`, `availableSlots`, `analytics` | `fetchSchedules()`, `createSchedule()`, `deleteSchedule()` |

---

### 4. CONTEXTS (`frontend/context/`)

| Context File | Purpose | Exports | Usage |
|---|---|---|---|
| [ThemeContext.jsx](frontend/context/ThemeContext.jsx) | Light/dark theme management | `ThemeProvider`, `useTheme()` | `{ theme, toggleTheme }` - Used globally for styling |
| [ChatContext.js](frontend/context/ChatContext.js) | Chat functionality context | `ChatProvider`, `useChat()` | `{ chats, activeChat, messages }` - Legacy, prefer chatStore |

---

### 5. HOOKS (`frontend/hooks/`)

| Hook File | Purpose | Functionality |
|---|---|---|
| [ChatIntegration.jsx](frontend/hooks/ChatIntegration.jsx) | Chat initialization hook | Setup socket listeners, fetch conversations on auth |

---

### 6. SERVICES (`frontend/services/`)

| Service File | Purpose | Exports |
|---|---|---|
| [socket.js](frontend/services/socket.js) | Socket.io client initialization | `socket` - Global socket instance |

---

### 7. UTILITIES (`frontend/utils/`)

**Common utility files (not listed in directory but imported across components):**
- `axois.js` - Axios instance with auth interceptors
- `constants.js` - App constants
- Various formatting and helper utilities

---

### Tech Stack - Frontend `package.json`

#### Core Dependencies

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router-dom": "^7.4.1",
  "zustand": "^5.0.3"
}
```

#### Animation & UI

```json
{
  "framer-motion": "^12.6.2",
  "gsap": "^3.12.7",
  "tailwindcss": "^4.0.13",
  "@tailwindcss/vite": "^4.0.13",
  "lucide-react": "^0.487.0",
  "react-icons": "^5.5.0"
}
```

#### State & Data

```json
{
  "axios": "^1.9.0",
  "socket.io-client": "^4.8.1"
}
```

#### Maps & 3D

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0",
  "three": "^0.125.1"
}
```

#### Utilities

```json
{
  "date-fns": "^4.1.0",
  "react-hot-toast": "^2.5.2",
  "dotenv": "^16.5.0",
  "swiper": "^11.2.6"
}
```

#### Dev Dependencies

```json
{
  "vite": "^6.2.0",
  "eslint": "^9.21.0"
}
```

---

## BACKEND STRUCTURE

### Backend Base Directory: `backend/`

---

### 1. ROUTES (`backend/src/routes/`)

| Route File | Base Path | Endpoints Handled | Purpose |
|---|---|---|---|
| [client.routes.js](backend/src/routes/client.routes.js) | `/client` | `POST /register`, `POST /login`, `POST /verify-email`, `POST /verify-otp`, `POST /logout`, `POST /refresh-token`, `GET /me`, `PATCH /update`, `GET /`, `GET /:id` | Client authentication & profile |
| [doctor.routes.js](backend/src/routes/doctor.routes.js) | `/doctor` | `POST /register`, `POST /login`, `POST /verify-otp`, `POST /verify-email`, `POST /logout`, `POST /refresh-token`, `GET /me`, `PATCH /update`, `GET /`, `GET /:id` | Doctor authentication & profile |
| [chat.routes.js](backend/src/routes/chat.routes.js) | `/chat` | `POST /create-or-get`, `GET /user-chats`, `POST /send-message`, `GET /:chatId/messages`, `PATCH /:chatId/mark-read`, `DELETE /:chatId/messages/:messageId` | Real-time messaging |
| [schedule.routes.js](backend/src/routes/schedule.routes.js) | `/schedule` | `POST /create`, `GET /` | Doctor schedule creation & retrieval |
| [payment.routes.js](backend/src/routes/payment.routes.js) | `/payment` | `POST /order`, `POST /verify`, `GET /history` | Razorpay payment processing |
| [video.routes.js](backend/src/routes/video.routes.js) | `/video` | `POST /initiate`, `PATCH /:callId/accept`, `PATCH /:callId/reject`, `PATCH /:callId/end`, `GET /history`, `POST /:callId/rate`, `POST /:callId/report-issue`, `GET /active`, Media controls | Video call management |
| [medicine.routes.js](backend/src/routes/medicine.routes.js) | `/medicine` | `GET /search?name=xyz` | Medicine search from dataset |
| [clinic.routes.js](backend/src/routes/clinic.routes.js) | `/clinic` | Overpass API queries | Find nearby clinics/hospitals |
| [slotRequest.routes.js](backend/src/routes/slotRequest.routes.js) | `/slot-request` | `POST /request`, `PUT /:requestId/status` | Appointment slot requests |

---

### 2. CONTROLLERS (`backend/src/controllers/`)

#### Client Controller (`client.controllers.js`)

**Functions:**
- `registerClient()` - Client signup with avatar & OTP
- `loginClient()` - Email/password login
- `verifyEmail()` - OTP verification
- `verifyOtp()` - OTP validation
- `logoutClient()` - Clear tokens & session
- `refreshAccessToken()` - Refresh JWT token
- `getCurrentClient()` - Get logged-in client data
- `updateClient()` - Update profile & avatar
- `getAllClients()` - Admin fetch all clients
- `getClientById()` - Get specific client details

#### Doctor Controller (`doctor.controllers.js`)

**Functions:**
- `registerDoctor()` - Doctor signup with specialization
- `loginDoctor()` - Email/password login
- `verifyEmail()` - OTP verification
- `verifyOtp()` - OTP validation
- `logoutDoctor()` - Clear tokens & session
- `refreshAccessToken()` - Refresh JWT token
- `getCurrentDoctor()` - Get logged-in doctor data
- `updateDoctor()` - Update profile & avatar
- `getAllDoctors()` - List all doctors
- `getDoctorById()` - Get specific doctor details

#### Chat Controller (`chat.controller.js`)

**Functions:**
- `createOrGetChat()` - Create new chat or retrieve existing
- `getUserChats()` - Get all chats for user
- `sendMessage()` - Send message with file upload
- `getChatMessages()` - Fetch paginated messages
- `markMessagesAsRead()` - Mark read status
- `deleteMessage()` - Delete message

#### Schedule Controller (`schedule.controllers.js`)

**Functions:**
- `createSchedule()` - Doctor creates availability slots
- `getDoctorSchedule()` - Fetch doctor's schedule

#### Video Controller (`video.controller.js`)

**Functions:**
- `initiateCall()` - Start video/audio call
- `acceptCall()` - Accept incoming call
- `rejectCall()` - Reject incoming call
- `endCall()` - End active call
- `getCallHistory()` - Fetch call history
- `rateCall()` - Rate completed call
- `reportIssue()` - Report call issue
- `getActiveCalls()` - Get active calls
- `toggleCamera()` - Enable/disable camera
- `toggleMicrophone()` - Enable/disable mic
- `toggleScreenShare()` - Enable/disable screen share
- `getMediaPermissions()` - Check media permissions
- `updateMediaQuality()` - Update video/audio quality

#### Payment Controller (`payment.controllers.js`)

**Functions:**
- `createOrder()` - Create Razorpay order
- `verifyPayment()` - Verify payment status
- `getDoctorPaymentHistory()` - Fetch payment records

#### Slot Request Controller (`slotRequest.controllers.js`)

**Functions:**
- `requestSlot()` - Patient requests appointment slot
- `updateSlotRequestStatus()` - Doctor accepts/rejects request

---

### 3. MODELS (`backend/src/models/`)

#### Client Model (`client.model.js`)

**Schema Fields:**
```javascript
{
  name: String (required, trimmed),
  email: String (required, unique, trimmed),
  age: Number (required),
  gender: String (enum: Male/Female/Other),
  password: String (required, hashed with bcrypt),
  phone: String (required, unique, E.164 format),
  avatar: String (URL),
  verified: Boolean (default: false),
  refreshToken: String,
  verificationToken: String,
  tokenVersion: Number (default: 0),
  otp: String,
  otpExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Methods:**
- `isPasswordCorrect(password)` - Compare passwords
- `generateAccessToken()` - JWT access token
- `generateRefreshToken()` - JWT refresh token

---

#### Doctor Model (`doctor.models.js`)

**Schema Fields:**
```javascript
{
  name: String (required, indexed, trimmed),
  email: String (required, unique, indexed, trimmed),
  password: String (required, hashed),
  specialization: String (required),
  experience: Number (required),
  degree: String (required),
  age: Number (required),
  phone: String (required, unique, E.164 format),
  gender: String (enum: Male/Female/Other),
  avatar: String (required),
  verified: Boolean (default: false),
  refreshToken: String,
  verificationToken: String,
  tokenVersion: Number (default: 0),
  otp: String,
  otpExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Methods:**
- `isPasswordCorrect(password)` - Compare passwords
- `generateAccessToken()` - JWT access token
- `generateRefreshToken()` - JWT refresh token

---

#### Chat Model (`chat.model.js`)

**Schema Fields:**
```javascript
{
  participants: [{
    userId: ObjectId (refPath: 'participants.userType'),
    userType: String (enum: Doctor/Client),
    _id: ObjectId
  }],
  messages: [{
    content: String (required, trimmed),
    messageType: String (enum: text/image/file/voice, default: text),
    fileUrl: String,
    createdAt: Date (default: now),
    readBy: [{
      userId: ObjectId (refPath: 'readBy.userType'),
      userType: String (enum: Doctor/Client),
      readAt: Date
    }],
    sender: {
      userId: ObjectId (refPath: 'sender.userType'),
      userType: String (enum: Doctor/Client)
    }
  }],
  lastMessage: Date (default: now),
  isActive: Boolean (default: true),
  chatType: String (enum: consultation/followup/general, default: consultation),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `participants.userId`, `lastMessage`, `createdAt`

---

#### Schedule Model (`schedule.model.js`)

**Schema Fields:**
```javascript
{
  doctorId: ObjectId (ref: Doctor, required),
  date: String (format: "YYYY-MM-DD", required),
  slots: [{
    time: String (required),
    fee: Number (required),
    isBooked: Boolean (default: false),
    bookedBy: ObjectId (ref: Client),
    requestId: ObjectId (ref: SlotRequest)
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

#### Video Model (`video.model.js`)

**Schema Fields:**
```javascript
{
  participants: [{
    userId: ObjectId (refPath: 'participants.userType'),
    userType: String (enum: Doctor/Client),
    joinedAt: Date,
    leftAt: Date,
    mediaState: {
      cameraEnabled: Boolean,
      microphoneEnabled: Boolean,
      screenSharing: Boolean,
      qualitySettings: {
        videoQuality: String (enum: low/medium/high),
        audioQuality: String (enum: low/medium/high),
        updatedAt: Date
      }
    }
  }],
  initiator: { userId, userType },
  callStatus: String (enum: initiated/ringing/ongoing/ended/rejected),
  callType: String (enum: video/audio),
  roomId: String (required, unique),
  startTime: Date,
  endTime: Date,
  duration: Number (in seconds)
}
```

---

#### Payment Model (`payment.model.js`)

**Schema Fields:**
```javascript
{
  slotRequestId: ObjectId (ref: SlotRequest, required),
  doctorId: ObjectId (ref: Doctor, required),
  patientId: ObjectId (ref: Client, required),
  amount: Number (required),
  status: String (enum: success/failed, required),
  transactionId: String (required),
  paymentGateway: String (default: "Razorpay"),
  createdAt: Date,
  updatedAt: Date
}
```

---

#### Slot Request Model (`slotRequest.model.js`)

**Schema Fields:**
```javascript
{
  doctorId: ObjectId (ref: Doctor, required),
  patientId: ObjectId (ref: Client, required),
  scheduleId: ObjectId (ref: Schedule, required),
  slotIndex: Number (required),
  date: String (required),
  time: String (required),
  fee: Number (required),
  status: String (enum: pending/accepted/rejected, default: pending),
  paymentStatus: String (enum: unpaid/paid, default: unpaid),
  createdAt: Date,
  updatedAt: Date
}
```

---

#### Medicine Model (`medicine.model.js`)

**Schema Fields:**
```javascript
{
  id: Number,
  name: String,
  "price(₹)": Number,
  Is_discontinued: Boolean,
  manufacturer_name: String,
  type: String,
  pack_size_label: String,
  short_composition1: String,
  short_composition2: String
}
```

**Collection:** "medicines" (pre-loaded from CSV)

---

### 4. MIDDLEWARES (`backend/src/middlewares/`)

#### Authentication Middleware (`auth.middleware.js`)

**Function:** `isAuthenticated`

- Checks for token in cookies or Authorization header
- Verifies JWT signature against `ACCESS_TOKEN_SECRET`
- Looks up user in Doctor collection, then Client collection
- Attaches user to `req.doctor` or `req.client`
- Attaches `req.userType` (doctor/client)
- Returns 401 if token missing or invalid

**Exports:**
```javascript
export const isAuthenticated = async (req, res, next) => { ... }
```

---

#### Multer Middleware (`multer.middleware.js`)

**Storage Configuration:**
- Destination: `public/temp/` (created if doesn't exist)
- Filename: Original filename
- Supports all MIME types

**Exports:**
```javascript
export const upload = multer({ storage })
```

**Usage:** `upload.single('fieldName')` for single file upload

---

### 5. CONFIG & UTILS (`backend/src/config/` & `backend/src/utils/`)

#### Config Files

| File | Purpose |
|---|---|
| [db.js](backend/src/config/db.js) | MongoDB connection using mongoose |

---

#### Utility Files

| File | Purpose | Key Functions/Exports |
|---|---|---|
| [ApiError.js](backend/src/utils/ApiError.js) | Custom error class | `class ApiError` - extends Error with statusCode |
| [ApiResponse.js](backend/src/utils/ApiResponse.js) | Standard API response | `class ApiResponse` - consistent response format |
| [asyncHandler.js](backend/src/utils/asyncHandler.js) | Async error wrapper | `asyncHandler(requestHandler)` - catches promise rejections |
| [cloudinary.js](backend/src/utils/cloudinary.js) | Image upload service | `uploadToCloud(localPath)`, `deleteLocalFile()` |
| [razorpay.js](backend/src/utils/razorpay.js) | Payment gateway | `razorpay` - Razorpay instance |
| [sendotp.js](backend/src/utils/sendotp.js) | SMS OTP service | `sendOtp(phone, otp)` - Twilio integration |
| [socketHandlers.js](backend/src/utils/socketHandlers.js) | Socket.io event handlers | `authenticateSocket()`, `initializeSocket()` - Real-time events |

---

### Tech Stack - Backend `package.json`

#### Core Framework

```json
{
  "express": "^4.21.2",
  "mongoose": "^8.15.1",
  "socket.io": "^4.8.1",
  "cors": "^2.8.5",
  "cookie-parser": "^1.4.7"
}
```

#### Authentication & Security

```json
{
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.2",
  "bcrypt": "^5.1.1"
}
```

#### File & Media Handling

```json
{
  "multer": "^1.4.5-lts.1",
  "cloudinary": "^2.6.1"
}
```

#### Payment & Messaging

```json
{
  "razorpay": "^2.9.6",
  "twilio": "^5.5.0",
  "nodemailer": "^6.10.1"
}
```

#### Data Processing

```json
{
  "csv-parser": "^3.2.0",
  "cheerio": "^1.0.0"
}
```

#### AI & Utilities

```json
{
  "openai": "^4.91.1",
  "axios": "^1.9.0",
  "uuid": "^11.1.0",
  "puppeteer": "^24.10.0"
}
```

#### Development

```json
{
  "nodemon": "^3.1.10",
  "dotenv": "^16.4.7"
}
```

**Setup:** `npm install` in `backend/`  
**Run Dev:** `npm run test` (runs `nodemon app.js`)

---

## DATABASE MODELS SUMMARY

### Collections Overview

| Collection | Purpose | Key Fields | Relations |
|---|---|---|---|
| **clients** | Patient/user accounts | name, email, phone, avatar, verified | Chat, SlotRequest, Payment, Video |
| **doctors** | Healthcare provider accounts | name, specialization, experience, avatar, degree | Schedule, Chat, SlotRequest, Payment, Video |
| **chats** | Conversation threads | participants, messages, lastMessage, chatType | Client↔Doctor |
| **schedules** | Doctor availability | doctorId, date, slots[] | Doctor, SlotRequest |
| **slotRequests** | Appointment bookings | doctorId, patientId, status, paymentStatus | Doctor, Client, Schedule, Payment |
| **payments** | Transaction records | slotRequestId, amount, status, transactionId | SlotRequest, Doctor, Client |
| **videocalls** | Call records | participants, initiator, roomId, duration | Client↔Doctor |
| **medicines** | Medicine catalog | name, price, manufacturer, composition | Search/Reference only |

---

## ARCHITECTURE OVERVIEW

### Authentication Flow

```
1. Client/Doctor Registration
   ↓
2. OTP generation (Twilio SMS + Email)
   ↓
3. OTP Verification
   ↓
4. Email Verification via JWT
   ↓
5. Account activated → Login
   ↓
6. JWT tokens issued (Access + Refresh)
   ↓
7. Stored in HttpOnly cookies + localStorage
```

### Real-Time Communication

```
Socket.io Events:
├── chat:newMessage → Broadcast to all participants
├── video:initiateCall → Ring notification
├── video:callAccepted → Start WebRTC
└── notifications:alert → General notifications
```

### Payment Processing

```
Razorpay Integration:
1. Create Order (Amount + Details)
2. Frontend: Payment modal
3. After payment: Verify on backend
4. Update SlotRequest & Payment status
5. Create appointment
```

---

## KEY FEATURES MAPPED

| Feature | Frontend | Backend | Database |
|---|---|---|---|
| **User Auth** | AuthModal, Login/Signup pages | Routes + Controllers | Client, Doctor models |
| **Profile Mgmt** | ClientProfile, DoctorProfile | Update endpoints | Avatar in Cloudinary |
| **Doctor Search** | GetDoctor, Doctordirectory | getAllDoctors route | Doctor collection |
| **Booking** | PatientBookingPortal | SlotRequest, Schedule | SlotRequest, Schedule models |
| **Scheduling** | DoctorSchedue | Schedule routes | Schedule model |
| **Chat** | ChatPage, ChatBot | Chat routes + Socket | Chat model |
| **Video Calls** | VideoPage | Video routes + Socket | VideoCall model |
| **Payments** | DoctorPayementPortal | Payment routes (Razorpay) | Payment model |
| **Medicine Search** | MedicineSearch | Medicine routes | Medicine collection |
| **Clinics Map** | NearbyClinicMap | Clinic routes (Overpass) | External API |

---

## DEPLOYMENT INFO

### Frontend Deployment (Vercel)
- **Entry:** `frontend/vercel.json`
- **Build:** `vite build`
- **Environment Variables:**
  - `VITE_API_URL` - Backend API base URL

### Backend Deployment (Render)
- **File:** `render.yaml`
- **Environment Variables:**
  - `MONGODB_URI` - MongoDB connection string
  - `ACCESS_TOKEN_SECRET` - JWT secret
  - `CLOUDINARY_*` - Image hosting
  - `RAZORPAY_KEY_*` - Payment gateway
  - `TWILIO_*` - SMS service
  - `EMAIL_USER`, `EMAIL_PASS` - Gmail credentials

---

## INTERVIEW PREPARATION NOTES

### Strengths to Highlight
1. **Full-stack expertise:** MERN stack with real-time features
2. **Real-time communication:** Socket.io for chat & video
3. **Payment integration:** Razorpay for transactions
4. **Authentication:** JWT + OTP verification (Twilio + Email)
5. **File handling:** Cloudinary cloud storage
6. **State management:** Zustand for scalable state
7. **Responsive design:** Tailwind CSS with Framer Motion
8. **3D animations:** Three.js integrations
9. **API integrations:** Overpass for mapping, Twilio/Nodemailer for messaging

### Technical Questions to Prepare
- How does the authentication system handle token refresh?
- Explain the Socket.io connection flow for chat & video
- How does the schedule & slot request mechanism work?
- Describe the Razorpay payment flow end-to-end
- Why use Zustand over Redux?
- How is real-time data fetched in the store?

### Files to Review Before Interview
- `backend/src/utils/socketHandlers.js` - Real-time architecture
- `frontend/store/chatStore.js` - Socket.io integration in Zustand
- `backend/src/controllers/client.controllers.js` - Auth logic
- `frontend/pages/VideoPage.jsx` - WebRTC implementation
- `backend/src/routes/payment.routes.js` - Payment integration

---

**Generated:** April 2026  
**Project Status:** Active Development  
**Total Components:** 20 Frontend + 7 Controllers  
**Total Models:** 8 MongoDB schemas  
**Total Routes:** 9 route files with 30+ endpoints
