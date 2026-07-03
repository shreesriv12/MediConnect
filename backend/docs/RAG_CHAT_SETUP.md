# Real-Time Chat Document Q&A

## Architecture

- Existing `Chat` sessions are used as RAG sessions; `sessionId` is the chat `_id`.
- `POST /api/upload` accepts doctor uploads, validates file type/size, stores the file in S3 when configured or `backend/public/uploads/chat` otherwise, saves `UploadedFile` metadata, broadcasts `file:receive`, writes a file/image message, and enqueues async ingestion.
- The ingestion worker loads the uploaded file, OCRs images with Tesseract, chunks text into 500-character chunks with 80-character overlap, embeds with Hugging Face feature extraction, and stores vectors in Pinecone index `medical-chat` using namespace `sessionId`.
- Patient Q&A uses `query:ask` over Socket.IO or `POST /chats/:chatId/query`; retrieval is limited to the current Pinecone namespace, then Groq answers using doctor context first and web references only when needed.
- AI answers are stored as normal chat messages. Uploaded files are normal file/image message bubbles, with no separate documents panel or knowledge base UI.

## Environment

Required for RAG:

```env
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
GROQ_MAX_TOKENS=800
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
PINECONE_API_KEY=...
PINECONE_INDEX=medical-chat
PINECONE_DIMENSION=384
WEB_SEARCH_ENABLED=true
```

`HUGGINGFACE_API_KEY` is optional when using public/rate-limited Hugging Face inference, but setting it is recommended. The code also accepts the existing `HUGGING_FACE_TOKEN`.

Optional:

```env
PINECONE_CREATE_INDEX=true
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
HUGGINGFACE_EMBEDDING_BATCH_SIZE=8
WEB_SEARCH_RESULT_LIMIT=4
WEB_SEARCH_TIMEOUT_MS=8000
BRAVE_SEARCH_API_KEY=...
SERPER_API_KEY=...
CHAT_UPLOAD_MAX_SIZE_BYTES=10485760
BACKEND_PUBLIC_URL=http://localhost:5000
AWS_REGION=us-east-1
AWS_S3_BUCKET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SIGNED_URL_EXPIRES_SECONDS=3600
```

When S3 variables are missing, uploads use local storage.

## Testing

1. Start backend and frontend.
2. Log in as a doctor and patient who share a chat.
3. In the doctor chat, upload a PDF, DOCX, DOC, TXT, PNG, JPG, or JPEG.
4. Confirm the patient sees the file immediately.
5. Wait for the file status to become `indexed`.
6. In the patient chat Q&A box, ask a question whose answer exists in the document.
7. Confirm the answer includes source document names and does not use documents from other chats.

## Reply-Specific Q&A

- Every chat message can store a `replyTo` preview with the original `messageId`, content, message type, and file metadata.
- When a patient replies to a doctor-uploaded file or image and asks a question, `replyTo.fileId` is sent with `query:ask`.
- Retrieval stays in the current chat namespace and filters chunks by `file_id`, so only that replied document is searched.
- If no replied file is supplied, the normal session-wide document search is used.
- If the patient uses the document Q&A box while replying to a doctor's text message, the replied text is used as the only context.

## Hybrid Web Fallback

- Retrieval always checks replied doctor content first, then all doctor-uploaded content in the chat.
- If doctor content has no relevant answer, the backend searches the web and asks Groq to answer from those web snippets.
- If doctor content has a patient-specific fact but the question needs general interpretation, web snippets can be added as reference context.
- Sources are returned as `{ documents: [], web: [] }` and rendered inside the AI chat bubble.
- Set `WEB_SEARCH_ENABLED=false` to disable web fallback.

## Production Notes

- Use S3 for private file storage and keep local storage for development only.
- Set `PINECONE_CREATE_INDEX=false` after provisioning the index.
- Move `src/jobs/ragQueue.js` to BullMQ/Redis before running multiple backend instances.
- Rotate any exposed development secrets before deploying.
