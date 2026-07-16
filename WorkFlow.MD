# MediConnect Feature Workflow And Interview Guide

This document is a feature-by-feature technical workflow guide for MediConnect. It is written for interview preparation and for explaining the project from the browser click all the way to API calls, backend controllers, middleware, database writes, third-party integrations, real-time events, AI/RAG behavior, and final responses.

It is based on the current source structure:

- Frontend: `frontend/src/App.jsx`, `frontend/pages`, `frontend/components`, `frontend/store`, `frontend/utils/axois.js`, `frontend/lib/socket.js`.
- Backend: `backend/app.js`, `backend/src/routes`, `backend/src/controllers`, `backend/src/services`, `backend/src/models`, `backend/src/middlewares`, `backend/src/utils/socketHandlers.js`.

Do not include `.env` values in interviews. Talk about environment variable names and service purpose only.

## 1. Project Mental Model

MediConnect is a MERN healthcare platform with separate doctor and patient experiences. Patients can discover doctors, book slots, pay, chat, ask questions over doctor-uploaded documents, join video calls, search medicines, and locate nearby medical facilities. Doctors can register, manage schedules, receive booking/payment notifications, chat with patients, upload medical documents for RAG, join calls, and view payment history.

High-level request path:

```text
User action in React
  -> component or Zustand store
  -> axios/fetch with cookies or bearer token
  -> Express app.js global middleware
  -> route middleware such as isAuthenticated or Multer
  -> controller
  -> service layer where present
  -> Mongoose model and MongoDB
  -> third-party service when needed
  -> Socket.IO event when real-time updates are needed
  -> JSON response to frontend
  -> React state update and UI feedback
```

Backend bootstrap:

1. `app.js` loads environment variables.
2. Express and HTTP server are created.
3. CORS allows configured origins and localhost defaults.
4. Cookie parser, static file serving, CORS, JSON parsing, and URL-encoded parsing are registered.
5. Dashboard assistant endpoints `/chat` and `/chat/:userId/history` are mounted directly.
6. Socket.IO is created on the same HTTP server and initialized by `initializeSocket(io)`.
7. `req.io = io` is attached so controllers can emit real-time events.
8. Domain routers are mounted.
9. `/health` and the central error handler are registered.
10. MongoDB connects through `connectDB()`.
11. Appointment reminder cron starts.
12. Server listens on `PORT` or `5000`.

## 2. Core Technology Choices

| Technology | Where used | Why it was chosen | Interview phrasing |
| --- | --- | --- | --- |
| React + Vite | Frontend | Fast local development, component-based UI, simpler build setup than older CRA projects. | "I used React for reusable UI and Vite for fast HMR and production bundling." |
| React Router | Frontend routing | Declarative page routing for dashboards, chat, video, booking, profiles. | "It keeps page navigation client-side without server round trips." |
| Zustand | Frontend state | Lightweight stores for auth, chat, video, schedules without Redux boilerplate. | "Zustand gave me global state where I needed it, especially auth and socket-heavy views." |
| Tailwind/custom CSS | UI styling | Fast utility styling and responsive layout control. | "It helped me build consistent responsive dashboards quickly." |
| Express | Backend API | Simple routing and middleware model for REST APIs. | "Express was enough for modular controllers, middleware, and Socket.IO integration." |
| MongoDB + Mongoose | Database | Flexible documents for chats with embedded messages, appointments, schedules, users. | "Mongoose gave schemas, validation, hooks, indexes, and population." |
| JWT + HTTP-only cookies | Auth | Stateless access tokens plus refresh tokens; cookies reduce exposure to script access. | "The backend accepts cookies and bearer tokens so browser flows and sockets can both authenticate." |
| Multer | Uploads | Multipart form parsing for avatars and chat files. | "Multer stores temporary files before Cloudinary/S3/local processing." |
| Cloudinary | Avatars and chat file URLs | Managed media storage and signed raw file URLs. | "Cloudinary handled media hosting and signed access for raw files." |
| AWS S3 fallback path | Chat document storage service | Production-friendly private object storage for chat files when configured. | "The storage service can use S3 and fall back to local storage in development." |
| Socket.IO | Chat, notifications, signaling | Reliable real-time events with rooms, auth middleware, reconnect behavior. | "Socket.IO handles low-latency messaging and WebRTC signaling while REST stores authoritative state." |
| WebRTC | Video calls | Direct browser media connection after signaling. | "Socket.IO signals offers, answers, and ICE; WebRTC carries audio/video peer-to-peer." |
| Razorpay | Payments | Indian payment gateway with order and signature verification flow. | "Orders are created server-side and payment signatures are verified with HMAC." |
| Nodemailer/Gmail | Email OTP | Email verification during registration. | "OTP verification blocks login until email ownership is confirmed." |
| Twilio | SMS OTP | Phone OTP support for client registration. | "Twilio adds phone verification as a second channel." |
| Groq/OpenAI-compatible API | Dashboard assistant and RAG answers | Fast chat-completion API with OpenAI-compatible client. | "I abstracted the LLM behind OpenAI-compatible calls so providers can be swapped." |
| LangGraph | Agent assistant | Deterministic two-step agent graph: parse intent, fulfill request. | "LangGraph makes the agent flow explicit instead of uncontrolled tool calling." |
| LangChain | RAG pipeline | Documents, prompts, chains, Pinecone integration. | "LangChain helped structure load, chunk, embed, retrieve, and answer steps." |
| Hugging Face embeddings | RAG vectors | Feature extraction model for semantic retrieval. | "Embeddings convert document chunks and questions into comparable vectors." |
| Pinecone | Vector search | Managed semantic vector index with namespaces per chat. | "A chat ID namespace prevents cross-chat document leakage." |
| Tesseract.js | OCR | Extract text from uploaded report images. | "Image reports can become searchable RAG context." |
| Overpass/OpenStreetMap + Leaflet | Nearby facilities | Open map data and browser map rendering. | "The backend queries Overpass and Leaflet renders results on the map." |
| node-cron | Appointment reminders | Scheduled checks for paid appointments near start time. | "Cron creates reminder notifications without requiring user action." |

## 3. API Inventory

| Domain | Base path | Main endpoints |
| --- | --- | --- |
| Doctor auth/profile/discovery | `/doctor` | `POST /register`, `POST /login`, `POST /verify-email`, `POST /verify-otp`, `POST /logout`, `POST /refresh-token`, `GET /me`, `PATCH /update`, `GET /`, `GET /:id` |
| Client auth/profile | `/client` | `POST /register`, `POST /login`, `POST /verify-email`, `POST /verify-otp`, `POST /logout`, `POST /refresh-token`, `GET /me`, `PATCH /update`, `GET /`, `GET /:id` |
| Schedule | `/schedule` | `POST /create`, `GET /?doctorId=&date=` |
| Slot request | `/slots` | `POST /request`, `PUT /:requestId/status` |
| Payment | `/payments` | `POST /order`, `POST /verify`, `GET /history?doctorId=` |
| Chat | `/chats` and `/api/chats` | `POST /create-or-get`, `GET /booked-contacts`, `GET /user-chats`, `POST /send-message`, `POST /:chatId/query`, `GET /:chatId/messages`, `PATCH /:chatId/mark-read`, `DELETE /:chatId/messages/:messageId` |
| Upload/RAG files | `/api` | `POST /upload`, `GET /chats/:sessionId/files` |
| Video call | `/video-call` | `POST /initiate`, `PATCH /:callId/accept`, `PATCH /:callId/reject`, `PATCH /:callId/end`, `GET /history`, `GET /active`, media control endpoints |
| Notifications | `/notifications` | `GET /`, `GET /unread-count`, `PATCH /read-all`, `PATCH /:notificationId/read` |
| Agent assistant | `/agent` | `POST /query` |
| Medicine search | `/medicines` | `GET /search?name=` |
| Clinics/map | `/clinics` | `GET /nearby-medical`, `GET /nearby-hospitals`, `GET /nearby-clinics`, `GET /nearby-dispensaries` |
| Dashboard assistant | `/chat` | `POST /chat`, `GET /chat/:userId/history` |
| Health | `/health` | `GET /health` |

