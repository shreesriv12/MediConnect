import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { createWorker } from "tesseract.js";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import RagChunk from "../models/ragChunk.model.js";
import { searchWeb } from "./webSearch.service.js";

export const RAG_FALLBACK_ANSWER =
  "I don't have enough information from the documents shared by your doctor to answer this.";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;
const EMBEDDING_MODEL =
  process.env.HUGGINGFACE_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
const CHAT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_BASE_URL =
  process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const HUGGINGFACE_EMBEDDING_URL =
  process.env.HUGGINGFACE_EMBEDDING_URL ||
  `https://api-inference.huggingface.co/pipeline/feature-extraction/${EMBEDDING_MODEL}`;
const PINECONE_INDEX = process.env.PINECONE_INDEX || "medical-chat";
const PINECONE_DIMENSION = Number(process.env.PINECONE_DIMENSION) || 384;
const SPLIT_SEPARATORS = ["\n\n", "\n", ".", " ", ""];
const WEB_REFERENCE_PATTERN =
  /\b(what is|symptoms?|side effects?|treatment|guidelines?|latest|current|normal|range|high|low|elevated|meaning|mean|interpret|classification|reference|medicine|medication|causes?)\b/i;

let pineconeIndexPromise;

export const isRagConfigured = () =>
  Boolean(process.env.GROQ_API_KEY);

const isPineconeConfigured = () => Boolean(process.env.PINECONE_API_KEY);

const normalizeMetadata = (metadata) =>
  Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, String(value ?? "")])
  );

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isNumberArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "number");

const averageVectors = (vectors) => {
  if (!vectors.length) return [];

  const totals = vectors.reduce(
    (acc, vector) => vector.map((value, index) => value + (acc[index] || 0)),
    []
  );

  return totals.map((value) => value / vectors.length);
};

const normalizeVector = (vector) => {
  const magnitude = Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
};

const coerceEmbeddingVector = (value) => {
  if (isNumberArray(value)) return value;

  if (Array.isArray(value) && value.length === 1) {
    return coerceEmbeddingVector(value[0]);
  }

  if (Array.isArray(value) && value.every(isNumberArray)) {
    return averageVectors(value);
  }

  throw new Error("Unexpected Hugging Face embedding response shape");
};

const parseEmbeddingResponse = (data, expectedCount) => {
  const rawEmbeddings = data?.embeddings || data;

  if (expectedCount === 1) {
    return [normalizeVector(coerceEmbeddingVector(rawEmbeddings))];
  }

  if (Array.isArray(rawEmbeddings) && rawEmbeddings.length === expectedCount) {
    return rawEmbeddings.map((item) => normalizeVector(coerceEmbeddingVector(item)));
  }

  throw new Error("Hugging Face did not return one embedding per input");
};

class HuggingFaceFeatureExtractionEmbeddings {
  constructor({
    apiKey,
    endpoint,
    batchSize = 8,
    maxRetries = 3,
  }) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.batchSize = batchSize;
    this.maxRetries = maxRetries;
  }

  async embedDocuments(texts) {
    const vectors = [];

    for (let index = 0; index < texts.length; index += this.batchSize) {
      const batch = texts.slice(index, index + this.batchSize);
      vectors.push(...(await this.embedBatch(batch)));
    }

    return vectors;
  }

  async embedQuery(text) {
    const [vector] = await this.embedDocuments([text]);
    return vector;
  }

  async embedBatch(texts) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const headers = {
          "Content-Type": "application/json",
        };

        if (this.apiKey) {
          headers.Authorization = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(this.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: texts.length === 1 ? texts[0] : texts,
            options: {
              wait_for_model: true,
            },
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || `Hugging Face embedding request failed: ${response.status}`);
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        return parseEmbeddingResponse(data, texts.length);
      } catch (error) {
        lastError = error;
        console.error("[RAG] Hugging Face embedding attempt failed:", {
          attempt,
          message: error.message,
        });

        if (attempt < this.maxRetries) {
          await sleep(500 * attempt);
        }
      }
    }

    throw lastError;
  }
}

const getEmbeddings = () =>
  new HuggingFaceFeatureExtractionEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_TOKEN,
    endpoint: HUGGINGFACE_EMBEDDING_URL,
    batchSize: Number(process.env.HUGGINGFACE_EMBEDDING_BATCH_SIZE) || 8,
    maxRetries: 3,
  });

const getChatModel = () =>
  new ChatOpenAI({
    apiKey: process.env.GROQ_API_KEY,
    model: CHAT_MODEL,
    temperature: 0,
    maxTokens: Number(process.env.GROQ_MAX_TOKENS) || 800,
    maxRetries: 3,
    configuration: {
      baseURL: GROQ_BASE_URL,
    },
  });

