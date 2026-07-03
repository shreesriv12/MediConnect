# MediConnect Complete Project Explanation

This document explains MediConnect from scratch. It is based on the current project documentation and the actual frontend/backend source structure.

## 1. What MediConnect Does

MediConnect is a full-stack healthcare platform for patients and doctors. It brings several healthcare workflows into one application:

- Patients can create an account, find doctors, book appointment slots, pay online, chat with doctors, ask questions about doctor-uploaded documents, join video calls, search medicines, and find nearby clinics or hospitals.
- Doctors can create professional accounts, manage schedules, receive appointment notifications, chat with patients after booking, upload documents for patient Q&A, conduct video calls, and view payment history.
- The backend coordinates authentication, database persistence, business rules, file upload, RAG indexing, real-time Socket.IO events, Razorpay payments, notification records, and external services.

The problem it solves is fragmentation. Normally, doctor discovery, scheduling, payment, chat, reports, follow-up questions, and video calls happen across different tools. MediConnect combines them into one role-based workflow.

## 2. High-Level Architecture

The project is a MERN-style application:

- Frontend: React with Vite, React Router, Zustand stores, Tailwind/CSS, Socket.IO client, WebRTC browser APIs, Leaflet/OpenStreetMap UI, Razorpay Checkout script, and localStorage for selected tokens/user IDs/theme.
- Backend: Node.js, Express, Socket.IO, Mongoose, JWT, cookies, Multer, Cloudinary, optional AWS S3, Razorpay, Nodemailer, Twilio, LangChain, Groq/OpenAI-compatible chat, Hugging Face embeddings, Pinecone, OCR/document parsers, and node-cron.
- Database: MongoDB stores doctors, clients, schedules, slot requests, payments, chats, uploaded file metadata, RAG chunks, notifications, video calls, and medicines.
- Deployment target: frontend on Vercel, backend on Render, database on MongoDB Atlas, media on Cloudinary or S3/local storage.

Basic request flow:

1. A React page or Zustand store calls the backend through `VITE_API_URL`.
2. Express receives the REST request, applies middleware, validates auth if needed, then calls a controller.
3. Controllers read/write MongoDB through Mongoose models and call services for shared business rules.
4. If the workflow is real-time, controllers or Socket.IO handlers emit events into user rooms or chat rooms.
5. External services are called only where needed: Cloudinary/S3 for files, Razorpay for payments, Nodemailer/Twilio for OTP, Overpass for maps, Groq/Hugging Face/Pinecone/web search for AI.
6. The frontend updates state and renders the final result.

## 3. Main Modules

### Frontend

`frontend/src/App.jsx` defines the browser routes:

- `/`: public home page.
- `/login`: doctor login.
- `/signup`: doctor signup.
- `/doctordashboard`: doctor dashboard.
- `/clientdashboard`: patient/client dashboard.
- `/doctorprofile`: doctor profile editor.
- `/clientprofile`: client profile editor.
- `/doctorappointments`: doctor payment/earnings portal.
- `/doctordirectory`: doctor-side directory component.
- `/finddoctors`: public verified doctor browser.
- `/doctor/:id`: public doctor profile.
- `/doctorschedule`: doctor schedule manager.
- `/bookappointment`: patient appointment booking and payment portal.
- `/chat`: doctor-patient chat with file/RAG features.
- `/video-call`: video consultation page.
- `/nearby-clinics`: nearby hospitals/clinics/dispensaries map.
- `/medicines-search`: medicine lookup.

Important frontend stores:

- `doctorAuthStore.js`: doctor registration, login, OTP verification, logout, profile update, auth check, doctor listing.
- `clientAuthStore.js`: client registration, login, OTP verification, logout, profile update, auth check, client listing.
- `chatStore.js`: Socket.IO chat connection, chat list, messages, file upload, document Q&A, read receipts, deletion, current chat state.
- `videoStore.js`: video call lifecycle, call history, active calls, media toggles, quality settings, rating, issue reporting.
- `schedule.store.js`: contains broader schedule ideas, but current visible schedule UI calls implemented backend endpoints directly.

Important frontend components:

- `ChatBot.jsx`: dashboard assistant widget calling `/chat` and `/chat/:userId/history`.
- `AgentAssistant.jsx`: client-side smart booking assistant calling `/agent/query`, then Razorpay payment endpoints.
- `NotificationPanel.jsx` and `NotificationBell.jsx`: fetch notifications and mark them read.
- `DoctorSchedue.jsx`: doctor creates and views schedules.
- `PatientBookingPortal.jsx`: patient selects doctor/date/slot and pays.
- `NearbyClinicMap.jsx`: browser geolocation plus Leaflet map over backend Overpass results.
- `MedicineSearch.jsx`: debounced medicine search.

### Backend

`backend/app.js` starts the Express app and Socket.IO server.

Middleware and setup:

- `cookieParser()` reads auth cookies.
- `cors()` allows configured frontend origins plus local dev origins.
- `express.json()` and `express.urlencoded()` parse request bodies.
- `express.static("public")` serves local uploaded files.
- `initializeSocket(io)` registers Socket.IO auth and event handlers.
- `req.io = io` makes sockets available inside controllers.
- `connectDB()` connects to MongoDB using `MONGODB_URI/DB_NAME`.
- `startAppointmentReminderCron()` starts reminder notifications unless disabled.

