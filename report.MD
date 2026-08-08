# MediConnect — Software Architecture Assessment

**Assessment date:** 8 August 2026  
**Scope inspected:** all tracked application source, configuration, manifests, deployment files, documentation and comments under `frontend/`, `backend/`, `README.md`, and `WorkFlow.MD`; the checked-in server logs; and generated frontend output. Runtime secrets and user-uploaded file contents were deliberately not reproduced in this report.

## Evidence and assessment boundary

This is an implementation-led assessment. It does not infer a feature merely from a README claim. The repository contains extensive documentation—especially `WorkFlow.MD` and `backend/docs/`—and those documents accurately identify several production gaps, but they are not treated as evidence that the gaps have been fixed.

Observed validation:

- `frontend npm run build` passed: 2,407 modules transformed. The resulting primary JavaScript asset is **1,406.41 kB** (386.00 kB gzip), and Vite emitted a chunk-size warning.
- `frontend npm run lint` failed: **53 errors and 12 warnings**, mostly unused symbols plus React Hook dependency warnings.
- There are no repository test/spec files, no backend test runner (the `test` script starts `nodemon app.js`), and no CI workflow files.
- `backend/server.stderr.log` records a current startup failure: Razorpay is instantiated without `key_id`/OAuth credentials. Because Razorpay is imported at module load, this prevents the whole backend from starting when its credentials are absent.
- The working tree already has unrelated changes/untracked server logs; this report does not alter source code or those files.

## Why — purpose and problem solved

MediConnect is a healthcare-service marketplace and consultation workflow. It brings together doctor discovery, patient/doctor registration, availability, appointment requests, payment initiation, post-booking communication, video consultation, reminders, medicine lookup, local-facility lookup, and assistant features in one browser application.

The product rationale is strong: patients otherwise navigate separate discovery, scheduling, messaging, document sharing, and consultation tools; clinicians lack a single workflow spanning availability through follow-up. The implementation’s best differentiator is its *gated consultation relationship*: chat and video calls are generally allowed only when a doctor–client `SlotRequest` exists and is not rejected. Doctor-provided files can be indexed per chat session for contextual document Q&A, rather than presenting a generic chatbot alone.

It is better than a directory-only solution in breadth and continuity of care, and better than a generic chat-only solution because chat, files, notifications, and calls are linked to an appointment relationship. This advantage is conditional: the current payment and role-authorization flaws mean the booking gate cannot yet be considered a trustworthy production security boundary.

## What — delivered functionality and technology choices

### Functional inventory

| Area | Implemented behavior evidenced in source |
| --- | --- |
| Accounts | Separate `Doctor` and `Client` Mongoose models; password hashing; email/SMS OTP registration/verification; JWT access/refresh tokens; profile/avatar updates. |
| Discovery | Paginated public doctor listing and verified-doctor profile; Mongo regex filters. Client listing is also publicly exposed. |
| Scheduling | Doctors create date-based schedules with embedded slots. Clients create slot requests which immediately mark a slot booked. Doctors accept/reject requests. |
| Payments | Razorpay order creation, client-side checkout invocation, signature verification, `Payment` persistence, and payment notifications. |
| Chat and files | REST plus Socket.IO chat, read receipts, replies, timed deletion, Cloudinary attachments, optional S3/local document storage, and notification creation. |
| RAG Q&A | Doctor-only document upload; PDF/DOC/DOCX/TXT/image extraction (OCR for images); PHI-pattern masking; chunking; Hugging Face embeddings; optional Pinecone plus Mongo/local lexical retrieval; Groq/OpenAI-compatible answer generation and optional web-search fallback. |
| Video | Persisted call lifecycle/media settings with WebRTC in the browser and Socket.IO signalling. No TURN service is configured. |
| Supporting features | In-app notifications, node-cron appointment reminders, Groq-backed/in-memory dashboard assistant, LangGraph-assisted doctor/availability search, medicine search, and nearby medical-facility lookup via Overpass/OpenStreetMap. |