const getPineconeIndex = async () => {
  if (!pineconeIndexPromise) {
    pineconeIndexPromise = (async () => {
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      if (process.env.PINECONE_CREATE_INDEX === "true") {
        const existing = await pinecone.listIndexes();
        const indexExists = existing.indexes?.some((index) => index.name === PINECONE_INDEX);

        if (!indexExists) {
          await pinecone.createIndex({
            name: PINECONE_INDEX,
            dimension: PINECONE_DIMENSION,
            metric: "cosine",
            spec: {
              serverless: {
                cloud: process.env.PINECONE_CLOUD || "aws",
                region: process.env.PINECONE_REGION || "us-east-1",
              },
            },
            waitUntilReady: true,
          });
        }
      }

      return pinecone.index(PINECONE_INDEX);
    })();
  }

  return pineconeIndexPromise;
};

const getVectorStore = async (namespace) => {
  const pineconeIndex = await getPineconeIndex();
  return PineconeStore.fromExistingIndex(getEmbeddings(), {
    pineconeIndex,
    namespace,
    textKey: "text",
  });
};

const cosineSimilarity = (a, b) => {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    aMagnitude += a[index] * a[index];
    bMagnitude += b[index] * b[index];
  }

  const denominator = Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude);
  return denominator ? dot / denominator : 0;
};

const tokenize = (text) =>
  new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );

const lexicalScore = (query, text) => {
  const queryTokens = tokenize(query);
  if (!queryTokens.size) return 0;

  const textTokens = tokenize(text);
  let matches = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) matches += 1;
  }

  return matches / queryTokens.size;
};

const isFileListQuestion = (question) => {
  const value = String(question || "").toLowerCase();
  return (
    /\b(uploaded|shared|available|attached)\b/.test(value) &&
    /\b(document|documents|file|files|pdf|report|reports)\b/.test(value)
  );
};

const storeChunksLocally = async (documents) => {
  let vectors = [];
  try {
    const embeddings = getEmbeddings();
    vectors = await embeddings.embedDocuments(
      documents.map((document) => document.pageContent)
    );
  } catch (error) {
    console.error("[RAG] Hugging Face embedding failed; storing text chunks for lexical retrieval:", error.message);
    vectors = documents.map(() => []);
  }

  const sessionId = documents[0].metadata.session_id;
  const fileId = documents[0].metadata.file_id;
  const fileName = documents[0].metadata.file_name;

  await RagChunk.deleteMany({ sessionId, fileId });

  await RagChunk.insertMany(
    documents.map((document, index) => ({
      sessionId,
      fileId,
      fileName,
      chunkIndex: Number(document.metadata.chunk_index ?? index),
      text: document.pageContent,
      embedding: vectors[index] || [],
      metadata: document.metadata,
    })),
    { ordered: false }
  );

  return {
    chunkCount: documents.length,
    sessionId,
    fileId,
  };
};