Mounted backend routes:

- `POST /chat`, `GET /chat/:userId/history`: dashboard assistant.
- `/doctor`: doctor auth, profile, listing.
- `/client`: client auth, profile, listing.
- `/schedule`: doctor schedules.
- `/slots`: slot requests.
- `/payments`: Razorpay order, verification, payment history.
- `/chats` and `/api/chats`: chat and RAG Q&A.
- `/api`: chat file upload and file listing.
- `/video-call`: video call lifecycle.
- `/clinics`: nearby facility lookup.
- `/medicines`: medicine search.
- `/agent`: smart scheduling assistant.
- `/notifications`: notification reads.
- `GET /health`: deployment health check.

### Database Models

- `Doctor`: name, email, password hash, specialization, experience, degree, age, phone, gender, avatar, verified, refresh token, OTP fields.
- `Client`: name, email, password hash, age, gender, phone, avatar, verified, refresh token, OTP fields.
- `Schedule`: doctorId, date, slots. Each slot has time, fee, isBooked, bookedBy, requestId.
- `SlotRequest`: doctorId, patientId, scheduleId, slotIndex, date, time, fee, status, paymentStatus, reminderSentAt.
- `Payment`: slotRequestId, doctorId, patientId, amount, status, transactionId, paymentGateway.
- `Chat`: participants, embedded messages, lastMessage, isActive, chatType.
- `UploadedFile`: file metadata, sessionId/chatId, doctorId, storage info, RAG status, chunk count.
- `RagChunk`: local fallback chunks with text, embeddings, metadata, file/session ids.
- `VideoCall`: participants, initiator, status, roomId, times, duration, media state, quality rating, technical issues.
- `Notification`: recipient, sender, type, title, message, appointment metadata, read flag.
- `Medicine`: medicine catalog fields such as name, price, discontinued status, manufacturer, type, pack size, composition.

## 4. Security And Business Rules

MediConnect uses these security patterns:

- Passwords are hashed with bcryptjs in Mongoose pre-save hooks.
- Access tokens and refresh tokens are JWTs.
- Login and refresh set HTTP-only cookies and also return tokens used by parts of the frontend for socket/auth headers.
- `isAuthenticated` checks `accessToken` cookie first, then `Authorization: Bearer ...`.
- The auth middleware looks up the decoded id in `Doctor` first, then `Client`, and attaches `req.doctor` or `req.client`.
- Doctor and client accounts are separate models and flows.
- Doctor/client OTP verification is required before normal login.
- Chat and video access are booking-gated. A doctor and client can message or call only if a non-rejected slot request exists between them, including pending, accepted, or paid requests.
- Payment verification is server-side using Razorpay HMAC signature validation.
- Uploads are restricted to PDF, DOC, DOCX, TXT, PNG, JPG, and JPEG for chat/RAG files.
- The RAG loader masks common personal identifiers before chunking/indexing text.

## 5. External Services

- MongoDB Atlas or local MongoDB: primary database.
- Cloudinary: avatar uploads and Cloudinary-backed chat attachments.
- AWS S3: optional storage for chat files when bucket/region are configured.
- Razorpay: order creation, checkout, payment verification.
- Nodemailer/Gmail: email OTP.
- Twilio: SMS OTP for client registration path.
- Socket.IO: real-time chat, notifications, presence, and WebRTC signaling.
- WebRTC browser APIs: peer-to-peer audio/video streams.
- OpenStreetMap/Overpass API: nearby hospitals, clinics, doctors, pharmacies.
- Groq/OpenAI-compatible API: dashboard assistant and RAG answer generation.
- Hugging Face Feature Extraction API: embeddings for RAG chunks and questions.
- Pinecone: optional vector database for RAG search.
- Brave Search, Serper, DuckDuckGo HTML: optional web fallback/reference search for RAG.
- pdf-parse, Mammoth, Word Extractor, Tesseract.js: document/OCR extraction.

## 6. Full Workflows

### 6.1 Public Home And Navigation

1. User opens `/`.
2. React renders `HomePage`, which includes navbar, hero, services, about, contact form, and footer.
3. Navbar opens an auth modal for choosing login/signup paths.
4. No database operation is required until the user signs up, logs in, or uses a feature page.

Final output: public landing experience and navigation into doctor or client flows.

### 6.2 Doctor Registration

Frontend flow:

1. User opens `/signup`.
2. `DoctorSignup` collects name, email, phone, password, specialization, experience, degree, age, gender, and avatar.
3. `doctorAuthStore.register()` sends `multipart/form-data` to `POST /doctor/register`.

Backend processing:

1. `doctor.routes.js` applies `upload.single("avatar")`.
2. `registerDoctor` validates required fields.
3. MongoDB `Doctor.findOne({ $or: [{ email }, { phone }] })` checks duplicates.
4. Cloudinary receives the avatar through `uploadToCloud`.
5. A 6-digit OTP and 5-minute expiry are generated.
6. Nodemailer sends the OTP to the email address.
7. MongoDB `Doctor.create()` stores the unverified doctor. The schema hashes the password before saving.
8. The response excludes password and refresh token.

Final output: doctor account exists with `verified: false`, avatar URL, OTP fields, and the frontend receives the doctor id for verification.

### 6.3 Doctor Email/OTP Verification

Frontend flow:

1. Doctor submits OTP after signup.
2. The frontend can call either `POST /doctor/verify-email` with email/OTP or `POST /doctor/verify-otp` with doctorId/OTP.

Backend processing:

1. Controller finds the doctor by email or id.
2. It compares OTP and expiry.
3. If valid, it sets `verified = true` and clears OTP fields.
4. `verify-otp` also creates access and refresh JWTs and sets cookies.

Final output: doctor becomes verified and can log in or enter the dashboard.

### 6.4 Doctor Login, Refresh, Logout, Current Profile

Login:

1. `/login` submits email/password.
2. `doctorAuthStore.login()` calls `POST /doctor/login`.
3. Backend finds doctor by email, checks bcrypt password, and rejects unverified accounts.
4. Backend creates access and refresh tokens, saves refresh token on the doctor document, sets cookies, and returns doctor data plus tokens.
5. Frontend stores `doctorId`, `doctorAccessToken`, and `doctorRefreshToken` in localStorage.

Current user:

1. Protected pages call `GET /doctor/me`.
2. `isAuthenticated` validates token and attaches `req.doctor`.
3. Controller returns the current doctor without sensitive fields.

Refresh:

1. Frontend or interceptor calls `POST /doctor/refresh-token`.
2. Backend verifies refresh token and compares it to the stored token.
3. New tokens are generated and returned/set in cookies.

Logout:

1. Frontend calls `POST /doctor/logout`.
2. Backend clears stored refresh token and clears cookies.
3. Frontend removes doctor localStorage keys.

Final output: secure doctor session lifecycle.

### 6.5 Client Registration

Frontend flow:

1. User opens the client signup UI.
2. `clientAuthStore.register()` submits name, email, phone, password, age, gender, and optional avatar to `POST /client/register`.

Backend processing:

1. `upload.single("avatar")` handles avatar if present.
2. Controller validates fields and checks duplicate email/phone.
3. Avatar is uploaded to Cloudinary if supplied.
4. OTP and expiry are generated.
5. Twilio SMS is attempted through `sendOtp(phone, otp)`.
6. Nodemailer sends email OTP.
7. MongoDB `Client.create()` stores an unverified client. The schema hashes the password.
8. Access/refresh tokens are generated and cookies are set.

Final output: client account exists with OTP verification pending, and the frontend receives the client id.

### 6.6 Client Verification, Login, Refresh, Logout, Current Profile

The client flow mirrors the doctor flow:

1. `POST /client/verify-email` or `POST /client/verify-otp` validates OTP and marks the client verified.
2. `POST /client/login` checks email/password and verified status, saves refresh token, sets cookies, returns tokens.
3. `GET /client/me` returns current client profile.
4. `POST /client/refresh-token` validates refresh token and issues new tokens.
5. `POST /client/logout` clears refresh token/cookies and frontend state.

Final output: authenticated patient session with profile state available to dashboard, booking, chat, and video screens.

### 6.7 Profile Update

Doctor:

1. `/doctorprofile` edits doctor profile fields and optional avatar.
2. `PATCH /doctor/update` is called with auth and optional multipart data.
3. Backend checks that changed email/phone are not already used.
4. Password is rehashed if changed.
5. New avatar is uploaded to Cloudinary if supplied.
6. MongoDB doctor document is saved.

Client:

1. `/clientprofile` edits client fields and optional avatar.
2. `PATCH /client/update` does duplicate checks, password hashing, optional Cloudinary upload, and saves.

Final output: updated profile returned to Zustand and UI.

### 6.8 Doctor Discovery And Public Doctor Profile

Doctor list:

1. `/finddoctors` or booking portal calls `GET /doctor`.
2. Backend supports pagination and filters for specialization, experience, gender, verified, and search.
3. MongoDB `Doctor.find(filter)` excludes password, refresh token, OTP fields.
4. Frontend filters/searches the returned list and displays verified doctors.

Doctor detail:

1. User opens `/doctor/:id`.
2. Frontend calls `GET /doctor/:id`.
3. Backend validates ObjectId, finds doctor, excludes sensitive fields, and only returns verified doctors.

Final output: doctor cards and public profile details for selecting a provider.

### 6.9 Client Listing

1. Frontend store can call `GET /client` with pagination/filter params.
2. Backend builds filter for verified/gender and sort options.
3. MongoDB returns clients without password, refresh token, OTP, or verification token.

Final output: paginated client list for doctor-side or future admin/contact flows.

### 6.10 Doctor Schedule Creation

Frontend flow:

1. Doctor opens `/doctorschedule`.
2. `DoctorSchedue.jsx` lets the doctor choose a date and add one or more slots with time and fee.
3. Frontend calls `POST /schedule/create` with bearer token.

Backend processing:

1. `isAuthenticated` verifies the doctor.
2. `createSchedule` uses `req.doctor._id` as doctorId.
3. It validates date and slots.
4. If a schedule already exists for that doctor/date, it appends slots.
5. Otherwise it creates a new `Schedule` document.

Database operations:

- `Schedule.findOne({ doctorId, date })`
- `existing.save()` or `new Schedule(...).save()`

Final output: schedule stored with available slots for patients to request.

### 6.11 Schedule Viewing

1. Doctor or patient selects a date.
2. Frontend calls `GET /schedule?doctorId=...&date=YYYY-MM-DD`.
3. Backend finds one schedule for that doctor/date.
4. Response includes all slots with `isBooked`, `bookedBy`, and `requestId`.