### Technology stack and fit

| Layer | Actual technology | Reasonable fit / limitation |
| --- | --- | --- |
| Client | React 19, Vite 6, React Router, Zustand, Axios, Socket.IO client | Fast SPA development and local feature state. Routes are all unguarded client-side, and state is split across multiple stores plus older context/socket implementations. |
| Server | Node.js ESM, Express 4, Socket.IO 4 | Good fit for REST and low-latency signaling in one process. Server composition is concentrated in `app.js`, with much business logic in controllers. |
| Data | MongoDB/Mongoose 8 | Flexible document schemas suit chat message embedding and evolving medical-document metadata. Cross-document booking/payment consistency needs transactions or atomic conditional updates. |
| Auth | bcryptjs, JWT, HTTP-only cookies; Bearer fallback | A viable base design, but tokens are also returned and persisted in `localStorage`, weakening XSS resistance. No role middleware exists. |
| Storage | Cloudinary, optional AWS S3, local fallback | Cloudinary simplifies avatars/attachments; S3 signed reads are a better production option. Local `public/uploads` is publicly served and incompatible with ephemeral multi-instance hosting. |
| AI | Groq-compatible ChatOpenAI, Hugging Face inference, LangChain/LangGraph, Pinecone optional | Provides a useful layered RAG prototype with a lexical fallback. It sends content to external providers and has no evaluation, moderation, prompt-injection defence, or clinical governance. |
| External services | Razorpay, Twilio, Gmail/Nodemailer, Overpass, DuckDuckGo/Brave/Serper | Pragmatic integrations, but all need resilient timeouts, retries, quotas, circuit breakers and provider-specific observability. |
| Deployment | Render YAML for one free backend instance; Vercel SPA rewrite | Low-friction demo deployment, explicitly limited to one instance and an ephemeral/free-plan operating model. |

Several packages are declared but not clearly used by application source (for example PayPal SDK, Google GenAI, Cheerio, CSV parser, Puppeteer, and `bcrypt` alongside `bcryptjs`). They increase installation and vulnerability surface without demonstrated feature value.

## Motive — objective, users, and stakeholder value

**Primary users:** patients/clients seeking a specialist, appointment, document explanation, or video consultation; doctors publishing availability and managing paid patient relationships.

**Stakeholder value:**

- Patients get fewer hand-offs between discovery, booking, payment, reminders, chat, and calls.
- Doctors get schedule and payment-history views, controlled patient contact, and document-led follow-up communication.
- A platform operator gets one MongoDB-backed workflow and reusable external-service integrations rather than disconnected products.

The code does **not** implement admin, clinic-operator, clinical-verification, consent-management, audit, or support roles. It also does not evidence actual analytics/insights despite README claims. Consequently, this is best described as a feature-rich prototype/MVP, not a compliant healthcare production platform.

## Architecture

### Repository structure

```text
MediConnect/
├── frontend/                 React/Vite SPA
│   ├── src/                  router/bootstrap/styles
│   ├── pages/ components/    feature UI; several large page components
│   ├── store/                Zustand auth, schedule, chat, video state
│   ├── context/ hooks/       theme and legacy chat integration
│   └── utils/                Axios client (misspelled `axois.js`)
├── backend/
│   ├── app.js                server bootstrap, CORS, Socket.IO, dashboard chat
│   ├── src/models/           Mongoose schemas
│   ├── src/routes/           HTTP route registration
│   ├── src/controllers/      request orchestration/business logic
│   ├── src/services/         booking, storage, RAG, chat, notifications
│   ├── src/jobs/             in-memory RAG queue and cron reminders
│   ├── src/middlewares/      JWT and Multer
│   └── docs/                 extensive implementation/workflow notes
├── render.yaml               single Render web service declaration
└── README.md / WorkFlow.MD   product/API/workflow documentation
```