const retrieveLocalDocuments = async ({ sessionId, question, fileId = null, k = 5 }) => {
  const filter = { sessionId };
  if (fileId) filter.fileId = String(fileId);

  const chunks = await RagChunk.find(filter).lean();
  if (!chunks.length) return [];

  if (isFileListQuestion(question)) {
    const byFile = new Map();
    for (const chunk of chunks) {
      if (!byFile.has(chunk.fileId)) {
        byFile.set(chunk.fileId, chunk);
      }
    }

    return Array.from(byFile.values())
      .slice(0, k)
      .map(
        (chunk) =>
          new Document({
            pageContent: chunk.text,
            metadata: chunk.metadata || {
              file_name: chunk.fileName,
              file_id: chunk.fileId,
              session_id: sessionId,
            },
          })
      );
  }

  let queryVector = null;
  try {
    queryVector = await getEmbeddings().embedQuery(question);
  } catch (error) {
    console.error("[RAG] Query embedding failed; falling back to lexical retrieval:", error.message);
  }

  return chunks
    .map((chunk) => ({
      chunk,
      score: queryVector?.length && chunk.embedding?.length
        ? cosineSimilarity(queryVector, chunk.embedding)
        : Math.max(
            lexicalScore(question, chunk.text),
            lexicalScore(question, `${chunk.fileName} ${chunk.metadata?.file_name || ""}`)
          ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter((item) => item.score > 0)
    .map(
      ({ chunk }) =>
        new Document({
          pageContent: chunk.text,
          metadata: chunk.metadata || {
            file_name: chunk.fileName,
            file_id: chunk.fileId,
            session_id: sessionId,
          },
        })
    );
};

const maskPHI = (text) => {
  let masked = String(text || "");

  const maskPatterns = [
    { regex: /(Patient\s*Name|Name):\s*[^\r\n]+/gi, replacement: (match) => match.split(":")[0] + ": [MASKED]" },
    { regex: /(Address|Residential Address|Permanent Address):\s*[^\r\n]+/gi, replacement: (match) => match.split(":")[0] + ": [MASKED]" },
    { regex: /(City|State|District|Taluka|Village):\s*[^\r\n]+/gi, replacement: (match) => match.split(":")[0] + ": [MASKED]" },
    { regex: /(PIN|Postal Code|Zip Code):\s*[^\r\n]+/gi, replacement: (match) => match.split(":")[0] + ": [MASKED]" },
    { regex: /(Aadhaar|Aadhar|UID|PAN|MRN|UHID|Patient ID|Hospital ID):\s*[^\r\n]+/gi, replacement: (match) => match.split(":")[0] + ": [MASKED]" },
    { regex: /\d{12}/g, replacement: "[MASKED]" },
    { regex: /[A-Z]{5}\d{4}[A-Z]/g, replacement: "[MASKED]" },
    { regex: /\d{3}[-.]?\d{3}[-.]?\d{4}/g, replacement: "[MASKED]" },
    { regex: /[\w.-]+@[\w.-]+\.\w+/g, replacement: "[MASKED]" },
    { regex: /(Phone|Mobile|Contact No|Contact Number):\s*[^\r\n]+/gi, replacement: (match) => match.split(":")[0] + ": [MASKED]" },
    { regex: /(Doctor|Consultant)\s*Name:\s*[^\r\n]+/gi, replacement: (match) => match.split(":")[0] + ": [MASKED]" }
  ];

  for (const { regex, replacement } of maskPatterns) {
    masked = masked.replace(regex, replacement);
  }

  return masked;
};

const cleanText = (text) =>
  String(text || "")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const fixedWidthSplit = (text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) => {
  const chunks = [];
  const step = Math.max(1, chunkSize - overlap);

  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + chunkSize).trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
};

const recursiveSplit = (text, separators = SPLIT_SEPARATORS, chunkSize = CHUNK_SIZE) => {
  const value = cleanText(text);
  if (!value) return [];
  if (value.length <= chunkSize) return [value];

  const [separator, ...remainingSeparators] = separators;
  if (separator === undefined || separator === "") {
    return fixedWidthSplit(value, chunkSize, CHUNK_OVERLAP);
  }

  const rawPieces = value.split(separator);
  if (rawPieces.length === 1) {
    return recursiveSplit(value, remainingSeparators, chunkSize);
  }

  const pieces = rawPieces.map((piece, index) =>
    index < rawPieces.length - 1 ? `${piece}${separator}` : piece
  );

  const chunks = [];
  let current = "";

  const flushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = trimmed.slice(-CHUNK_OVERLAP);
  };

  for (const piece of pieces) {
    if (!piece.trim()) continue;

    if (piece.length > chunkSize) {
      if (current.trim()) {
        flushCurrent();
        current = "";
      }
      chunks.push(...recursiveSplit(piece, remainingSeparators, chunkSize));
      continue;
    }

    if ((current + piece).length > chunkSize) {
      flushCurrent();
    }

    if ((current + piece).length > chunkSize) {
      chunks.push(piece.trim());
      current = piece.slice(-CHUNK_OVERLAP);
    } else {
      current += piece;
    }
  }

  if (current.trim() && current.trim().length > CHUNK_OVERLAP) {
    chunks.push(current.trim());
  }

  return chunks;
};

const readPdf = async (filePath) => {
  const parser = new PDFParse({
    data: await fs.promises.readFile(filePath),
  });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
};

const readDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
};

const readDoc = async (filePath) => {
  const extractor = new WordExtractor();
  const extracted = await extractor.extract(filePath);
  return extracted.getBody();
};

const readImageWithOcr = async (filePath) => {
  const worker = await createWorker("eng");
  try {
    console.log("[RAG] Running OCR:", filePath);
    const result = await worker.recognize(filePath);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
};

export const loadDocument = async ({ uploadedFile, sourcePath }) => {
  const filePath = sourcePath || uploadedFile.localPath;
  if (!filePath) {
    throw new Error("No local readable file path is available for ingestion");
  }

  const extension = path.extname(uploadedFile.fileName).toLowerCase();
  const baseMetadata = normalizeMetadata({
    session_id: uploadedFile.sessionId,
    doctor_id: uploadedFile.doctorId,
    file_name: uploadedFile.fileName,
    file_id: uploadedFile.fileId,
  });

  console.log("[RAG] Loading document:", uploadedFile.fileName);

  let text = "";
  if (extension === ".pdf") {
    text = await readPdf(filePath);
  } else if (extension === ".docx") {
    text = await readDocx(filePath);
  } else if (extension === ".doc") {
    text = await readDoc(filePath);
  } else if (extension === ".txt") {
    text = await fs.promises.readFile(filePath, "utf8");
  } else if ([".png", ".jpg", ".jpeg"].includes(extension)) {
    text = await readImageWithOcr(filePath);
  } else {
    throw new Error(`Unsupported document extension: ${extension}`);
  }

  const deidentifiedText = maskPHI(text);
  const cleanedText = cleanText(deidentifiedText);
  if (!cleanedText) {
    throw new Error("No readable text was extracted from the uploaded file");
  }

  return [
    new Document({
      pageContent: cleanedText,
      metadata: baseMetadata,
    }),
  ];
};

export const chunkDocuments = async (documents) => {
  const chunks = documents.flatMap((document) =>
    recursiveSplit(document.pageContent).map(
      (pageContent, index) =>
        new Document({
          pageContent,
          metadata: {
            ...document.metadata,
            chunk_index: String(index),
          },
        })
    )
  );

  console.log("[RAG] Chunk generation completed:", chunks.length);
  return chunks;
};

export const embedAndStore = async (documents) => {
  if (!documents.length) {
    throw new Error("No chunks were generated for ingestion");
  }

  const sessionId = documents[0].metadata.session_id;
  const fileId = documents[0].metadata.file_id;

  console.log("[RAG] Embedding and upserting chunks:", {
    sessionId,
    fileId,
    count: documents.length,
    store: isPineconeConfigured() ? "pinecone" : "mongodb",
  });

  if (isPineconeConfigured()) {
    const vectorStore = await getVectorStore(sessionId);
    const ids = documents.map((document, index) => `${fileId}-${index}`);

    await vectorStore.addDocuments(documents, {
      ids,
      namespace: sessionId,
    });
  }

  await storeChunksLocally(documents);

  return {
    chunkCount: documents.length,
    sessionId,
    fileId,
  };
};

export const ingestionPipeline = RunnableSequence.from([
  RunnableLambda.from(loadDocument),
  RunnableLambda.from(chunkDocuments),
  RunnableLambda.from(embedAndStore),
]);

export const ingestUploadedFile = async ({ uploadedFile, sourcePath }) => {
  return ingestionPipeline.invoke({ uploadedFile, sourcePath });
};

const SYSTEM_PROMPT = `You are a helpful medical assistant inside a doctor-patient chat.

Use only the provided context. Do not use hidden knowledge.

Priority:
1. Prefer doctor-provided document or replied-message context.
2. Use web reference context only when doctor-provided context is missing, insufficient, or needs general reference interpretation.

When answering from doctor-provided context, say "According to..." and name the document when available.

When answering from web context because doctor documents do not contain the answer, clearly say:
"The uploaded documents do not contain this information."

When both document and web context are provided, separate the patient-specific document fact from the general web reference.

If neither document nor web context contains the answer, respond exactly:

"${RAG_FALLBACK_ANSWER}"

Provide concise, accurate, evidence-based answers.`;

const formatDocumentContext = (documents) =>
  documents
    .map((document, index) => {
      const fileName = document.metadata?.file_name || "Unknown document";
      return `Doctor Source ${index + 1}: ${fileName}\n${document.pageContent}`;
    })
    .join("\n\n");

const formatWebContext = (documents) =>
  documents
    .map((document, index) => {
      const title = document.metadata?.title || document.metadata?.source_name || "Web source";
      const url = document.metadata?.url || "";
      return `Web Source ${index + 1}: ${title}${url ? ` (${url})` : ""}\n${document.pageContent}`;
    })
    .join("\n\n");

const formatHybridContext = ({ documents, webDocuments }) => {
  const sections = [];

  if (documents.length) {
    sections.push(`Doctor-provided context:\n${formatDocumentContext(documents)}`);
  }

  if (webDocuments.length) {
    sections.push(`Web reference context:\n${formatWebContext(webDocuments)}`);
  }

  return sections.join("\n\n");
};

const buildPineconeMetadataFilter = (fileId) =>
  fileId ? { file_id: String(fileId) } : undefined;

const emptySources = () => ({
  documents: [],
  web: [],
});

const isFallbackAnswer = (answer) => {
  const normalizedAnswer = cleanText(answer).toLowerCase();
  const normalizedFallback = RAG_FALLBACK_ANSWER.toLowerCase();
  return (
    normalizedAnswer === normalizedFallback ||
    normalizedAnswer.includes(normalizedFallback)
  );
};

const shouldUseWebReference = ({ question, documents, answer, fileId }) =>
  !fileId &&
  documents.length > 0 &&
  !isFallbackAnswer(answer) &&
  WEB_REFERENCE_PATTERN.test(question);

const webResultsToDocuments = (results) =>
  results.map(
    (result, index) =>
      new Document({
        pageContent: result.snippet || result.title || result.url,
        metadata: {
          source_type: "web",
          title: result.title || result.sourceName || `Web source ${index + 1}`,
          url: result.url || "",
          source_name: result.sourceName || result.url || `Web source ${index + 1}`,
        },
      })
  );

const buildSources = ({ documents, webDocuments }) => ({
  documents: [
    ...new Set(
      documents
        .map((document) => document.metadata?.file_name)
        .filter(Boolean)
    ),
  ],
  web: webDocuments
    .map((document) => ({
      title: document.metadata?.title || document.metadata?.source_name || "Web source",
      url: document.metadata?.url || "",
      sourceName: document.metadata?.source_name || document.metadata?.url || "Web source",
    }))
    .filter((source, index, sources) => {
      const key = source.url || source.title;
      return key && sources.findIndex((item) => (item.url || item.title) === key) === index;
    }),
});

const answerWithContext = async ({ question, documents, webDocuments }) => {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      "Context:\n{context}\n\nQuestion:\n{question}",
    ],
  ]);

  const ragChain = RunnableSequence.from([
    prompt,
    getChatModel(),
    new StringOutputParser(),
  ]);

  return cleanText(
    await ragChain.invoke({
      context: formatHybridContext({ documents, webDocuments }),
      question,
    })
  );
};