## 4. Shared Middleware, Models, And Security

### Authentication Middleware

File: `backend/src/middlewares/auth.middleware.js`

Flow:

1. Reads `accessToken` from cookies first.
2. Falls back to `Authorization: Bearer <token>`.
3. Verifies JWT with `ACCESS_TOKEN_SECRET`.
4. Looks up the decoded `_id` in `Doctor`.
5. If no doctor is found, looks in `Client`.
6. Attaches either `req.doctor` or `req.client`.
7. Continues to the controller.

Security considerations:

- JWT validates identity but does not by itself validate role-specific permission. Controllers still check `req.doctor` or `req.client`.
- Access tokens include `userType`, but middleware uses database lookup as the source of truth.
- Refresh tokens are stored on the user document and compared during refresh.
- For production, cookies use `httpOnly`, `secure`, and `sameSite: None` when cross-site deployment requires it.

### Upload Middleware

File: `backend/src/middlewares/multer.middleware.js`

Avatar upload:

- Uses disk storage in `backend/public/temp`.
- Does not enforce avatar MIME restrictions in the base `upload` middleware.

Chat/RAG upload:

- Uses `chatUpload`.
- Allows PDF, DOC, DOCX, TXT, PNG, JPG, JPEG.
- Enforces size from `CHAT_UPLOAD_MAX_SIZE_BYTES` or 10 MB default.
- Validates both MIME type and extension.

### Primary Models

| Model | Purpose |
| --- | --- |
| `Doctor` | Doctor account, credentials, profile, OTP, refresh token. |
| `Client` | Patient/client account, credentials, profile, OTP, refresh token. |
| `Schedule` | Doctor date and slots with fee, booking state, request reference. |
| `SlotRequest` | Appointment reservation between doctor and patient. |
| `Payment` | Razorpay transaction record linked to slot request, doctor, patient. |
| `Chat` | Participants and embedded messages, files, replies, read receipts, AI answers. |
| `UploadedFile` | Doctor-uploaded chat document metadata and RAG indexing state. |
| `RagChunk` | Local fallback document chunks and embeddings. |
| `VideoCall` | Call participants, room ID, media state, lifecycle, ratings, issues. |
| `Notification` | Persisted user notifications. |
| `Medicine` | Medicine catalogue collection. |

## 5. Feature: Doctor And Client Registration, OTP Verification, Login, Logout

### Purpose

Create separate authenticated accounts for doctors and patients, verify ownership through OTP, protect dashboards and actions with JWT, and support session refresh.

### Frontend Entry Points

- `frontend/pages/DoctorSignup.jsx`
- `frontend/pages/ClientSignup.jsx`
- `frontend/pages/DoctorLogin.jsx`
- `frontend/pages/ClientLogin.jsx`
- `frontend/store/doctorAuthStore.js`
- `frontend/store/clientAuthStore.js`

### APIs Used

- Doctor: `POST /doctor/register`, `POST /doctor/verify-email`, `POST /doctor/verify-otp`, `POST /doctor/login`, `POST /doctor/logout`, `POST /doctor/refresh-token`, `GET /doctor/me`.
- Client: `POST /client/register`, `POST /client/verify-email`, `POST /client/verify-otp`, `POST /client/login`, `POST /client/logout`, `POST /client/refresh-token`, `GET /client/me`.

### End-to-End Sequence

1. User submits signup form.
2. Frontend builds `FormData`, including avatar where present.
3. Store calls register endpoint with `multipart/form-data`.
4. Express runs CORS, cookie parser, JSON/urlencoded middleware, then Multer for avatar.
5. Controller validates required fields.
6. Controller checks duplicate email or phone.
7. Avatar is uploaded to Cloudinary with `uploadToCloud()`.
8. OTP is generated with 5-minute expiry.
9. Email OTP is sent with Nodemailer/Gmail.
10. Client registration also calls Twilio through `sendOtp(phone, otp)`.
11. User document is inserted into MongoDB with `verified: false`, hashed password via Mongoose pre-save hook, OTP, and expiry.
12. For clients, access and refresh tokens are created immediately and cookies are set. For doctors, registration asks for email verification before login.
13. User enters OTP.
14. Verification endpoint checks OTP and expiry, sets `verified: true`, clears OTP fields, and returns success.
15. User logs in with email/password.
16. Controller validates password with bcrypt, blocks unverified users, generates access and refresh tokens, stores refresh token, sets cookies, and returns sanitized user data plus tokens.
17. Frontend stores user ID and access token in localStorage for socket authentication and updates Zustand state.

### Database Operations

- `Doctor.findOne({ $or: [{ email }, { phone }] })` or `Client.findOne(...)`.
- `Doctor.create(...)` or `Client.create(...)`.
- Password hashing occurs in model `pre("save")`.
- `doctor.refreshToken` or `client.refreshToken` is updated on login/refresh.
- OTP fields are removed or nulled after verification.

### Third-Party Services

- Cloudinary: avatar upload.
- Nodemailer/Gmail: email OTP.
- Twilio: SMS OTP in client registration.

### Final Response

Successful login returns `ApiResponse` with user data, `accessToken`, `refreshToken`, and HTTP-only cookies.

### Error Handling

- Missing fields: 400.
- Duplicate email/phone: 400.
- Avatar missing for doctor registration: 400.
- Wrong password: 401.
- Unverified account: 401.
- Invalid or expired OTP: 400.
- Invalid refresh token: 401.

### Security Considerations

- Passwords are hashed with bcryptjs.
- Sensitive fields are excluded in many responses with `.select("-password -refreshToken")`.
- Cookies are HTTP-only.
- Refresh token must match the database copy.
- OTP expires after 5 minutes.

### Edge Cases

- OTP email sent but DB create fails: user may receive unusable OTP.
- Client register sends SMS and email; Twilio failure currently returns false but registration may still proceed depending on handling.
- Doctor refresh controller destructures `newRefreshToken`, while the helper returns `refreshToken`; this should be fixed before production.
- Frontend relies on localStorage tokens for Socket.IO because HTTP-only cookies cannot be read by JavaScript.

### 1-Minute Interview Explanation

"I implemented role-based authentication for doctors and clients. Signup validates fields, checks duplicate email or phone, uploads avatars to Cloudinary, sends OTP, stores a hashed password, and marks the account unverified. Login only works after verification. The backend issues JWT access and refresh tokens in HTTP-only cookies and also returns access tokens so Socket.IO can authenticate. Protected APIs use middleware that verifies the token and attaches either `req.doctor` or `req.client`."

### Detailed Interview Explanation

"The auth design has separate `Doctor` and `Client` models because the product has role-specific fields and workflows. Both schemas hash passwords in Mongoose pre-save hooks and expose methods to compare passwords and generate tokens. The `isAuthenticated` middleware extracts a token from cookies or a bearer header, verifies it, finds the user in MongoDB, and attaches the role-specific object to the request. This allows controllers to enforce rules like 'only clients can book' or 'only doctors can upload RAG documents.' Refresh tokens are stored in MongoDB so logout can invalidate the session server-side."