This is a conventional UI → route → controller → Mongoose/service layout. The separation is a useful start, although controller responsibilities remain broad and validation/policy are duplicated or missing.

### Request and data flow

```text
React components / Zustand stores
     │ REST (cookies; often also JWT in localStorage)
     ▼
Express routes → isAuthenticated (where attached) → controllers → services/models
     │                                                    │
     │                                                    ├─ MongoDB collections
     │                                                    ├─ Cloudinary / S3 / local disk
     │                                                    ├─ Razorpay, email/SMS, Groq, HF, Pinecone, Overpass
     ▼                                                    │
Socket.IO rooms ◄──────────── notifications/chat/signalling ┘
     │
WebRTC peer-to-peer media (browser to browser)
```

The agent and RAG workflows add a second asynchronous path: a file is persisted and an in-process FIFO queue invokes document extraction/chunking/embedding. The queue state exists only in the Node process. Appointment reminders run in every server process via `node-cron`.

### Authentication and authorization

`isAuthenticated` accepts an `accessToken` cookie or `Authorization: Bearer` token, verifies it, then searches `Doctor` followed by `Client` and attaches `req.doctor` or `req.client`. Socket authentication similarly verifies a supplied token and joins a per-user room.

Strengths: passwords are hashed; HTTP-only cookie options are used; refresh tokens are persisted; public doctor profiles require `verified`; chat/video check an appointment relation in their principal paths.

Critical gaps:

- JWTs are returned in login responses and stored in browser `localStorage` by the auth stores. This defeats the principal security benefit of HTTP-only access tokens under XSS.
- `isAuthenticated` does not enforce the token’s declared `userType`, and there is no reusable `requireRole`/ownership policy.
- Several sensitive routes are public: `/payments/order`, `/payments/verify`, and `/payments/history`; public `/client` listing exposes patient data. `GET /schedule` and medicine/clinic searches are intentionally public but have no abuse protection.
- No CSRF protection is present despite cross-site cookie mode (`SameSite=None` in production). No rate limiter, Helmet/CSP/security headers, request schema validator, brute-force controls, account lockout, email resend control, or audit trail is implemented.

### API inventory (actual route bases)

| Base | Main endpoints | Auth observed |
| --- | --- | --- |
| `/doctor`, `/client` | register/login/OTP/refresh/me/update/list/detail | mixed; list/detail public |
| `/schedule`, `/slots` | create/fetch schedule; request/accept/reject slot | schedule create and slots authenticated, but roles/ownership incomplete |
| `/payments` | order, verify, history | **none** |
| `/chats` and `/api/chats` | create, contacts, messages, read/delete, RAG Q&A | authenticated; route mounted twice |
| `/api` | chat-file upload/list | authenticated |
| `/video-call` | lifecycle, media controls, history | authenticated and participant checks in controller |
| `/notifications`, `/agent` | notification operations; smart search | authenticated |
| `/clinics`, `/medicines`, `/chat` | facility lookup, medicine lookup, dashboard assistant | public |
| `/health` | liveness payload | public |

There are client/server inconsistencies. `Doctordirectory.jsx` calls `/doctor/appointments` endpoints which are not registered; `ChatContext.js` emits `joinRoom`/`leaveRoom` while the socket server implements `joinChat`/`leaveChat`; the client uses both `/api/chats` and `/chats` aliases. The Render YAML health check is `/`, yet only `/health` exists, so its configured health check would receive no successful handler response.

### Database relationships