export const answerQuestionForSession = async ({
  sessionId,
  question,
  fileId = null,
  directContext = null,
}) => {
  if (!isRagConfigured()) {
    return {
      answer: RAG_FALLBACK_ANSWER,
      sources: emptySources(),
    };
  }

  console.log("[RAG] Retrieval request:", { sessionId, question, fileId });

  let retrievedDocuments = [];
  if (directContext?.content) {
    retrievedDocuments = [
      new Document({
        pageContent: directContext.content,
        metadata: {
          session_id: sessionId.toString(),
          file_id: directContext.messageId || "reply-message",
          file_name: directContext.sourceName || "Doctor's Message",
        },
      }),
    ];
  } else if (isPineconeConfigured()) {
    const vectorStore = await getVectorStore(sessionId.toString());
    retrievedDocuments = await vectorStore.similaritySearch(
      question,
      5,
      buildPineconeMetadataFilter(fileId)
    );
  } else {
    retrievedDocuments = await retrieveLocalDocuments({
      sessionId: sessionId.toString(),
      question,
      fileId,
      k: 5,
    });
  }

  const documents = (retrievedDocuments || []).filter((document) =>
    document.pageContent?.trim()
  );
  console.log("[RAG] Retrieved chunk count:", {
    sessionId,
    fileId,
    count: documents.length,
  });

  let webDocuments = [];
  let answer = "";

  if (documents.length) {
    answer = await answerWithContext({
      question,
      documents,
      webDocuments,
    });
  }

  const needsWebFallback = !documents.length || !answer || isFallbackAnswer(answer);
  const needsWebReference = shouldUseWebReference({
    question,
    documents,
    answer,
    fileId,
  });

  if (needsWebFallback || needsWebReference) {
    const webResults = await searchWeb({
      query: question,
      limit: Number(process.env.WEB_SEARCH_RESULT_LIMIT) || 4,
    });
    webDocuments = webResultsToDocuments(webResults);

    if (webDocuments.length) {
      answer = await answerWithContext({
        question,
        documents: needsWebFallback ? [] : documents,
        webDocuments,
      });
    }
  }

  const finalAnswer = cleanText(answer) || RAG_FALLBACK_ANSWER;
  const sources = buildSources({
    documents: isFallbackAnswer(finalAnswer) && webDocuments.length ? [] : documents,
    webDocuments,
  });

  console.log("[RAG] LLM response generated:", {
    sessionId,
    documentSources: sources.documents,
    webSourceCount: sources.web.length,
  });

  return {
    answer: finalAnswer,
    sources,
  };
};