Final output: UI shows available, booked, or pending slots.

### 6.12 Manual Slot Request

Frontend flow:

1. Patient opens `/bookappointment`.
2. Patient selects doctor, date, and an available slot.
3. Frontend calls `POST /slots/request` with doctorId, scheduleId, and slotIndex.

Backend processing:

1. `isAuthenticated` verifies that a client is logged in.
2. `requestSlot` gets patientId from `req.client._id`.
3. `createAndLockSlotRequest` loads the schedule and target slot.
4. It rejects missing schedules, invalid slot indexes, or unavailable slots.
5. It creates a `SlotRequest` with status `pending` and paymentStatus `unpaid`.
6. It locks the schedule slot immediately by setting `requestId`, `isBooked = true`, and `bookedBy = patientId`.
7. `notifyDoctorSlotBooked` creates a `slot_booked` notification for the doctor.

Database operations:

- `Schedule.findById(scheduleId)`
- `SlotRequest.create(...)`
- `schedule.save()`
- `Notification.create(...)`

Final output: slot is reserved/pending, doctor is notified, and frontend asks patient to pay.

### 6.13 Slot Request Status Update

1. A doctor can call `PUT /slots/:requestId/status` with `accepted` or `rejected`.
2. Backend finds the `SlotRequest` and its `Schedule`.
3. For `accepted`, request status becomes accepted, paymentStatus remains unpaid, and the slot is booked.
4. For `rejected`, request status becomes rejected and the slot is released.

Final output: appointment request state and schedule slot state stay aligned.

### 6.14 Razorpay Order Creation

Frontend flow:

1. After slot request, patient clicks pay.
2. Frontend loads `https://checkout.razorpay.com/v1/checkout.js`.
3. Frontend calls `POST /payments/order` with slotRequestId and amount.

Backend processing:

1. `createOrder` validates slotRequestId and amount.
2. Backend calls `razorpay.orders.create({ amount: amount * 100, currency: "INR", receipt })`.
3. Razorpay returns an order id, amount, currency, and metadata.

Final output: frontend opens Razorpay Checkout using the returned order.

### 6.15 Razorpay Payment Verification And Appointment Confirmation

Frontend flow:

1. Razorpay Checkout returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
2. Frontend calls `POST /payments/verify` with those values and slotRequestId.

Backend processing:

1. Backend computes HMAC SHA-256 over `order_id|payment_id` using `RAZORPAY_KEY_SECRET`.
2. If the computed signature does not match Razorpay signature, request fails.
3. If valid, backend loads the slot request and populates doctor/client names.
4. Slot request becomes `status: accepted` and `paymentStatus: paid`.
5. `confirmSlotRequestBooking` ensures the schedule slot is booked and tied to request.
6. `notifyAppointmentPaid` creates payment success notifications for doctor and patient.
7. A `Payment` record is created with transaction id and amount.

Database operations:

- `SlotRequest.findById(...).populate(...)`
- `slotRequest.save()`
- `Schedule.findById(...).save()`
- `Notification.create(...)` twice
- `Payment.save()`

Final output: appointment is confirmed, payment is recorded, notifications exist, and schedule remains locked.

### 6.16 Doctor Payment History

1. Doctor opens `/doctorappointments`.
2. Frontend gets the current doctor id.
3. Frontend calls `GET /payments/history?doctorId=...`.
4. Backend loads all `Payment` documents for that doctor, populating patient and slot request data.
5. Backend formats payment rows and computes total earnings, total payments, and successful payment count.

Final output: doctor sees earnings summary and patient payment history.

### 6.17 Smart Booking Agent

Frontend flow:

1. Client dashboard renders `AgentAssistant`.
2. Client types a prompt, for example asking for doctors, availability, or booking.
3. Frontend calls `POST /agent/query` with bearer token.

Backend processing:

1. `isAuthenticated` verifies user and `handleAgentQuery` requires `req.client`.
2. LangGraph runs a two-node workflow: `parse_prompt` then `fulfill_request`.
3. `parsePromptIntent` calls an OpenAI-compatible LLM using configured Agent/OpenRouter/Groq key.
4. The LLM must return JSON fields: intent, searchQuery, symptoms, doctorName, date, timePreference.
5. Local fallback helpers also infer symptoms, dates, doctor names, and intent from text.

Intent outcomes:

- `search_doctors`: query verified doctors by search/specialization/symptom mapping.
- `check_availability`: find schedules on the requested date and return doctors with available slots.
- `book_appointment`: identify a doctor, find next available slot, create and lock a slot request, notify doctor, and optionally create a Razorpay order.
- `payment_intent`: tells user that booking details are needed first.
- `unknown`: attempts doctor or availability fallback, otherwise asks for clearer details.

Database/external operations:

- `Doctor.find(...)`
- `Schedule.find(...)`
- `SlotRequest.create(...)`
- `Schedule.save()`
- `Notification.create(...)`
- Optional `razorpay.orders.create(...)`

Frontend final step:

1. If a booking is returned, the assistant shows the reserved slot and payment button.
2. Payment uses the same `/payments/order` and `/payments/verify` flow.

Final output: natural-language doctor search, availability lookup, or a reserved appointment awaiting payment.

### 6.18 Chat Access And Chat Creation

Frontend flow:

1. User opens `/chat`.
2. `chatStore.connectSocket()` connects to Socket.IO using doctor/client token and id from localStorage.
3. User selects a booked contact or starts chat with a participant.
4. Frontend calls `POST /chats/create-or-get` with participantId and participantType.

Backend processing:

1. `isAuthenticated` identifies doctor or client.
2. `createOrGetChat` checks `hasBookedAppointmentBetween`.
3. The booking check searches `SlotRequest` where doctorId/patientId match, status is not rejected, and paymentStatus is paid or status is accepted/pending.
4. If no booking exists, chat is denied.
5. Backend verifies the participant exists.
6. Backend finds existing chat with both participant ids or creates a new consultation chat.
7. Chat participants are populated with name/email/avatar.

Final output: chat session is returned and socket joins the chat room.

### 6.19 Fetching Chats And Booked Contacts

User chats:

1. Frontend calls `GET /chats/user-chats`.
2. Backend finds active chats containing current user.
3. For every chat, backend re-checks booking-gated access.
4. Only allowed chats are returned, sorted by last message.

Booked contacts:

1. Frontend can call `GET /chats/booked-contacts`.
2. Backend finds relevant slot requests for the doctor/client.
3. It populates the other party and returns unique contacts with latest booking metadata.

Final output: chat sidebar/contact list only shows people connected through appointments.

### 6.20 Sending Chat Messages

REST path:

1. Frontend sends text or attachment through `POST /chats/send-message`.
2. Backend authenticates user, loads chat, checks participant membership, and checks appointment access.
3. Reply metadata is resolved into a snapshot if present.
4. If a file exists, Cloudinary upload is performed.
5. A message is appended to the embedded `messages` array in the `Chat` document.
6. `lastMessage` is updated.
7. Backend emits `newMessage` to the chat room.
8. Backend creates a `chat_message` notification for the other participant and emits `notification:new` to that user's room.

Socket path:

1. Frontend emits `sendMessage` or `message:send`.
2. Socket handler authenticates through initial socket middleware.
3. It checks chat membership and appointment access.
4. It appends a message, emits `newMessage`/`message:receive`, and sends notification.

Final output: message is persisted in MongoDB and appears in real time for both participants.

### 6.21 Chat Read Receipts And Deletion

Read receipts:

1. Frontend calls `PATCH /chats/:chatId/mark-read` with messageIds or emits `markAsRead`.
2. Backend loads chat, ignores messages sent by the current user, and adds a `readBy` entry for unread messages.
3. Backend emits `messagesRead` to the chat room.

Deletion:

1. Frontend calls `DELETE /chats/:chatId/messages/:messageId`.
2. Backend verifies chat exists and message exists.
3. Only the sender can delete.
4. Deletion is allowed only within 5 minutes of sending.
5. Message is removed from the embedded array and `messageDeleted` is emitted.

Final output: read status and deletion state propagate to chat participants.

### 6.22 Doctor File Upload For RAG

There are two upload paths.

Path A, as a chat attachment:

1. Doctor sends a supported file through `POST /chats/send-message`.
2. Backend uploads file to Cloudinary.
3. If the file extension supports RAG, backend creates an `UploadedFile` row with status `pending`.
4. The chat message contains file metadata, fileId, and signed/Cloudinary URLs.
5. Backend emits `file:receive` and enqueues RAG ingestion.

Path B, dedicated RAG upload:

1. Doctor calls `POST /api/upload` with sessionId, doctorId, and file.
2. Backend confirms the authenticated user is the doctor in that chat session.
3. `storeChatFile` stores in S3 if configured, otherwise local `public/uploads/chat`.
4. Backend creates `UploadedFile` metadata.
5. Backend appends a file/image chat message.
6. Backend emits `file:receive` and `newMessage`.
7. Backend enqueues RAG ingestion.

Final output: file appears in chat, metadata is persisted, and async document indexing starts.

### 6.23 RAG Ingestion Pipeline

1. `enqueueRagIngestion` adds a job to an in-process queue.
2. Queue marks the `UploadedFile` as `processing`.
3. `ingestUploadedFile` runs the LangChain `RunnableSequence`.
4. `loadDocument` reads the file:
   - PDF: `pdf-parse`
   - DOCX: Mammoth
   - DOC: Word Extractor
   - TXT: filesystem read
   - Images: Tesseract OCR
5. Text is cleaned and common PHI patterns are masked.
6. `chunkDocuments` splits text into overlapping chunks of about 500 characters.
7. `embedAndStore` creates Hugging Face embeddings.
8. If Pinecone is configured, vectors are added to the chat-session namespace.
9. Chunks and embeddings are always stored in MongoDB `RagChunk` as fallback/audit data.
10. Queue marks the file as `indexed`, `skipped`, or `failed`, and stores chunk count/error.

Final output: uploaded doctor documents become searchable within that chat session.

### 6.24 Asking Questions About Uploaded Documents

Socket path:

1. Patient or doctor asks through chat UI.
2. Frontend emits `query:ask` with sessionId, question, and optional replyTo.
3. Socket handler checks chat participant and booking access.

REST path:

1. Frontend calls `POST /chats/:chatId/query`.
2. Backend uses the same `askQuestionInSession` service.

Backend RAG processing:

1. User question is appended as a normal chat message.
2. If user replied to a file message, the fileId restricts retrieval to that file.
3. If user replied to a doctor text message, that message becomes direct context.
4. `answerQuestionForSession` retrieves relevant chunks:
   - Pinecone similarity search when configured.
   - MongoDB local vector/lexical fallback otherwise.
5. If no useful document answer exists, optional web fallback searches Brave, Serper, then DuckDuckGo HTML.
6. Groq through LangChain `ChatOpenAI` generates the final answer using the system prompt.
7. The AI answer is saved as a chat message with `messageType: "ai"` and sources.
8. Backend emits `query:answer`, `message:receive`, and `newMessage`.

Final output: chat shows the user's question and an AI answer grounded in doctor documents or clearly marked web references.

### 6.25 Dashboard Assistant Chatbot

Frontend flow:

1. `ChatBot.jsx` opens on dashboards.
2. It creates or reads a browser-local user id.
3. It loads previous messages from localStorage and `GET /chat/:userId/history`.
4. User sends a dashboard/navigation question to `POST /chat`.

Backend processing:

1. `app.js` stores short chatbot history in an in-memory `chatHistory` object.
2. If `GROQ_API_KEY` is configured, backend calls Groq chat completions with a MediConnect assistant system prompt.
3. If Groq is unavailable, it returns simple fallback responses.
4. Backend stores recent messages in memory and returns assistant message/history.

Final output: lightweight dashboard helper response. It is not medical diagnosis and is primarily for app navigation help.

### 6.26 Notifications

Creation points:

- New slot request: `slot_booked` for doctor.
- Payment success: `payment_success` for doctor and client.
- Appointment reminder: `appointment_reminder` for doctor and client.
- Chat message: `chat_message` for the other participant.
- Video call invite: `video_call_invite` for target user.

Frontend flow:

1. `NotificationPanel` or `NotificationBell` calls `GET /notifications`.
2. It polls every 30 seconds.
3. It can call `PATCH /notifications/read-all`.
4. Socket events can also emit `notification:new` to the target user room.

Backend routes:

- `GET /notifications`: latest notifications for current doctor/client.
- `GET /notifications/unread-count`: unread count.
- `PATCH /notifications/read-all`: mark all current user's notifications read.
- `PATCH /notifications/:notificationId/read`: mark one notification read.

Final output: persisted notification center plus real-time notification events.

### 6.27 Appointment Reminder Cron

1. Backend starts `node-cron` when server starts.
2. Every configured interval, default every 5 minutes, it searches paid/accepted slot requests where `reminderSentAt` is null.
3. It converts slot date/time to Asia/Kolkata appointment datetime.
4. If appointment is within the configured reminder window, default 30 minutes, it creates reminder notifications for both doctor and patient.
5. It sets `reminderSentAt` to avoid duplicates.

Final output: upcoming appointment reminders are saved as notifications.

### 6.28 Video Call Initiation

Frontend flow:

1. User opens `/video-call`.
2. Video page/store uses current auth state and token.
3. User chooses a participant and starts call.
4. Frontend calls `POST /video-call/initiate`.

Backend processing:

1. `isAuthenticated` verifies user.
2. `initiateCall` validates participant id/type and loads the participant.
3. It checks appointment access through `hasBookedAppointmentBetween`.
4. Any stale active call between the same users is auto-ended.
5. Backend creates a `VideoCall` record with participants, initiator, status `initiated`, callType, media state, and generated roomId.
6. Backend creates a video call notification and emits `incomingCall` to `user_<participantId>`.
7. Call status is updated to `ringing`.

Final output: callee sees incoming call, caller receives call record/roomId.

### 6.29 Video Call Signaling And WebRTC

Socket connection:

1. Socket.IO authenticates the JWT during handshake.
2. Each connected user joins `user_<userId>`.
3. Socket handlers maintain connected user maps and call rooms.

WebRTC signaling:

1. Caller creates an offer in the browser.
2. Caller emits `call-offer` with target user and offer.
3. Socket handler verifies appointment access and forwards a unified `offer` event to the callee.
4. Callee accepts in UI and emits `call-answer`.
5. Socket forwards `answer` to caller.
6. Both sides exchange `iceCandidate` events through Socket.IO.
7. Browser WebRTC APIs establish the peer-to-peer media stream.
8. Users can join/leave call rooms through `joinCallRoom` and `leaveCallRoom`.

Final output: live audio/video consultation between doctor and patient.

### 6.30 Video Call Accept, Reject, End

Accept:

1. Callee calls `PATCH /video-call/:callId/accept`.
2. Backend checks participant and valid status.
3. Call becomes `ongoing`, `startTime` is set, callee joinedAt/media state is updated.
4. Backend emits `callAccepted` to both users.

Reject:

1. User calls `PATCH /video-call/:callId/reject`.
2. Backend checks participant.
3. Call becomes `rejected`, `endTime` is set.
4. Backend emits `callRejected` to the other participant.

End:

1. User calls `PATCH /video-call/:callId/end`.
2. Backend checks participant.
3. If ongoing, duration is calculated from `startTime`.
4. Call becomes `ended`, `endTime` and participant `leftAt` are set.
5. Backend emits `callEnded` to user room and call room.

Final output: video call lifecycle is persisted and both UIs stay synchronized.

### 6.31 Video Media Controls, History, Rating, Issues

Media controls:

1. Frontend calls:
   - `PATCH /video-call/:callId/camera`
   - `PATCH /video-call/:callId/microphone`
   - `PATCH /video-call/:callId/screen-share`
   - `PATCH /video-call/:callId/quality`
   - `GET /video-call/:callId/media-permissions`
2. Backend verifies participant and active state.
3. Participant media state is updated in the `VideoCall` document.
4. Backend emits `cameraToggled`, `microphoneToggled`, `screenShareToggled`, or `mediaQualityUpdated` to the room.

History:

1. Frontend calls `GET /video-call/history?page=&limit=&status=`.
2. Backend returns calls where current user is a participant.

Active calls:

1. Frontend calls `GET /video-call/active`.
2. Backend returns initiated/ringing/ongoing calls for the user.

Rating:

1. Frontend calls `POST /video-call/:callId/rate`.
2. Backend allows ratings only for ended calls and prevents duplicate rating by same user.

Issue reporting:

1. Frontend calls `POST /video-call/:callId/report-issue`.
2. Backend appends technical issue metadata to the call.

Final output: video consultation state, media controls, history, feedback, and issue records are persisted.

### 6.32 Nearby Clinics, Hospitals, Doctors, Pharmacies

Frontend flow:

1. User opens `/nearby-clinics`.
2. `NearbyClinicMap` loads Leaflet CSS/script and initializes an OpenStreetMap tile map.
3. User grants browser geolocation.
4. Frontend calls one of:
   - `GET /clinics/nearby-medical?lat=&lng=&radius=`
   - `GET /clinics/nearby-hospitals?lat=&lng=&radius=`
   - `GET /clinics/nearby-clinics?lat=&lng=&radius=`
   - `GET /clinics/nearby-dispensaries?lat=&lng=&radius=`

Backend processing:

1. Route validates lat/lng.
2. It converts radius km to a bounding-box delta.
3. It builds an Overpass query for amenity types.
4. It tries multiple Overpass mirrors and fallback request formats.
5. It maps OSM nodes/ways/relations to normalized facility objects.
6. `/nearby-medical` categorizes results into hospitals, clinics, and dispensaries.

Final output: map markers and facility lists for nearby medical services.

### 6.33 Medicine Search

Frontend flow:

1. User opens `/medicines-search`.
2. User types a medicine name.
3. After 500 ms debounce, frontend calls `GET /medicines/search?name=...`.

Backend processing:

1. Route validates `name`.
2. MongoDB searches the `medicines` collection with case-insensitive regex on `name`.
3. It selects medicine fields: name, price, discontinued status, manufacturer, type, pack size, and composition.

Final output: grouped medicine search results with price, status, pack, manufacturer, and composition.

### 6.34 Health Check And Deployment Verification

1. Monitoring or deployment test calls `GET /health`.
2. Backend returns `status: OK`, timestamp, and uptime.
3. Deployment docs use this to confirm Render backend is live.

Final output: simple operational health response.

## 7. API Reference By Feature

### Doctor

- `POST /doctor/register`: register doctor with avatar.
- `POST /doctor/login`: login doctor.
- `POST /doctor/verify-email`: verify by email and OTP.
- `POST /doctor/verify-otp`: verify by doctor id and OTP.
- `POST /doctor/logout`: logout current doctor.
- `POST /doctor/refresh-token`: refresh doctor tokens.
- `GET /doctor/me`: current doctor.
- `PATCH /doctor/update`: update doctor profile.
- `GET /doctor`: list doctors.
- `GET /doctor/:id`: public verified doctor detail.

### Client

- `POST /client/register`: register client.
- `POST /client/login`: login client.
- `POST /client/verify-email`: verify by email and OTP.
- `POST /client/verify-otp`: verify by client id and OTP.
- `POST /client/logout`: logout current client.
- `POST /client/refresh-token`: refresh client tokens.
- `GET /client/me`: current client.
- `PATCH /client/update`: update client profile.
- `GET /client`: list clients.
- `GET /client/:id`: client detail route, intended to fetch one client.

### Scheduling And Booking

- `POST /schedule/create`: doctor creates/appends schedule slots.
- `GET /schedule?doctorId=&date=`: fetch one schedule.
- `POST /slots/request`: client requests and locks a slot.
- `PUT /slots/:requestId/status`: accept or reject request.

### Payments

- `POST /payments/order`: create Razorpay order.
- `POST /payments/verify`: verify Razorpay signature, confirm appointment, create payment.
- `GET /payments/history?doctorId=`: doctor payment summary/history.

### Chat, Files, And RAG

- `POST /chats/create-or-get`: create or fetch booked chat.
- `GET /chats/booked-contacts`: fetch contacts from bookings.
- `GET /chats/user-chats`: fetch user's allowed chats.
- `POST /chats/send-message`: send text/file message.
- `POST /chats/:chatId/query`: ask RAG question.
- `GET /chats/:chatId/messages`: paginated messages.
- `PATCH /chats/:chatId/mark-read`: mark messages read.
- `DELETE /chats/:chatId/messages/:messageId`: delete own recent message.
- `POST /api/upload`: doctor uploads RAG document to chat.
- `GET /api/chats/:sessionId/files`: list uploaded files.

### Video