| Collection | Relationships / salient design |
| --- | --- |
| `Doctor`, `Client` | separate identity collections with unique email/phone and one stored refresh token each. |
| `Schedule` | belongs to `Doctor`; embeds slots with `bookedBy` (`Client`) and `requestId`. No compound uniqueness on `(doctorId, date)`. |
| `SlotRequest` | links doctor, patient, schedule and **slot index**; carries date/time/fee/status/payment status. A slot index is fragile when slots are inserted/reordered. |
| `Payment` | links slot request, doctor, patient; transaction ID is not unique. |
| `Chat` | participants and an unbounded embedded `messages` array. Messages use dynamic ref paths for Doctor/Client and include attachments/read receipts/sources. |
| `UploadedFile`, `RagChunk` | a file belongs to chat session + doctor; chunks belong to session/file. `RagChunk` has a useful unique `(sessionId,fileId,chunkIndex)` index. |
| `VideoCall` | participant/initiator dynamic references and persisted status/media state. |
| `Notification` | polymorphic recipient/sender and optional appointment references; useful recipient/time index. |
| `Medicine` | simple schema against an existing `medicines` collection; name regex is not indexed. |

The schema declares useful chat, file, notification, RAG, and video indexes. Missing high-value indexes/constraints include schedules `(doctorId,date)` unique, slot requests by doctor/patient/status/date, payments transaction/order uniqueness, and bounded/independent chat messages.

## Scalability

### Existing strengths

- REST APIs are largely stateless apart from tokens/cookies and can be placed behind a load balancer once stateful dependencies are externalized.
- MongoDB Atlas and optional S3/Pinecone are managed-service-friendly building blocks.
- Pagination exists for doctors, clients, chat-message slices, call history, and notifications; indexes are present on several common lookups.
- The browser-to-browser WebRTC design avoids server media bandwidth for successful direct connections.

### Bottlenecks and limitations

| Area | Current constraint | Scaling consequence |
| --- | --- | --- |
| Deployment | Render is fixed at one free instance (`minInstances=maxInstances=1`) | no horizontal capacity, low cold-start/reliability headroom. |
| Socket.IO | connected users, socket IDs, call rooms, and presence are `Map`s in process | multiple instances split users/rooms; events fail without sticky sessions + Redis adapter/presence. |
| Dashboard chat | `chatHistory` object held in memory, keyed by unauthenticated caller-supplied `userId` | memory growth, data loss on restart, cross-user/history exposure risk, no multi-instance continuity. |
| RAG jobs | singleton in-memory FIFO + CPU/network heavy OCR/embedding | queue disappears on restart; one slow file blocks all later files; each instance duplicates queues. |
| Reminders | cron runs in app process | duplicate notifications when scaled; candidate scan is repeated and capped at 100 without atomic claim. |
| Chat schema | full chat document is read/populated/sliced for messages | Mongo 16 MB document ceiling and increasingly expensive reads/writes for active conversations. |
| Booking | read/check/create/save across `Schedule` and `SlotRequest`, no transaction | simultaneous requests can reserve the same slot or leave inconsistent state. |
| Search | unanchored case-insensitive regex for doctors/medicine; Overpass request retry chain | collection scans/provider pressure; input radius is uncapped. |
| WebRTC | STUN/TURN configuration is not evidenced; signaling is single-process | NAT-restricted users fail; no media QoS/control plane scalability. |

Vertical scaling can temporarily improve CPU/RAM for OCR, Vite-serving alternatives, embeddings and socket connections, but will not fix correctness or durability. Horizontal scaling requires Redis (Socket.IO adapter, presence, rate limits), durable queues/workers, shared object storage, singleton/scheduled-job coordination, and transactional booking/payment workflows.

## Optimization review by major module

