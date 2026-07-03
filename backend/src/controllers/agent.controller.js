import OpenAI from "openai";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import Doctor from "../models/doctor.models.js";
import Schedule from "../models/schedule.model.js";
import razorpay from "../utils/razorpay.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { createAndLockSlotRequest, isSlotAvailable } from "../services/slotBooking.service.js";
import { notifyDoctorSlotBooked } from "../services/notification.service.js";

const AGENT_MODEL =
  process.env.AGENT_LLM_MODEL ||
  process.env.OPENROUTER_MODEL ||
  process.env.GROQ_MODEL ||
  "llama-3.1-8b-instant";

const AGENT_API_KEY =
  process.env.AGENT_LLM_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  process.env.GROQ_API_KEY;

const AGENT_BASE_URL =
  process.env.AGENT_LLM_BASE_URL ||
  (process.env.OPENROUTER_API_KEY
    ? "https://openrouter.ai/api/v1"
    : process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1");

const agentClient = AGENT_API_KEY
  ? new OpenAI({
      apiKey: AGENT_API_KEY,
      baseURL: AGENT_BASE_URL,
      maxRetries: 0,
      defaultHeaders: {
        ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}),
      },
    })
  : null;

const symptomSpecializations = {
  diarrhea: ["Gastroenterologist", "General Physician", "Internal Medicine"],
  "loose motions": ["Gastroenterologist", "General Physician", "Internal Medicine"],
  vomiting: ["Gastroenterologist", "General Physician"],
  vomit: ["Gastroenterologist", "General Physician"],
  stomach: ["Gastroenterologist", "General Physician"],
  "stomach pain": ["Gastroenterologist", "General Physician"],
  gastric: ["Gastroenterologist", "General Physician"],
  fever: ["General Physician", "Infectious Disease", "Pediatrician"],
  cough: ["Pulmonologist", "ENT", "General Physician"],
  cold: ["ENT", "General Physician"],
  headache: ["Neurologist", "General Physician", "Psychiatrist"],
  migraine: ["Neurologist", "General Physician"],
  "chest pain": ["Cardiologist", "Pulmonologist", "General Physician"],
  pregnancy: ["Gynecologist", "Obstetrician"],
  dental: ["Dentist", "Oral Surgeon"],
  gum: ["Dentist", "Oral Surgeon"],
  tooth: ["Dentist", "Oral Surgeon"],
  skin: ["Dermatologist"],
  rash: ["Dermatologist"],
  allergy: ["Allergist", "Immunologist"],
  asthma: ["Pulmonologist", "Allergist", "General Physician"],
  anxiety: ["Psychiatrist", "Psychologist"],
  depression: ["Psychiatrist", "Psychologist"],
  infection: ["Infectious Disease", "General Physician"],
  injury: ["Orthopedic", "General Physician"]
};

const findSpecializations = (text = "") => {
  const lowered = text.toLowerCase();
  const found = new Set();

  Object.entries(symptomSpecializations).forEach(([keyword, specs]) => {
    if (lowered.includes(keyword)) {
      specs.forEach((spec) => found.add(spec));
    }
  });

  return [...found];
};

const inferIntentFromText = (prompt) => {
  const lowered = prompt.toLowerCase();
  if (lowered.includes("pay") || lowered.includes("payment") || lowered.includes("checkout")) {
    return "payment_intent";
  }
  if (lowered.includes("book") || lowered.includes("schedule") || lowered.includes("appointment")) {
    return "book_appointment";
  }
  if (lowered.includes("available") || lowered.includes("availability") || lowered.includes("slot") || lowered.includes("date")) {
    return "check_availability";
  }
  if (lowered.includes("doctor") || lowered.includes("specialist") || lowered.includes("symptom") || lowered.includes("pain") || lowered.includes("fever") || lowered.includes("diarrhea") || lowered.includes("cold") || lowered.includes("cough")) {
    return "search_doctors";
  }
  return "unknown";
};

const getLocalDateParts = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  };
};

const toDateKey = (year, month, day) => {
  if (!year || !month || !day) return "";

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "";
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
};

const monthNames = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12
};