### Production Improvements

- Add Zod/Joi validation for all auth payloads.
- Add rate limiting and lockout for login/OTP endpoints.
- Add resend OTP flow with throttling.
- Add email normalization and stronger password policy.
- Add CSRF protection for cookie-authenticated state-changing routes.
- Remove tokens from JSON response if cookies plus a socket auth exchange are implemented.

## 6. Feature: Profile Update And Current User Hydration

### Purpose

Allow authenticated users to fetch and update their profiles, including avatar replacement.

### Frontend Entry Points

- `frontend/components/DoctorProfile.jsx`
- `frontend/components/ClientProfile.jsx`
- `doctorAuthStore.updateProfile()`
- `clientAuthStore.updateProfile()`

### APIs Used

- `GET /doctor/me`, `PATCH /doctor/update`
- `GET /client/me`, `PATCH /client/update`

### Sequence Flow

1. Dashboard/profile page calls `checkAuth()` or `getCurrentDoctor()`/`getCurrentClient()`.
2. Backend auth middleware verifies token and attaches role object.
3. `GET /me` returns sanitized current user.
4. User edits profile and optionally selects avatar.
5. Frontend sends `FormData` to update route.
6. Controller checks whether changed email/phone conflicts with another user.
7. Password is re-hashed if changed.
8. New avatar is uploaded to Cloudinary if present.
9. Mongoose document is saved and response returns updated profile.

### Database Changes

- Updates fields on `Doctor` or `Client`.
- Optional password hash update.
- Optional avatar URL replacement.

### Error Handling And Edge Cases

- Missing authenticated user: 401.
- Duplicate email/phone: 400.
- Cloudinary failure: 500.
- Client update uses `Object.assign` with potentially undefined fields, so production code should avoid overwriting existing values with undefined.

### Interview Explanation

"Profile update is a protected multipart request. Auth middleware identifies the current user, the controller validates uniqueness if email or phone changed, uploads a new avatar if present, hashes a new password if provided, saves the user, and returns the sanitized record."

### Production Improvements

- Add field-level validation.
- Delete old Cloudinary avatar when replaced.
- Audit profile changes.
- Separate password change from profile edit and require current password.

## 7. Feature: Doctor Discovery And Public Doctor Profiles

### Purpose

Patients can browse and search verified doctors before booking.

### Frontend Entry Points

- `frontend/components/GetDoctor.jsx`
- `frontend/components/PatientBookingPortal.jsx`
- `frontend/components/DoctorPublicProfile.jsx`
- `doctorAuthStore.getAllDoctors()`

### APIs Used

- `GET /doctor?page=&limit=&specialization=&experience=&gender=&verified=&search=`
- `GET /doctor/:id`

### Sequence Flow

1. User opens doctor listing or booking page.
2. Frontend requests `/doctor`.
3. Controller builds MongoDB filter from query params.
4. Controller counts matching doctors for pagination.
5. Controller fetches doctors sorted by newest first.
6. Sensitive fields are excluded.
7. Public detail page calls `/doctor/:id`.
8. Backend validates ObjectId and returns only verified doctor profiles.

### Database Operations

- `Doctor.countDocuments(filter)`.
- `Doctor.find(filter).select("-password -refreshToken -otp -otpExpires")`.
- `Doctor.findById(id)` for detail.

### Security And Edge Cases

- Public details reject invalid ObjectId.
- Unverified doctors return 404 on public profile.
- Search uses regex, which is flexible but can be slow at scale.

### Interview Explanation

"Doctor discovery is a public read flow. The backend supports filtering, search, pagination, and sanitization. The profile route validates IDs and only exposes verified doctors so incomplete or unverified registrations are not public."

### Production Improvements

- Add text indexes or Atlas Search.
- Add verified-only default on public listing.
- Add admin moderation and doctor verification workflow.
- Cache popular filters.

## 8. Feature: Doctor Schedule Management

### Purpose

Doctors publish date-specific slots with consultation fees.

### Frontend Entry Points

- `frontend/components/DoctorSchedue.jsx`
- Some store methods in `frontend/store/schedule.store.js` are broader than the backend currently implements.

### APIs Used

- `POST /schedule/create`
- `GET /schedule?doctorId=&date=`

### Sequence Flow

1. Doctor opens schedule manager.
2. Frontend gets current doctor data.
3. Doctor selects date and adds one or more `{ time, fee }` slots.
4. Frontend sends `POST /schedule/create` with bearer token.
5. Auth middleware attaches `req.doctor`.
6. Controller uses `req.doctor._id` as authoritative doctor ID.
7. If schedule already exists for that date, new slots are appended.
8. If no schedule exists, a new `Schedule` document is created.
9. UI displays success and can fetch schedule by doctor/date.

### Database Changes

- Inserts or updates `Schedule`.
- Each slot has `time`, `fee`, `isBooked`, `bookedBy`, `requestId`.

### Error Handling

- Missing date or slots: 400.
- Schedule fetch missing doctor/date: 400.
- No schedule found: 404.
- Unexpected DB failure: 500.

### Security Considerations

- Create schedule is protected.
- Controller uses authenticated doctor ID instead of trusting body `doctorId`.

### Edge Cases

- Duplicate time slots can be appended because there is no duplicate slot validation.
- Date is stored as string, so date format consistency is important.
- Existing frontend store references unimplemented schedule endpoints such as `/schedule/my-schedule`; the active component uses implemented endpoints.

### Interview Explanation

"Doctors create date-based availability. The authenticated doctor posts a date and slot array; the backend either appends slots to an existing schedule for that date or creates a new schedule. Slots are later locked when a patient reserves them."

### Production Improvements

- Add unique schedule index on `{ doctorId, date }`.
- Prevent duplicate time slots.
- Use transaction or atomic update for appending slots.
- Add timezone-aware slot format and validation.
- Add schedule edit/delete endpoints if required by UI.

## 9. Feature: Appointment Slot Request And Booking Lock

### Purpose

Reserve a doctor slot for a patient and prevent another patient from booking the same slot.

### Frontend Entry Points

- `frontend/components/PatientBookingPortal.jsx`
- `frontend/components/AgentAssistant.jsx` for AI-assisted booking.

### APIs Used

- `GET /doctor`
- `GET /schedule?doctorId=&date=`
- `POST /slots/request`
- Optional doctor action: `PUT /slots/:requestId/status`

### Sequence Flow

1. Patient browses doctors.
2. Patient selects doctor and date.
3. Frontend fetches schedule for that doctor/date.
4. Patient clicks a slot.
5. Frontend sends `POST /slots/request` with `doctorId`, `scheduleId`, `slotIndex`.
6. Auth middleware verifies token and attaches `req.client`.
7. Controller rejects if request is not from a client.
8. Service `createAndLockSlotRequest()` loads schedule.
9. Service checks slot exists and is available: `!slot.isBooked && !slot.requestId`.
10. Service creates `SlotRequest` with doctor, patient, schedule, date, time, fee, `status: pending`, `paymentStatus: unpaid`.
11. Service marks schedule slot as booked, assigns `bookedBy`, and stores `requestId`.
12. Backend creates a doctor notification `slot_booked`.
13. Frontend stores pending slot request and shows payment action.

### Database Changes

- Creates `SlotRequest`.
- Updates `Schedule.slots[slotIndex]` with booking lock fields.
- Creates `Notification` for doctor.

### Final Response

`{ success: true, request: newRequest }`

### Error Handling