| Module | Observed quality | Priority improvements |
| --- | --- | --- |
| Bootstrap/config | CORS allowlist is explicit; `/health` is sensible. Imports unused Nodemailer/transporter and `initiateCall`; static `public` exposes local uploads. Razorpay initialization crashes startup when configuration is missing. | Validate all required environment variables at boot; make optional integrations lazy/feature-flagged; use `/health` in Render; add graceful shutdown/readiness; serve private files through authorization or signed URLs. |
| Auth/account controllers | bcrypt and JWT flow are present; refresh rotation is intended. OTP uses `Math.random`, and OTP values are stored raw. `doctor.refreshAccessToken` destructures nonexistent `newRefreshToken`, so it sends/stores `undefined`. Client `getClientById` reads `clientId` while route is `:id`. | Use cryptographic OTPs hashed at rest; uniform auth service and cookie policy; do not return/store access/refresh tokens in localStorage; add CSRF/rate limits; correct refresh and route parameter defects; enforce roles. |
| Profiles/discovery | pagination exists; doctor query has indexed name/email but regex remains costly. Public client list/detail unnecessarily exposes sensitive personal data. Pagination/sort fields are user-controlled. | Make client endpoints admin-only/minimal; allowlist `sortBy`, cap/validate page and limit; use normalized search/search index; introduce clinician credential approval. |
| Scheduling/booking | clear model relationship and notification call. Slot is set `isBooked=true` when *request* is created, although status stays pending. Any authenticated user can invoke doctor-only schedule creation and accept/reject a request; no ownership checks. | Implement role/owner policy; use transaction or atomic conditional `findOneAndUpdate`; introduce immutable slot IDs and unique schedule `(doctorId,date)`; define expiration/cancellation and correct pending reservation semantics. |
| Payments | server verifies a Razorpay signature and records a payment. However, routes are unauthenticated, amount is client supplied at order creation, order/request ownership and state are not verified, no Razorpay webhook/idempotency/order persistence exists, and payment history accepts arbitrary doctor ID. | Treat as P0: authenticate/authorize client/doctor, derive fee server-side, persist order and unique provider IDs, verify webhooks, add idempotency and reconciliation, use transaction/outbox for booking/payment/notification. |
| Chat/realtime | appointment-gated chat, reply snapshots, read receipts, and events are well-featured. `getUserChats` does N+1 appointment queries; embedded messages scale poorly. HTTP query endpoint does not repeat appointment-gate check (only participant check). Multiple overlapping socket/HTTP event names exist. | Extract messages to collection with cursor pagination; query relations in bulk; centralize authorization including RAG Q&A; Redis adapter; event contract/versioning; remove obsolete `ChatContext`. |
| File storage/RAG | file extension/MIME allowlist for chat docs, per-session metadata, chunk uniqueness, lexical fallback, and PHI masking attempt are thoughtful prototype choices. Cloudinary raw download URLs are generated, but local fallback is publicly static. Masking is regex-based and incomplete; doctor content can go to external embedding/LLM/web providers; queue is non-durable; OCR worker starts per image; no malware scan, retention, consent, audit, or deletion lifecycle. | Private object store + scoped signed URLs; durable queue/worker with retries/dead letter; content scanning; data classification/consent; robust DLP/de-identification; model evaluation/citations/guardrails; cache embeddings; isolate OCR worker. |
| Video/WebRTC | persisted call records, participant checks, media state and signaling are comprehensive. Socket `call-answer`, ICE, media room events do not consistently re-check that targets/rooms are valid participants; no TURN is configured. | Authorize every signaling event against call/room, use TURN/STUN credentials, enforce call state machine, set call timeouts, add QoS telemetry and E2E test matrix. |
| Notifications/reminders | notification model/index and socket delivery are sensible. Cron lacks distributed lock/atomic claim; notifications are emitted inline, so external or DB failure can affect main user action. | Transactional outbox + worker; scheduler singleton/lease; retries/deduplication; push/email channels; observability. |
| Agent/dashboard assistant | agent route is authenticated and maps prompts to doctor/schedule discovery. Dashboard `/chat` is unauthenticated and uses caller-controlled in-memory histories. | Persist scoped histories; authenticate and rate-limit; strict tool schemas/allowlists; prompt-injection tests; improve medical escalation policy and telemetry. |
| Frontend | production build passes; React/Zustand and feature coverage are strong. One monolithic bundle, 53 lint errors, hook warnings, unguarded routes, duplicated sockets, raw fetch/axios variation, and large components reduce maintainability/reliability. | Fix lint first; route-level guards; feature lazy loading and component splitting; one API client/socket lifecycle; typed contracts; error boundaries, loading/accessibility tests, virtualized chat lists. |