const extractDateFromText = (text = "") => {
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return toDateKey(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const numericMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (numericMatch) {
    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
    return toDateKey(year, Number(numericMatch[2]), Number(numericMatch[1]));
  }

  const currentDate = getLocalDateParts();
  const monthNamePattern = Object.keys(monthNames).join("|");
  const monthFirstMatch = text.match(new RegExp(`\\b(${monthNamePattern})\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"));
  if (monthFirstMatch) {
    return toDateKey(
      Number(monthFirstMatch[3] || currentDate.year),
      monthNames[monthFirstMatch[1].toLowerCase()],
      Number(monthFirstMatch[2])
    );
  }

  const dayFirstMatch = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(${monthNamePattern})(?:,?\\s+(\\d{4}))?\\b`, "i"));
  if (dayFirstMatch) {
    return toDateKey(
      Number(dayFirstMatch[3] || currentDate.year),
      monthNames[dayFirstMatch[2].toLowerCase()],
      Number(dayFirstMatch[1])
    );
  }

  return "";
};

const normalizeDateKey = (date = "") => {
  const match = String(date).match(/^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/);
  return match ? toDateKey(Number(match[1]), Number(match[2]), Number(match[3])) : "";
};

const isDateOnlyQuery = (text = "") => {
  return /^\s*\d{4}-\d{2}-\d{2}\s*$/.test(text);
};

const normalizeSearchQuery = (searchQuery = "", prompt = "") => {
  const cleaned = (searchQuery || "").trim();
  if (!cleaned) return "";
  if (cleaned.toLowerCase() === prompt.toLowerCase()) return "";
  if (isDateOnlyQuery(cleaned)) return "";
  const genericPattern = /\b(find|show|list|available|availability|book|doctors|doctor|on|at|this|that|my|me|with)\b/i;
  if (cleaned.split(" ").length > 7 && genericPattern.test(cleaned)) {
    return "";
  }
  return cleaned;
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractDoctorNameFromText = (text = "") => {
  const braceMatch = text.match(/\{\s*([^}]+?)\s*\}/);
  if (braceMatch) return braceMatch[1].trim();

  const patterns = [
    /\bdr\.?\s+([a-z][a-z .'-]+?)(?:\s+(?:is\s+)?(?:available|on|at|for)\b|$)/i,
    /\bdoctor\s*(?:name)?\s*[:=-]\s*([a-z][a-z .'-]+?)(?:\s+(?:on|at|for)\b|$)/i,
    /\bwith\s+(?:this\s+)?doctor\s+([a-z][a-z .'-]+?)(?:\s+(?:on|at|for)\b|$)/i,
    /\bbook(?:\s+my\s+schedule)?\s+with\s+(?:dr\.?\s*)?([a-z][a-z .'-]+?)(?:\s+(?:on|at|for)\b|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1]
        .replace(/\b(this|doctor|schedule|appointment|book|please)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.split(" ").length <= 4) return cleaned;
    }
  }

  return "";
};

const toAgentProviderError = (error) => {
  const statusCode =
    Number(error?.status) ||
    Number(error?.statusCode) ||
    Number(error?.response?.status) ||
    502;
  const providerMessage =
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Agent LLM request failed.";

  return new ApiError(statusCode, `Agent provider error: ${providerMessage}`);
};

const parsePromptIntentLocally = (prompt) => {
  const extractedDate = extractDateFromText(prompt);
  const intentDetected = inferIntentFromText(prompt);
  const availabilityHint = /\b(available|availability|slot|open|schedule|date|on|next)\b/i.test(prompt);
  const bookingHint = /\b(book|schedule|appointment)\b/i.test(prompt);
  const doctorName = extractDoctorNameFromText(prompt);
  const symptoms = findSpecializations(prompt);

  return {
    intent: bookingHint
      ? "book_appointment"
      : extractedDate && availabilityHint
        ? "check_availability"
        : intentDetected,
    searchQuery: normalizeSearchQuery(doctorName ? doctorName : prompt, prompt),
    symptoms,
    doctorName,
    date: extractedDate,
    timePreference: "",
  };
};

const parsePromptIntent = async (prompt) => {
  if (!agentClient) {
    console.warn("[Agent] LLM is not configured; using local prompt parser.");
    return parsePromptIntentLocally(prompt);
  }

  const currentDate = getLocalDateParts();
  const currentDateKey = toDateKey(currentDate.year, currentDate.month, currentDate.day);
  const systemMessage = `You are an intelligent scheduling assistant for a medical booking platform. Analyze the user prompt and output ONLY valid JSON with these fields: intent, searchQuery, symptoms, doctorName, date, timePreference.
- intent must be one of: search_doctors, check_availability, book_appointment, payment_intent, unknown.
- date must be in YYYY-MM-DD if present, or empty string.
- Today is ${currentDateKey} in Asia/Kolkata. For dates without a year, use ${currentDate.year}.
- Numeric dates like 12-06-2026 or 12/06/2026 are DD-MM-YYYY. Month-name dates like June12 mean June 12.
- timePreference can be a phrase like 'morning', '2-4 PM', or empty string.
- doctorName should be the doctor's name if explicitly mentioned.
Respond with JSON only, nothing else.`;

  let completion;
  try {
    completion = await agentClient.chat.completions.create({
      model: AGENT_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
    });
  } catch (error) {
    const providerError = toAgentProviderError(error);
    console.warn("[Agent] Provider request failed; using local prompt parser.", {
      statusCode: providerError.statusCode,
      message: providerError.message,
    });
    return parsePromptIntentLocally(prompt);
  }

  const raw = completion.choices?.[0]?.message?.content;
  const fallbackDate = extractDateFromText(prompt);
  if (!raw) {
    throw new ApiError(502, "Agent provider returned an empty response.");
  }

  const parseJson = (payload) => {
    const json = JSON.parse(payload);
    const extractedDate = fallbackDate || normalizeDateKey(json.date);
    const intentDetected = json.intent || inferIntentFromText(prompt);
    const availabilityHint = /\b(available|availability|slot|open|schedule|date|on|next)\b/i.test(prompt);
    const bookingHint = /\b(book|schedule|appointment)\b/i.test(prompt);
    const intent = bookingHint
      ? "book_appointment"
      : extractedDate && availabilityHint
        ? "check_availability"
        : intentDetected;

    return {
      intent,
      searchQuery: normalizeSearchQuery(json.searchQuery, prompt),
      symptoms: Array.isArray(json.symptoms) && json.symptoms.length ? json.symptoms : findSpecializations(prompt),
      doctorName: json.doctorName || extractDoctorNameFromText(prompt),
      date: extractedDate,
      timePreference: json.timePreference || ""
    };
  };

  try {
    return parseJson(raw);
  } catch (err) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return parseJson(match[0]);
      } catch (nestedErr) {
        throw new ApiError(502, "Agent provider returned invalid JSON.");
      }
    }
    throw new ApiError(502, "Agent provider returned invalid JSON.");
  }
};

const buildDoctorFilter = (searchQuery, symptoms) => {
  const filter = { verified: true };
  const queryClauses = [];

  if (searchQuery) {
    queryClauses.push({ name: { $regex: searchQuery, $options: "i" } });
    queryClauses.push({ email: { $regex: searchQuery, $options: "i" } });
    queryClauses.push({ specialization: { $regex: searchQuery, $options: "i" } });
  }

  const mappedSpecializations = findSpecializations(searchQuery || "").concat(findSpecializations(symptoms.join(" ")));
  if (mappedSpecializations.length) {
    queryClauses.push({ specialization: { $in: mappedSpecializations.map((spec) => new RegExp(spec, "i")) } });
  }

  if (queryClauses.length) {
    filter.$or = queryClauses;
  }

  return filter;
};

const findMatchingDoctors = async (searchQuery, symptoms) => {
  const filter = buildDoctorFilter(searchQuery, symptoms);
  return Doctor.find(filter).select("-password -refreshToken -otp -otpExpires");
};

const findDoctorByName = async (name) => {
  if (!name) return null;
  const safeName = escapeRegex(name);
  const exactMatch = await Doctor.findOne({ name: { $regex: `^${safeName}$`, $options: "i" }, verified: true }).select("-password -refreshToken -otp -otpExpires");
  if (exactMatch) return exactMatch;

  return Doctor.findOne({ name: { $regex: safeName, $options: "i" }, verified: true }).select("-password -refreshToken -otp -otpExpires");
};

const findFallbackDoctors = () => Doctor.find({ verified: true }).select("-password -refreshToken -otp -otpExpires");

const getAvailableDoctorsByDate = async (query, symptoms, date) => {
  const doctorCandidates = await findMatchingDoctors(query, symptoms);
  const doctorIds = doctorCandidates.map((doctor) => doctor._id);

  const filter = { date };
  if (doctorIds.length) {
    filter.doctorId = { $in: doctorIds };
  }

  const schedules = await Schedule.find(filter).populate("doctorId", "name specialization avatar");

  const available = schedules
    .map((schedule) => ({
      doctor: schedule.doctorId,
      date: schedule.date,
      availableSlots: schedule.slots.filter(isSlotAvailable)
    }))
    .filter((item) => item.availableSlots.length > 0);

  return available;
};

const findNextAvailableSlot = async (doctorId, startingDate) => {
  const dateKey = startingDate || toDateKey(getLocalDateParts().year, getLocalDateParts().month, getLocalDateParts().day);
  const schedules = await Schedule.find({ doctorId, date: { $gte: dateKey } }).sort({ date: 1, createdAt: 1 });

  for (const schedule of schedules) {
    const availableSlot = schedule.slots.find(isSlotAvailable);
    if (availableSlot) {
      return { schedule, slotIndex: schedule.slots.indexOf(availableSlot), slot: availableSlot };
    }
  }

  return null;
};

const fulfillAgentRequest = async ({ client, prompt, parsed }) => {
  const { intent, searchQuery, symptoms, doctorName, date, timePreference } = parsed;

  let reply = "I could not understand your request. Please try again with more details.";
  let doctors = [];
  let availability = [];
  let booking = null;

  if (intent === "search_doctors") {
    doctors = await findMatchingDoctors(searchQuery, symptoms);
    if (!doctors.length) {
      const fallbackSpecs = findSpecializations(prompt);
      if (fallbackSpecs.length) {
        doctors = await findMatchingDoctors("", fallbackSpecs);
      }
    }
    if (!doctors.length) {
      doctors = await findFallbackDoctors();
    }
    reply = doctors.length
      ? `I found ${doctors.length} doctors matching your description.`
      : "I couldn't find doctors matching that description.";
  } else if (intent === "check_availability") {
    if (!date) {
      throw new ApiError(400, "Please provide a date to check availability.");
    }
    availability = await getAvailableDoctorsByDate(searchQuery, symptoms, date);
    reply = availability.length
      ? `Here are doctors with available slots on ${date}.`
      : `No available doctors found on ${date}.`;
  } else if (intent === "book_appointment") {
    let doctor = await findDoctorByName(doctorName);
    if (!doctor) {
      const possibleDoctors = await findMatchingDoctors(searchQuery, symptoms);
      doctor = possibleDoctors.length ? possibleDoctors[0] : null;
    }

    if (!doctor) {
      throw new ApiError(404, "Could not identify a doctor to book. Please specify the doctor or the condition again.");
    }

    const currentDate = getLocalDateParts();
    const slotSearchDate = date || toDateKey(currentDate.year, currentDate.month, currentDate.day);
    const available = await findNextAvailableSlot(doctor._id, slotSearchDate);
    if (!available) {
      throw new ApiError(404, `No available slots found for Dr. ${doctor.name}.`);
    }

    const { request: newRequest } = await createAndLockSlotRequest({
      doctorId: doctor._id,
      patientId: client._id,
      scheduleId: available.schedule._id,
      slotIndex: available.slotIndex,
      status: "pending",
      paymentStatus: "unpaid"
    });
    await notifyDoctorSlotBooked({
      doctorId: doctor._id,
      patientId: client._id,
      patientName: client.name,
      slotRequest: newRequest
    });

    let paymentOrder = null;
    try {
      paymentOrder = await razorpay.orders.create({
        amount: available.slot.fee * 100,
        currency: "INR",
        receipt: `receipt_${newRequest._id}`
      });
    } catch (err) {
      console.error("Agent payment order creation failed:", err.message);
    }

    reply = `I have reserved the next available ${available.slot.time} slot with Dr. ${doctor.name} on ${available.schedule.date}. Complete payment to confirm your appointment.`;
    booking = {
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        avatar: doctor.avatar
      },
      scheduleId: available.schedule._id,
      slotRequestId: newRequest._id,
      date: available.schedule.date,
      time: available.slot.time,
      fee: available.slot.fee,
      paymentOrder
    };
  } else if (intent === "payment_intent") {
    reply = "I can initiate payment once you confirm the booking details. Please share which booking you'd like to pay for.";
  } else {
    doctors = await findMatchingDoctors(searchQuery, symptoms);
    if (!doctors.length && /\b(doctors?|specialists?)\b/i.test(prompt)) {
      doctors = await findFallbackDoctors();
    }
    availability = date ? await getAvailableDoctorsByDate(searchQuery, symptoms, date) : [];
    if (availability.length) {
      reply = `I found availability for ${date}.`;
    } else if (doctors.length) {
      reply = `I found ${doctors.length} doctors that may help.`;
    } else {
      reply = "I'm not sure how to help with that yet. Please describe your need more clearly.";
    }
  }

  return {
    reply,
    intent,
    doctors,
    availability,
    booking
  };
};

const AgentState = Annotation.Root({
  prompt: Annotation(),
  client: Annotation(),
  parsed: Annotation(),
  reply: Annotation(),
  intent: Annotation(),
  doctors: Annotation(),
  availability: Annotation(),
  booking: Annotation()
});

const agentGraph = new StateGraph(AgentState)
  .addNode("parse_prompt", async (state) => ({
    parsed: await parsePromptIntent(state.prompt)
  }))
  .addNode("fulfill_request", async (state) => fulfillAgentRequest(state))
  .addEdge(START, "parse_prompt")
  .addEdge("parse_prompt", "fulfill_request")
  .addEdge("fulfill_request", END)
  .compile();

export const handleAgentQuery = asyncHandler(async (req, res) => {
  if (!req.client) {
    throw new ApiError(403, "Only authenticated clients can use the agent.");
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    throw new ApiError(400, "Prompt is required.");
  }

  const result = await agentGraph.invoke({
    prompt,
    client: req.client
  });

  return res.status(200).json({
    success: true,
    reply: result.reply,
    intent: result.intent,
    doctors: result.doctors || [],
    availability: result.availability || [],
    booking: result.booking || null
  });
});