- No client in request: 401.
- Missing fields: 400.
- Schedule not found: 404.
- Invalid slot index: 400.
- Slot not available: 400.

### Security Considerations

- Only authenticated clients can request slots.
- Booking access later gates chat and video.
- The current lock is not wrapped in a MongoDB transaction, so concurrent requests are a production risk.

### Edge Cases

- Payment cancellation leaves a pending unpaid locked slot.
- Slot lock does not currently expire automatically.
- Doctor accept/reject route exists, but payment verification can also accept automatically.

### 1-Minute Interview Explanation

"When a patient requests a slot, I create a `SlotRequest` and immediately lock the schedule slot by setting `isBooked`, `bookedBy`, and `requestId`. This prevents the UI from showing it as available while payment is pending. Payment verification later marks it paid and accepted."

### Detailed Interview Explanation

"The booking flow uses a service layer because both manual booking and the agent booking need the same lock behavior. The service loads the schedule, validates slot availability, creates the request with copied date/time/fee fields, and marks the slot as reserved. Chat and video access then use `hasBookedAppointmentBetween()` to check whether a doctor-patient pair has a non-rejected booking."

### Production Improvements

- Use MongoDB transactions or an atomic `findOneAndUpdate` with slot availability condition.
- Add payment timeout and release unpaid reservations.
- Add unique constraints to prevent duplicate active requests for the same slot.
- Emit real-time schedule updates to connected users.

## 10. Feature: Razorpay Payment And Doctor Payment History

### Purpose

Collect consultation fee, verify payment authenticity, confirm appointment, and record doctor earnings.

### Frontend Entry Points

- `frontend/components/PatientBookingPortal.jsx`
- `frontend/components/AgentAssistant.jsx`
- `frontend/components/DoctorPayementPortal.jsx`

### APIs Used

- `POST /payments/order`
- `POST /payments/verify`
- `GET /payments/history?doctorId=`

### Sequence Flow

1. Patient reserves a slot and receives `slotRequestId`.
2. Frontend loads Razorpay checkout script.
3. Frontend calls `POST /payments/order` with `slotRequestId` and amount.
4. Backend creates Razorpay order with amount in paise, INR currency, and receipt.
5. Frontend opens Razorpay checkout with order ID.
6. Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
7. Frontend posts those fields to `/payments/verify` with `slotRequestId`.
8. Backend computes HMAC SHA-256 over `order_id|payment_id` with `RAZORPAY_KEY_SECRET`.
9. If signatures match, backend loads `SlotRequest`, sets `paymentStatus: paid`, `status: accepted`, and calls `confirmSlotRequestBooking()`.
10. Backend creates payment success notifications for doctor and patient.
11. Backend creates `Payment` record.
12. Frontend shows appointment confirmed.
13. Doctor payment portal fetches payment history by doctor ID and displays rows and totals.

### Database Changes

- Updates `SlotRequest.status` and `SlotRequest.paymentStatus`.
- Ensures related `Schedule` slot is booked.
- Inserts `Payment`.
- Inserts `Notification` records for both participants.

### Third-Party Service

- Razorpay order creation and checkout.
- Backend signature verification is local HMAC, not a blind trust of frontend payment result.

### Error Handling

- Missing order input: 400.
- Razorpay order creation failure: 500.
- Signature mismatch: 400.
- Slot request not found: 404.
- Internal DB failure: 500.

### Security Considerations

- Signature verification prevents forged payment success.
- Production should not trust frontend amount; amount should be derived from `SlotRequest.fee`.
- Payment endpoints should be authenticated and role-checked.

### Edge Cases

- Duplicate verification can create duplicate `Payment` rows unless idempotency is added.
- If payment succeeds but DB write fails, reconciliation is needed.
- Current frontend has fallback test key in code; production must use `VITE_RAZORPAY_KEY_ID`.

### 1-Minute Interview Explanation

"The payment flow creates a Razorpay order server-side, opens checkout in the browser, then verifies the returned signature on the backend. Only after verification do I mark the slot request paid and accepted, persist a `Payment`, and notify both doctor and patient."

### Production Improvements

- Authenticate all payment endpoints.
- Derive amount on backend from `SlotRequest`.
- Add idempotency by unique index on `transactionId`.
- Add webhook reconciliation for payment success/failure.
- Store full gateway event audit trail.

## 11. Feature: Notifications And Appointment Reminders

### Purpose

Persist important events and show users updates for bookings, payments, reminders, chat messages, and calls.

### Frontend Entry Points

- `frontend/components/NotificationBell.jsx`
- `frontend/components/NotificationPanel.jsx`

### APIs Used

- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/read-all`
- `PATCH /notifications/:notificationId/read`

### Sequence Flow

1. Feature controller calls notification service after an event:
   - Slot reserved: `notifyDoctorSlotBooked`.
   - Payment completed: `notifyAppointmentPaid`.
   - Reminder due: `notifyAppointmentReminder`.
   - Chat message: `notifyChatMessage`.
   - Video call invite: `notifyVideoCallInvite`.
2. Service inserts `Notification`.
3. When `req.io` is available, controllers emit `notification:new` to `user_<recipientId>` room.
4. Frontend notification components poll `/notifications` every 30 seconds and mark all read on action.
5. Socket-connected users can also receive immediate events.

### Appointment Reminder Cron

1. `startAppointmentReminderCron()` runs on backend startup.
2. Default schedule is `*/5 * * * *`.
3. Finds accepted, paid slot requests with `reminderSentAt: null`.
4. Parses appointment date/time in Asia/Kolkata.
5. If appointment is within the reminder window, creates reminders for both parties.
6. Sets `reminderSentAt` to avoid duplicates.

### Database Changes

- Inserts `Notification`.
- Updates `SlotRequest.reminderSentAt`.

### Error Handling And Edge Cases

- Notification fetch requires auth; missing token is rejected.
- Cron skips invalid date/time strings.
- In multiple backend instances, cron can send duplicate reminders unless guarded by a distributed lock or atomic update.

### Interview Explanation

"Notifications are persisted in MongoDB and optionally delivered in real time through user-specific Socket.IO rooms. That means users can see updates after refresh, and online users can receive immediate events. The reminder cron scans upcoming paid appointments and creates reminder notifications once per slot request."

### Production Improvements

- Add push/email/SMS notification channels.
- Use a job queue for reminders.
- Add atomic claim for reminder jobs.
- Add unread-count socket updates.
- Add notification preferences.

## 12. Feature: Chat Access, Contacts, And Chat Session Creation

### Purpose

Allow doctor-patient messaging only when there is an appointment relationship.

### Frontend Entry Points

- `frontend/pages/ChatPage.jsx`
- `frontend/store/chatStore.js`

### APIs Used

- `GET /chats/booked-contacts`
- `POST /chats/create-or-get`
- `GET /chats/user-chats`

### Sequence Flow

1. Chat page initializes user type from auth stores and localStorage token.
2. `connectSocket()` opens Socket.IO connection with bearer token in handshake auth.
3. Chat page fetches `/chats/booked-contacts`.
4. Backend finds `SlotRequest` rows where current user is doctor or patient and status is not rejected.
5. Contacts are populated with doctor/patient data and latest booking.
6. User selects a contact.
7. Frontend calls `/chats/create-or-get`.
8. Backend checks `hasBookedAppointmentBetween()` for the two users.
9. If allowed, backend finds existing chat with both participants or creates one.
10. Frontend sets current chat, emits `joinChat`, and loads messages.

### Database Operations

- `SlotRequest.find(...)` for contacts.
- `Chat.findOne(...)` for existing chat.
- `Chat.create(...)` for new consultation chat.

### Security Considerations

- Chat creation is blocked without a non-rejected booking.
- Socket `joinChat` also checks participant membership and booking access.
- Chat queries always verify current user is a participant.

### Edge Cases

- Pending unpaid bookings currently grant chat access because `hasBookedAppointmentBetween()` accepts paid, accepted, or pending non-rejected records.
- A stricter production policy might require `paymentStatus: paid`.

### Interview Explanation

"I gate chat by appointment relationship. The backend does not let arbitrary users message each other; it checks `SlotRequest` before creating or joining a chat. That same rule is enforced in REST controllers and Socket.IO handlers."

### Production Improvements

- Decide whether chat should open after pending booking or only after payment.
- Add admin/system messages for appointment events.
- Add pagination and search for contact list.

## 13. Feature: Real-Time Chat, Attachments, Replies, Read Receipts, Delete

### Purpose

Provide secure doctor-patient consultation chat with REST persistence and Socket.IO updates.

### Frontend Entry Points

- `frontend/pages/ChatPage.jsx`
- `frontend/store/chatStore.js`

### APIs And Socket Events

REST:

- `GET /chats/:chatId/messages?page=&limit=`
- `POST /chats/send-message`
- `PATCH /chats/:chatId/mark-read`
- `DELETE /chats/:chatId/messages/:messageId`

Socket:

- `joinChat`, `leaveChat`
- `newMessage`, `message:receive`
- `typing`, `userTyping`
- `messagesRead`
- `file:receive`
- `query:answer`

### Text Message Flow

1. User types message and submits.
2. Frontend calls `sendMessage(chatId, content, "text")`.
3. Backend auth middleware verifies identity.
4. `chatUpload.single("file")` runs but no file is present.
5. Controller validates chat ID and content.
6. Controller loads chat and verifies participant.
7. Controller checks booking access.
8. Optional `replyTo` is resolved into a snapshot by `buildReplyToSnapshot()`.
9. Message is appended to `Chat.messages`.
10. Chat `lastMessage` is updated.
11. Sender is populated.
12. Backend emits `newMessage` to the chat room.
13. Backend creates and emits chat notification to the other user.
14. Response returns saved message.
15. Frontend updates local message list and chat preview.

### File Attachment Flow

1. User attaches file or image.
2. Frontend sends `multipart/form-data` to `/chats/send-message`.
3. `chatUpload` validates type and size.
4. Controller determines `messageType` as `image` or `file`.
5. File is uploaded to Cloudinary.
6. For raw file resources, backend generates signed view/download URLs.
7. If a doctor uploads supported document type, `UploadedFile` is created with `ragStatus: pending` and RAG ingestion is queued.
8. Message is saved with file metadata.
9. `newMessage` and `file:receive` events are emitted.
10. Response returns saved message.

### Read Receipts

1. Chat page finds unread messages from other participant.
2. Frontend calls `PATCH /chats/:chatId/mark-read`.
3. Backend adds current user to each message's `readBy` array.
4. Backend emits `messagesRead` to chat room.

### Delete Message

1. User chooses delete on own message.
2. Frontend calls `DELETE /chats/:chatId/messages/:messageId`.
3. Backend loads chat and message.
4. Backend verifies sender is current user.
5. Backend allows deletion only within 5 minutes of `createdAt`.
6. Message is removed from embedded array.
7. Backend emits `messageDeleted`.

### Database Changes

- Appends or removes embedded messages in `Chat`.
- Updates `readBy` array.
- Creates `UploadedFile` when doctor file should be indexed.
- Creates notification for recipient.

### Error Handling

- Missing chat or content/file: 400.
- Unauthorized participant: 403.
- No booking relationship: 403.
- Unsupported file type or too large: 400 or 413.
- Delete outside 5-minute window: 400.

### Security Considerations

- Chat room join and message send are both checked.
- File upload allowlist reduces dangerous file handling.
- Signed Cloudinary raw URLs reduce permanent public file exposure.
- Reply snapshots avoid trusting arbitrary reply metadata from the client.

### Edge Cases

- `chatStore.startTyping()` emits `startTyping`, but backend listens for `typing`; this should be aligned.
- REST save already broadcasts the message, so frontend avoids emitting duplicate `sendMessage`.
- Embedded chat messages can grow large; long-term scale should move messages to a separate collection.

### 1-Minute Interview Explanation

"The chat system stores messages in MongoDB and uses Socket.IO only for live delivery. A message is first authorized, saved, and then broadcast to the chat room. Attachments are uploaded through Multer and Cloudinary. Read receipts and deletion are persisted, and all chat access is gated by appointment relationship."

### Production Improvements

- Move messages to their own collection for large chats.
- Add message delivery status and retry queues.
- Add Redis adapter for Socket.IO scaling.
- Add antivirus scanning for uploads.
- Add audit trails for deleted messages in healthcare context.

## 14. Feature: Doctor Document Upload And RAG Ingestion

### Purpose

Let doctors upload patient-relevant documents inside a chat, index them, and make them available for patient Q&A.

### Frontend Entry Points

- `frontend/pages/ChatPage.jsx`
- `chatStore.uploadFile(sessionId, file)`
- File upload can also happen through `/chats/send-message` when doctor attaches supported file.

### APIs Used

- `POST /api/upload`
- `GET /api/chats/:sessionId/files`
- Indirectly: `POST /chats/send-message`

### RAG Ingestion Sequence

1. Doctor selects a PDF/DOC/DOCX/TXT/PNG/JPG/JPEG.
2. Frontend sends `POST /api/upload` with `sessionId`, `doctorId`, and file.
3. Auth middleware verifies doctor.
4. Controller confirms current user is a doctor and `doctorId` matches authenticated doctor.
5. `assertDoctorInSession()` confirms the doctor is a participant in the chat.
6. Storage service stores the file:
   - S3 if `AWS_S3_BUCKET` and `AWS_REGION` are configured.
   - Local `public/uploads/chat` fallback otherwise.
7. `UploadedFile` is created with `ragStatus: pending`.
8. A file/image chat message is appended.
9. Backend emits `file:receive` and `newMessage`.
10. `enqueueRagIngestion()` pushes a background in-memory job.
11. Queue marks file `processing`.
12. `ingestUploadedFile()` loads document text:
   - PDF: `pdf-parse`.
   - DOCX: `mammoth`.
   - DOC: `word-extractor`.
   - TXT: filesystem read.
   - Image: Tesseract OCR.
13. Extracted text is cleaned and PHI-like fields are masked.
14. Text is split into 500-character chunks with overlap.
15. Chunks are embedded with Hugging Face feature extraction.
16. If Pinecone is configured, chunks are upserted into index namespace equal to `sessionId`.
17. Chunks are also stored in MongoDB `RagChunk` for fallback retrieval.
18. `UploadedFile.ragStatus` becomes `indexed`; errors set `failed`.

### Database Changes

- Inserts `UploadedFile`.
- Appends chat message.
- Inserts or replaces `RagChunk` records.
- Updates `UploadedFile.ragStatus`, `chunkCount`, `ragError`.

### Third-Party Services

- S3 or local storage for files in `/api/upload`.
- Cloudinary when uploading through `/chats/send-message`.
- Hugging Face embedding endpoint.
- Pinecone vector index if configured.
- Tesseract runs locally for OCR.

### Security Considerations

- Only doctors in that chat can upload RAG documents.
- Chat ID namespace isolates vector retrieval per conversation.
- PHI-like values are masked before embedding.
- Upload types and size are restricted.

### Edge Cases

- In-memory RAG queue is not safe across multiple backend instances.
- Cloudinary upload path keeps temp file for RAG ingestion when needed.
- If Hugging Face embedding fails, text chunks are stored and lexical retrieval can still work.
- If Pinecone is not configured, MongoDB local retrieval is used.

### Interview Explanation

"Doctor documents are ingested asynchronously. The request returns quickly after storing metadata and emitting the file message, while a queue extracts text, masks PHI, chunks it, embeds it, stores vectors in Pinecone by chat namespace, and stores local fallback chunks in MongoDB. The file's RAG status tracks pending, processing, indexed, failed, or skipped."

### Production Improvements

- Replace in-memory queue with BullMQ/Redis.
- Add malware scanning and private object storage.
- Add progress events for `ragStatus`.
- Encrypt medical documents at rest.
- Add retention and deletion policies.

## 15. Feature: Patient Document Q&A With Hybrid RAG

### Purpose

Allow a patient to ask questions about documents shared by their doctor, with optional web reference fallback.

### Frontend Entry Points

- `frontend/pages/ChatPage.jsx`
- `chatStore.askQuestion(sessionId, question, replyTo)`

### APIs And Socket Events

- Preferred real-time: Socket event `query:ask`.
- Fallback REST: `POST /chats/:chatId/query`.
- Server emits `query:answer`, `message:receive`, and `newMessage`.

### Sequence Flow

1. Patient enters a document question.
2. If replying to a document message, frontend sends `replyTo` with `fileId`.
3. Chat store uses socket `query:ask` when connected; otherwise REST endpoint.
4. Backend verifies chat participant and booking relationship.
5. `askQuestionInSession()` saves the patient's question as a normal chat message with metadata `{ questionType: "rag" }`.
6. Backend emits the question message to the chat.
7. If `replyTo.fileId` exists, retrieval filters to that file only.
8. If replying to a doctor text message, that message preview is used as direct context.
9. Otherwise backend retrieves top relevant chunks from Pinecone or local `RagChunk`.
10. If no document context exists, or answer is fallback, backend runs web search if enabled.
11. Web providers try Brave, then Serper, then DuckDuckGo HTML fallback.
12. Groq/OpenAI-compatible chat model answers using the system prompt.
13. Backend saves AI answer as a chat message with `messageType: "ai"` and sources.
14. Backend emits `query:answer` and `newMessage`.
15. Frontend renders AI answer and document/web sources.

### AI/RAG Logic

- System prompt says to use only provided context.
- Doctor documents are preferred.
- Web context is used only when documents are missing, insufficient, or need general reference interpretation.
- If neither context answers, exact fallback is returned.
- Sources include document file names and web titles/URLs.

### Database Changes

- Appends patient question message to `Chat.messages`.
- Appends AI answer message to `Chat.messages`.

### Error Handling

- Empty question: 400.
- Unauthorized chat participant: 403.
- Missing RAG configuration: returns fallback answer.
- Socket timeout on frontend after 45 seconds.

### Security Considerations

- Retrieval is scoped to chat session ID.
- File-specific questions filter by `file_id`.
- PHI masking occurs before embedding.
- Web fallback can be disabled by `WEB_SEARCH_ENABLED=false`.

### 1-Minute Interview Explanation

"RAG Q&A uses the chat as the security boundary. The chat ID becomes the Pinecone namespace, so a patient can retrieve only documents shared in that conversation. Questions and answers are saved as chat messages, and the AI response includes sources. If document context is insufficient, an optional web fallback provides general medical references."

### Detailed Interview Explanation

"The RAG pipeline separates ingestion from answering. Ingestion extracts and embeds document chunks. Answering retrieves chunks by session and optionally file ID, builds context, sends it to a Groq-compatible LLM through LangChain, then stores the answer in the same chat timeline. Reply-specific Q&A is important because if a patient replies to a particular report, the backend uses that file ID to avoid mixing sources."

### Production Improvements

- Add medical source allowlist for web fallback.
- Add confidence scoring and "insufficient evidence" handling.
- Add streaming responses.
- Add human review warnings for medical advice.
- Use stronger de-identification for PHI.

## 16. Feature: WebRTC Video Calls

### Purpose

Support doctor-patient video consultations after a booking relationship exists.

### Frontend Entry Points

- `frontend/pages/VideoPage.jsx`
- `frontend/store/videoStore.js`

### APIs And Socket Events

REST:

- `POST /video-call/initiate`
- `PATCH /video-call/:callId/accept`
- `PATCH /video-call/:callId/reject`
- `PATCH /video-call/:callId/end`
- `GET /video-call/history`
- `GET /video-call/active`
- `PATCH /video-call/:callId/camera`
- `PATCH /video-call/:callId/microphone`
- `PATCH /video-call/:callId/screen-share`
- `GET /video-call/:callId/media-permissions`
- `PATCH /video-call/:callId/quality`
- `POST /video-call/:callId/rate`
- `POST /video-call/:callId/report-issue`

Socket signaling:

- `call-offer`, `offer`
- `call-answer`, `answer`
- `iceCandidate`
- `call-rejected`, `call-ended`
- `joinCallRoom`, `leaveCallRoom`
- Media events such as `userToggleVideo`, `userToggleAudio`, `userShareScreen`

### Call Initiation Flow

1. User opens video page.
2. Frontend initializes auth and Socket.IO with token.
3. Frontend fetches booked contacts from `/chats/booked-contacts`.
4. Caller selects contact and clicks start call.
5. Frontend calls `POST /video-call/initiate`.
6. Backend validates participant exists.
7. Backend checks `hasBookedAppointmentBetween()`.
8. Backend closes stale active call if found.
9. Backend creates `VideoCall` with participants, initiator, `roomId`, call status `initiated`.
10. Backend sends notification and `incomingCall` to recipient room.
11. Backend changes status to `ringing`.
12. Frontend gets local media using `getUserMedia`.
13. Frontend creates `RTCPeerConnection` with Google STUN servers.
14. Frontend adds local tracks and creates WebRTC offer.
15. Frontend emits `call-offer` with offer, callId, roomId, target user ID.
16. Socket handler checks target online and booking access, then forwards unified `offer`.
17. Callee sees incoming call modal.

### Accept And WebRTC Connection Flow

1. Callee accepts.
2. Frontend calls `PATCH /video-call/:callId/accept`.
3. Backend verifies participant and valid call state.
4. Backend sets `callStatus: ongoing`, `startTime`, joinedAt, and media state.
5. Backend emits `callAccepted`.
6. Callee processes remote offer, creates local media stream, creates answer, and emits `call-answer`.
7. Caller receives `answer` and sets remote description.
8. Both sides exchange ICE candidates through Socket.IO.
9. Browser establishes peer-to-peer media path.
10. Remote streams render in `<video>` elements.

### End, Reject, Controls, History

- Reject sets `callStatus: rejected`, `endTime`, emits `callRejected`.
- End calculates duration, sets `callStatus: ended`, `endTime`, participant `leftAt`, emits `callEnded`.
- Camera/microphone/screen share endpoints update `VideoCall.participants.mediaState` and emit room events.
- History returns paginated calls for current user.
- Rating only works for ended calls and only once by current user.
- Technical issue report appends to `technicalIssues`.

### Database Changes

- Creates and updates `VideoCall`.
- Stores room ID, status, start/end/duration, media state, ratings, and issues.
- Creates notification for incoming call.

### Security Considerations

- All video APIs require auth.
- Call initiation requires booking relationship.
- Socket signaling also checks booking relationship for offers.
- Call room join verifies participant membership.

### Edge Cases

- Target offline returns `call-failed`.
- Stale active calls are auto-ended before new call creation.
- ICE candidates can arrive before remote description, so frontend queues them.
- WebRTC often needs TURN in production, not only STUN.

### 1-Minute Interview Explanation

"Video calls combine REST for authoritative call lifecycle and Socket.IO for WebRTC signaling. Starting a call creates a `VideoCall` record, notifies the other user, and then the browsers exchange offer, answer, and ICE candidates over sockets. Media itself flows through WebRTC, while MongoDB stores history, status, duration, ratings, and issues."

### Production Improvements

- Add TURN server for NAT traversal.
- Add call timeout if ringing too long.
- Add Redis adapter for Socket.IO.
- Add recording only with consent and compliance controls.
- Add better network quality telemetry.

## 17. Feature: Smart Booking Agent

### Purpose

Let clients use natural language to search doctors, check availability, or reserve a booking.

### Frontend Entry Point

- `frontend/components/AgentAssistant.jsx`

### API Used

- `POST /agent/query`

### Sequence Flow

1. Client types prompt, for example "I have fever, show doctors" or "book with Dr. X on 2026-07-20".
2. Frontend sends prompt with client bearer token.
3. Auth middleware attaches `req.client`.
4. Controller rejects non-clients.
5. LangGraph starts with `parse_prompt`.
6. OpenAI-compatible LLM returns JSON: `intent`, `searchQuery`, `symptoms`, `doctorName`, `date`, `timePreference`.
7. Local helper logic normalizes dates and maps symptoms to specializations.
8. `fulfill_request` handles intent:
   - `search_doctors`: Mongo search in `Doctor`.
   - `check_availability`: find schedules on date and available slots.
   - `book_appointment`: identify doctor, find next available slot, call `createAndLockSlotRequest()`, notify doctor, create Razorpay order.
   - `payment_intent`: asks for booking details.
9. Response includes reply, intent, doctors, availability, and optional booking/payment order.
10. Frontend renders doctor cards, availability, or payment button.
11. Payment flow reuses `/payments/order` and `/payments/verify`.

### Database Changes

- For booking intent, creates `SlotRequest`, updates `Schedule` slot, creates notification.
- Doctor search and availability are read-only.

### AI Flow

- LLM is used for structured intent parsing only.
- Deterministic backend code performs actual booking and payment order creation.
- This is safer than letting the model directly mutate data.

### Error Handling

- Missing prompt: 400.
- LLM not configured: 500.
- Provider error: mapped to provider status or 502.
- Invalid JSON from model: 502.
- Doctor not found: 404.
- No available slot: 404.

### Security Considerations

- Only authenticated clients can use booking agent.
- Agent does not trust model for database writes; it uses validated service functions.
- Payment confirmation still requires Razorpay verification.

### Interview Explanation

"The agent is intentionally structured as parse then fulfill. The LLM converts natural language into JSON intent, but business logic remains deterministic in the backend. That prevents the model from directly creating arbitrary bookings. For booking, the agent reuses the same slot-locking service as the manual flow."

### Production Improvements

- Add confirmation step before reserving slots.
- Add tool-call audit logs.
- Add stricter JSON schema validation.
- Add fallback parser when LLM is down.
- Add appointment cancellation/retry logic.

## 18. Feature: Dashboard Assistant ChatBot

### Purpose

Provide a lightweight dashboard helper for navigation and general app assistance.

### Frontend Entry Point

- `frontend/components/ChatBot.jsx`

### APIs Used

- `POST /chat`
- `GET /chat/:userId/history`

### Sequence Flow

1. ChatBot creates or reads anonymous dashboard `userId` from localStorage.
2. On open, frontend fetches history from `/chat/:userId/history`.
3. User sends message.
4. Frontend posts `{ userId, message }` to `/chat`.
5. Backend validates user ID and non-empty message.
6. Backend creates user message and gets assistant response.
7. If `GROQ_API_KEY` exists, backend calls Groq OpenAI-compatible chat completions with a dashboard navigation system prompt.
8. If Groq is missing or fails, backend returns simple local fallback responses.
9. Backend stores recent messages in in-memory `chatHistory`.
10. Response returns assistant message, response text, and history.
11. Frontend stores last 80 messages locally.

### Database Changes

- None. History is in process memory and localStorage.

### Security And Edge Cases

- It is not medical diagnosis; system prompt tells it not to diagnose.
- In-memory history disappears on server restart and is not shared across instances.
- It is not authenticated to user account; it uses a local dashboard ID.

### Interview Explanation

"The dashboard assistant is a small in-app helper. It uses Groq when configured, but has a local fallback. It is scoped to navigation and general app help, not clinical diagnosis, and it keeps lightweight in-memory history."

### Production Improvements

- Persist history per authenticated user.
- Add rate limits.
- Add streaming.
- Add retrieval over app documentation.

## 19. Feature: Medicine Search

### Purpose

Search a MongoDB medicine collection by medicine name and show practical metadata.

### Frontend Entry Point

- `frontend/pages/MedicineSearch.jsx`

### API Used

- `GET /medicines/search?name=`

### Sequence Flow

1. User types medicine name.
2. Frontend waits 500 ms debounce.
3. Frontend calls `/medicines/search?name=<query>`.
4. Backend validates `name`.
5. Backend performs case-insensitive regex search on `Medicine.name`.
6. Backend selects fields such as name, price, discontinued flag, manufacturer, type, pack size, composition.
7. Frontend groups results by manufacturer and displays results.

### Database Operations

- `Medicine.find({ name: { $regex: name, $options: "i" } })`.

### Error Handling

- Missing query: 400.
- DB error: 500.
- Frontend shows no results or error.

### Security And Edge Cases

- Regex search can be slow on large collections.
- This should be informational, not prescribing advice.

### Interview Explanation

"Medicine search is a read-only MongoDB lookup. The UI debounces input, the backend performs case-insensitive search, and results are grouped by manufacturer for easier scanning."

### Production Improvements

- Add indexes/text search/autocomplete.
- Add pagination and result limits.
- Add medical disclaimer and source/version for medicine dataset.
- Add typo-tolerant search.

## 20. Feature: Nearby Medical Facility Finder

### Purpose

Find nearby hospitals, clinics, doctors, and pharmacies using user geolocation.

### Frontend Entry Point

- `frontend/components/NearbyClinicMap.jsx`

### APIs Used

- `GET /clinics/nearby-medical?lat=&lng=&radius=`
- `GET /clinics/nearby-hospitals?lat=&lng=&radius=`
- `GET /clinics/nearby-clinics?lat=&lng=&radius=`
- `GET /clinics/nearby-dispensaries?lat=&lng=&radius=`

### Sequence Flow

1. User opens nearby facilities page.
2. Browser requests geolocation permission.
3. Frontend sends lat/lng/radius to backend.
4. Backend builds Overpass query bounding box.
5. Backend tries multiple Overpass mirrors:
   - plain text POST,
   - form-encoded POST,
   - GET fallback.
6. Backend maps raw OSM elements into normalized facility objects.
7. `/nearby-medical` categorizes results into hospitals, clinics, dispensaries.
8. Frontend uses Leaflet to render markers and facility details.

### Third-Party Services

- Overpass API and OpenStreetMap data.
- Leaflet for map rendering.

### Error Handling

- Missing lat/lng: 400.
- All Overpass endpoints fail: 500 with details.
- Browser geolocation denied: frontend error state.

### Edge Cases

- OSM data may be incomplete or stale.
- Radius is converted to degrees using approximate `radius / 111`.
- Overpass can rate-limit or timeout.

### Interview Explanation

"The map feature uses browser geolocation, sends coordinates to Express, and the backend queries Overpass instead of exposing complex Overpass logic in the frontend. It normalizes OSM tags and returns categorized results for Leaflet markers."

### Production Improvements

- Add caching by geohash/radius.
- Add rate limiting.
- Add fallback to paid Places API where accuracy matters.
- Improve distance sorting using haversine formula.

## 21. Feature: Health Check And Deployment Configuration

### Purpose

Support deployment and monitoring for frontend/backend.

### Files And APIs

- `backend/app.js`: `GET /health`.
- `render.yaml`: backend service configuration.
- `frontend/vercel.json`: SPA rewrite to `index.html`.
- `DEPLOYMENT_GUIDE.md`, `DEPLOYMENT_CHECKLIST.md`.

### Sequence Flow

1. Platform starts backend.
2. Backend connects MongoDB.
3. Reminder cron starts unless disabled.
4. Server listens on configured port.
5. Health checker calls `/health`.
6. Response includes status, timestamp, and uptime.

### Interview Explanation

"The backend exposes a simple health endpoint for deployment monitoring. Vercel handles frontend SPA rewrites, while Render can run the Express API. Environment variables configure MongoDB, CORS, cookies, storage, AI, payments, and third-party services."

### Production Improvements

- Add readiness check that verifies MongoDB and critical services.
- Add structured logs and metrics.
- Add error monitoring.
- Add CI checks for lint/build/tests.

## 22. Common Interview Questions And Answers

### Architecture

Q: Why MERN for this project?

A: "The product is data-heavy, real-time, and form-driven. MongoDB works well for flexible documents like chat messages and schedules. Express provides a simple API layer, React supports rich dashboards, and Node lets REST, Socket.IO, and background jobs share one runtime."

Q: Why separate doctor and client models?

A: "They have different profile fields, permissions, and workflows. Separate models make validation and role-specific queries simpler. The auth middleware still exposes a unified pattern by attaching either `req.doctor` or `req.client`."

Q: How do you prevent unauthorized chat or video?

A: "Both chat and video check appointment access using `hasBookedAppointmentBetween()`. The check is enforced in REST controllers and Socket.IO handlers. Users must also be actual chat/call participants."

### Authentication

Q: Why use both cookies and bearer tokens?

A: "HTTP-only cookies are safer for browser API requests, but Socket.IO needs a token in the handshake because JavaScript cannot read HTTP-only cookies. The backend supports both cookie and bearer extraction."

Q: How are refresh tokens invalidated?

A: "The refresh token is stored on the user document. Logout removes it, and refresh only succeeds if the incoming token matches the stored one."

### Booking And Payments

Q: How do you avoid double booking?

A: "The service checks `slot.isBooked` and `slot.requestId`, creates a slot request, and marks the slot booked. In production I would make this atomic with a transaction or conditional update because concurrent requests can still race."

Q: Why verify Razorpay signature on the backend?

A: "The browser payment callback cannot be trusted. The backend recomputes HMAC using the Razorpay secret. Only if it matches do we mark the appointment paid and create a payment record."

### Real-Time Chat

Q: Why save before emitting a socket message?

A: "MongoDB is the source of truth. Saving first guarantees the message has an ID, timestamp, and can be recovered after refresh. Socket.IO is only the delivery mechanism."

Q: Why store messages embedded in `Chat`?

A: "It is simple and efficient for small consultations because fetching a chat returns the conversation context. For high scale, I would move messages to a separate collection with indexes and pagination."

### WebRTC

Q: What does Socket.IO do in video calls?

A: "It does signaling only: offer, answer, ICE candidates, call status. The actual audio/video media travels through WebRTC peer connections."

Q: Why do you need TURN in production?

A: "STUN helps peers discover public addresses, but some NATs and firewalls block direct peer-to-peer media. TURN relays media when direct connection fails."

### AI And RAG

Q: How do you prevent one patient from retrieving another patient's document?

A: "The chat ID is used as the vector namespace, and every query is checked against chat participant access. File-specific questions also filter by `file_id`."

Q: Why store chunks locally if Pinecone is used?

A: "It gives a fallback when Pinecone or embeddings fail and is useful for debugging. The local store can do lexical or vector-like retrieval depending on stored embeddings."

Q: Why use an agent graph instead of just prompting the LLM to book?

A: "The LLM only parses intent into JSON. Backend code performs the actual booking using validated services. That keeps business-critical mutations deterministic and auditable."

### Security

Q: What are the biggest security risks to fix before production?

A: "Payment endpoints should be authenticated and derive amount server-side; booking lock should be atomic; uploads should be scanned; CSRF and rate limiting should be added; and medical data should use private storage, signed URLs, encryption, and audit logs."

## 23. Known Gaps And Production-Level Improvements

These are useful to mention honestly in interviews. They show engineering judgment.

### API Consistency

- Some controllers use `ApiResponse`; others return raw JSON. Standardize response shape.
- Some frontend stores reference endpoints not implemented by the backend, for example broader schedule store endpoints and doctor appointments in `Doctordirectory.jsx`. Align or remove unused code.
- Rename `frontend/utils/axois.js` to `axios.js` for clarity.

### Security Hardening

- Add Helmet, rate limiting, request size limits per route, CSRF protection for cookie auth.
- Validate all request bodies and query params with Zod/Joi.
- Authenticate payment history and payment order/verify endpoints.
- Derive Razorpay amount from database, never frontend.
- Remove hardcoded Razorpay test fallback key from frontend.
- Add audit logs for healthcare-sensitive actions.

### Booking Reliability

- Use MongoDB transactions or atomic conditional updates for slot locking.
- Add pending slot expiration and release unpaid slots.
- Add idempotency keys for booking and payment verification.
- Add cancellation/refund workflow.

### Real-Time Scaling

- Use Redis adapter for Socket.IO across multiple instances.
- Store socket presence in Redis instead of in-memory maps.
- Add delivery acknowledgements and retry logic.

### RAG/AI Reliability

- Move RAG queue to BullMQ/Redis.
- Add vector index lifecycle management outside request path.
- Add source allowlists for web fallback.
- Add streaming answers and progress events.
- Add stronger PHI de-identification and retention policies.

### WebRTC Production

- Add TURN server.
- Add ringing timeout and missed-call state.
- Add better network quality metrics.
- Add device permission preflight UX.

### Testing

- Unit tests for auth, booking services, payment verification, RAG helper functions.
- Integration tests for route auth and booking/payment flows.
- Socket.IO tests for join/send/read.
- End-to-end tests for signup, booking, payment mock, chat, and video happy path.

## 24. Best Interview Story To Tell

"MediConnect is not just CRUD. The interesting part is how workflows connect. A booking creates the relationship that unlocks chat and video. Payment verification confirms the appointment and creates notifications. Chat supports files, and doctor-uploaded documents become RAG context for patient questions. Video calls use REST for lifecycle and Socket.IO for signaling. Across the system, MongoDB remains the source of truth while real-time events make the UI feel immediate."

Then pick one deep feature based on interviewer interest:

- For backend/system design: booking lock, payment verification, chat access control.
- For real-time: Socket.IO chat and WebRTC signaling.
- For AI: document ingestion, namespace-scoped retrieval, and reply-specific Q&A.
- For security: JWT middleware, appointment-gated access, signed file URLs, and production hardening plan.