## Challenges, current solutions, better alternatives, and trade-offs

| Engineering challenge | Current solution | Better production alternative / trade-off |
| --- | --- | --- |
| Preventing non-patients from contacting a clinician | Checks `SlotRequest` status/payment fields before chat/video in most paths | Single policy service with immutable appointment entitlement. More code, but one auditable rule and no drift between HTTP/socket paths. |
| Concurrent booking | Mutable embedded slot plus slot request | Mongo transaction or atomic update with an availability predicate. Requires replica-set transactions and more disciplined state transitions, but avoids double booking. |
| Responsive real-time interactions | Socket.IO maps and rooms in one process | Redis adapter, presence storage and sticky load balancing. Adds infrastructure but enables horizontal scale. |
| Patient document Q&A | In-process RAG queue, optional Pinecone, Mongo lexical fallback, regex PHI masking | Durable jobs + private object storage + governed data pipeline. Higher cost/latency, essential for durability/privacy. |
| WebRTC connectivity | Browser RTCPeerConnection with signaling | TURN infrastructure and ephemeral credentials. It adds bandwidth cost but supports restrictive NATs and improves completion rate. |
| Low-cost deployment | Render free single instance and Vercel static SPA | Managed container/cluster, secret manager, managed Redis, object storage, monitoring. More operational cost for availability and compliance. |
| External medical references | General web result snippets as fallback | Curated medical corpus with source quality policy, date/version metadata, retrieval evaluation and clinician review. Less broad, substantially safer. |

## Strengths and weaknesses

### Best engineering decisions

- The appointment-linked relationship is reused across chat, document sharing, and calls rather than trusting client-side UI state.
- Data models contain meaningful references and several practical indexes; RAG chunks have a useful uniqueness guarantee.
- CORS normalization and environment-driven origins are better than a permissive wildcard.
- RAG has layered degradation: Pinecone is optional, embeddings can fall back to lexical retrieval, and the assistant has a safe fallback answer.
- File handling considers type allowlists and Cloudinary/S3 alternatives.
- Documentation is unusually thorough for an MVP and openly records many known production concerns.

### Technical debt and design flaws

- P0 security/correctness: payment endpoints are unauthenticated and client-trusting; schedule/slot roles and ownership are incomplete; patient data is public; no CSRF/rate limiting/security headers.
- P0 operability: a missing Razorpay key aborts backend startup; configured Render health path is wrong.
- P1 reliability: booking/payment lacks transactions/idempotency/webhooks; cron and queues are process-local; chat document grows unbounded.
- P1 maintainability: controllers and UI components are very large, API/socket styles are duplicated, and dead/obsolete code paths are visible.
- P1 client quality: lint does not pass, React Hook dependency issues are unresolved, and no automated tests exist.
- Security hygiene: `frontend/.env.production` is tracked despite environment ignore patterns; the backend production example contains a credential-looking Atlas connection string. Treat it as exposed, rotate it if real, remove it from history, and use a secret manager. The report intentionally does not repeat credentials.

## Future improvements — production roadmap

### Phase 0: stop unsafe/broken operation

1. Rotate any repository-exposed credentials; remove tracked environment configuration/secrets and enforce secret scanning.
2. Fix backend config validation and Razorpay lazy/configured startup; point Render health checks to `/health`.
3. Require authentication and ownership on payments; calculate fee from the server-side slot request; restrict payment history to the authenticated doctor.
4. Add `requireDoctor`, `requireClient`, and resource-owner policy middleware; protect schedules, acceptance/rejection, profile data, and every websocket signaling path.
5. Fix token refresh defects, remove localStorage JWT persistence, use CSRF protection and secure cookie/domain settings.