- `POST /video-call/initiate`: start call record and notify participant.
- `PATCH /video-call/:callId/accept`: accept call.
- `PATCH /video-call/:callId/reject`: reject call.
- `PATCH /video-call/:callId/end`: end call.
- `GET /video-call/history`: call history.
- `GET /video-call/active`: active calls.
- `POST /video-call/:callId/rate`: rate ended call.
- `POST /video-call/:callId/report-issue`: report issue.
- `PATCH /video-call/:callId/camera`: toggle camera state.
- `PATCH /video-call/:callId/microphone`: toggle microphone state.
- `PATCH /video-call/:callId/screen-share`: toggle screen share state.
- `GET /video-call/:callId/media-permissions`: get current media state.
- `PATCH /video-call/:callId/quality`: update quality settings.

### AI And Agent

- `POST /chat`: dashboard assistant response.
- `GET /chat/:userId/history`: dashboard assistant history.
- `POST /agent/query`: smart client scheduling assistant.

### Notifications

- `GET /notifications`: get current user's notifications.
- `GET /notifications/unread-count`: unread count.
- `PATCH /notifications/read-all`: mark all read.
- `PATCH /notifications/:notificationId/read`: mark one read.

### Nearby Facilities And Medicine

- `GET /clinics/nearby-medical`: all nearby medical facilities.
- `GET /clinics/nearby-hospitals`: nearby hospitals.
- `GET /clinics/nearby-clinics`: nearby clinics/doctors.
- `GET /clinics/nearby-dispensaries`: nearby pharmacies/dispensaries.
- `GET /medicines/search?name=`: medicine lookup.
- `GET /health`: backend health check.

## 8. Socket.IO Events

Authentication:

- Client connects with JWT in `handshake.auth.token`.
- Server validates user and joins `user_<userId>`.
- Server emits `authenticated`.

Chat:

- `joinChat`: join a chat room after participant and booking checks.
- `leaveChat`: leave chat room.
- `sendMessage`: send message through socket.
- `message:send`: alternate acknowledged send event.
- `newMessage`: emitted when a chat message is saved.
- `message:receive`: alternate normalized message payload.
- `file:upload`: broadcast already-uploaded file metadata.
- `file:receive`: emitted when file metadata should appear in chat.
- `query:ask`: ask RAG question.
- `query:answer`: emitted with RAG answer and saved messages.
- `query:error`: emitted on RAG failure.
- `markAsRead` and `messagesRead`: read receipts.
- `typing`, `userTyping`: typing state.
- `userOnline`, `userOffline`, `userStatusUpdate`, `onlineUsers`: presence.

Video:

- `incomingCall`: REST call initiation notification.
- `call-offer`: WebRTC offer forwarding.
- `offer`: forwarded unified incoming offer.
- `call-answer`: WebRTC answer forwarding.
- `answer`: forwarded answer.
- `iceCandidate`: ICE candidate forwarding.
- `callAccepted`, `callRejected`, `callEnded`: lifecycle updates.
- `call-rejected`, `call-ended`: socket-only call state events.
- `joinCallRoom`, `leaveCallRoom`: room membership.
- `toggleVideo`, `toggleAudio`, `shareScreen`: media events.
- `cameraToggled`, `microphoneToggled`, `screenShareToggled`, `mediaQualityUpdated`: persisted media state updates.
- `callQualityIssue`: live quality issue broadcast.

Notifications:

- `notification:new`: emitted to a user room when a persisted notification is created.

## 9. Data Flow Summary For Rebuilding

To rebuild MediConnect, implement these core flows in this order:

1. Create separate `Doctor` and `Client` auth models with hashed passwords, OTP fields, verified flag, and refresh tokens.
2. Add JWT auth middleware that can identify either role.
3. Build schedule and slot request models so doctors publish slots and patients reserve them.
4. Lock a slot immediately when a slot request is created to avoid double booking.
5. Add Razorpay order and verification endpoints. Only after HMAC verification should a slot request become paid/accepted and a payment record be created.
6. Add notification records and optionally emit socket events to user rooms.
7. Add chat sessions with participants and embedded messages.
8. Enforce booking-gated chat access on REST and socket paths.
9. Add Socket.IO auth, chat rooms, user rooms, message events, read receipts, and presence.
10. Add doctor-only file upload metadata and store files in Cloudinary/S3/local storage.
11. Add RAG ingestion: extract text, mask sensitive data, chunk, embed, store in Pinecone/MongoDB.
12. Add RAG Q&A: retrieve session-specific chunks, call an LLM, save AI answer as chat message, return sources.
13. Add video call records and WebRTC signaling through Socket.IO.
14. Add map and medicine helper features.
15. Add deployment config for Vercel, Render, MongoDB Atlas, CORS, cookies, and health checks.

## 10. Important Implementation Notes

- The strongest business invariant is appointment-gated communication: chat and video routes repeatedly check that a non-rejected slot request exists between the doctor and patient.
- The project uses both cookies and localStorage tokens. Cookies support HTTP auth, while localStorage tokens are used by frontend socket and bearer-token calls.
- RAG is session-scoped by chat id. Pinecone namespaces are chat ids, and local `RagChunk` records include `sessionId`.
- The RAG queue is in-process. For multiple backend instances, it should be moved to Redis/BullMQ or another durable queue.
- Payment routes are currently not protected by auth middleware in the route file, so production hardening should add authorization checks.
- Rate limiting is recommended for auth, OTP, upload, chat, and AI routes before public deployment.
- Some frontend dashboard links/components reference future or older route ideas, but the implemented backend surface listed above is the authoritative current API map.