### Phase 1: correctness, testing, and security baseline

1. Use MongoDB transactions/atomic reservation and stable slot IDs. Add payment-order persistence, webhook verification, unique transaction/order constraints, idempotency keys, and reconciliation.
2. Add Zod/Joi request validation, size/radius/page caps, rate limiting (Redis-backed), Helmet/CSP, structured errors, audit logs, and malware scanning.
3. Add unit tests for policy/state transitions, integration tests for each API and webhook, Socket.IO authorization tests, and Playwright/Cypress booking/chat/video smoke tests.
4. Make lint a required gate; fix all 53 errors/12 warnings; add formatting/pre-commit hooks and dependency audits.
5. Split chat messages into a separate collection; add cursor pagination and required indexes.

### Phase 2: scale and operationalize

1. Replace in-memory queue with BullMQ/Redis or managed queue plus worker processes; make scheduler singleton/lease-based and use outbox events.
2. Add Redis Socket.IO adapter/presence, shared object storage only, multi-instance backend, autoscaling, readiness/liveness checks, and TURN service.
3. Introduce CI/CD: tests, lint, build, dependency/secret/SAST scans, migrations/index checks, preview deployments, immutable artifacts, and separate staging/production environments.
4. Add OpenTelemetry tracing, JSON logs with correlation IDs, metrics (latency, job depth, booking conflicts, payment reconciliation, call success), error tracking, dashboards, and alerting.

### Phase 3: healthcare-grade AI and product maturity

1. Establish consent, retention/deletion, access/audit, encryption, data residency, threat modeling, and jurisdiction-specific compliance review before handling real PHI.
2. Replace general web fallback with vetted sources; perform retrieval/answer safety evaluation; add prompt-injection defenses, citations, confidence/abstention policy, and clinician escalation/review.
3. Add clinician verification, admin/support workflows, cancellation/refunds, appointment lifecycle, calendar/timezone handling, accessibility review, localization, and patient communication preferences.
4. Apply route-level lazy loading and bundle analysis; target a materially smaller initial payload.

## ExecutiveSummary

MediConnect demonstrates a broad, coherent healthcare workflow prototype: it combines doctor discovery, appointment scheduling, payments, gated chat, document Q&A, realtime notifications, WebRTC calls, facility search, and assistant capabilities in a single React/Express/MongoDB codebase. The strongest business outcome is reducing patient/doctor workflow fragmentation. The strongest technical outcome is the reuse of appointment relationships and session-scoped document context across multiple channels.

It is not production-ready today. The server currently fails without Razorpay configuration, payment and appointment authorization are unsafe, the deployment is single-instance and stateful, quality gates fail, and no automated test suite or CI pipeline is implemented. Documentation is comprehensive, but it often describes recommended future safeguards rather than code that exists.

| Dimension | Rating | Rationale |
| --- | ---: | --- |
| Architecture | 6/10 | Sensible layered starting point and rich domain coverage; policy logic, route contracts, and state boundaries are inconsistent. |
| Scalability | 3/10 | Managed Mongo/S3/Pinecone options help, but one instance, in-memory queue/presence/history, embedded chat growth, and cron design block safe horizontal scaling. |
| Security | 2/10 | Password hashing/JWT/CORS/appointment checks exist, but critical payment/authorization/data-exposure gaps and lack of baseline protections dominate. |
| Performance | 4/10 | Pagination/indexes/fallbacks are useful; large bundle, N+1 chat authorization, regex search, unbounded documents, and in-process OCR/RAG constrain performance. |
| Maintainability | 4/10 | Good documentation and service separation are offset by failing lint, no tests/CI, duplicated flows, oversized modules, and confirmed endpoint mismatches. |

**Overall:** a promising, feature-rich MVP with meaningful architectural foundations. Address Phase 0 and Phase 1 before accepting real payments or health data; complete Phase 2 and healthcare governance work before claiming production readiness.
