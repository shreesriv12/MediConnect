import { answerQuestionForSession } from "./rag.service.js";
import {
  appendChatMessage,
  buildReplyToSnapshot,
  emitChatMessage,
  findChatForParticipant,
} from "./chatSession.service.js";

export const askQuestionInSession = async ({ sessionId, question, replyTo, requester, io }) => {
  const trimmedQuestion = question?.trim();
  if (!trimmedQuestion) {
    const error = new Error("Question is required");
    error.statusCode = 400;
    throw error;
  }

  const chat = await findChatForParticipant(sessionId, requester.userId);
  const replyToSnapshot = buildReplyToSnapshot(chat, replyTo);
  const targetFileId = replyToSnapshot?.fileId || null;
  const directReplyContext =
    !targetFileId && replyToSnapshot?.senderType === "Doctor"
      ? {
          content: replyToSnapshot.content,
          sourceName: replyToSnapshot.fileName || "Doctor's Message",
          messageId: replyToSnapshot.messageId,
        }
      : null;

  const questionMessage = await appendChatMessage(sessionId, {
    content: trimmedQuestion,
    messageType: "text",
    sender: requester,
    replyTo: replyToSnapshot,
    metadata: {
      questionType: "rag",
      targetFileId,
    },
  });

  emitChatMessage(io, sessionId, questionMessage, requester.userType);

  const result = await answerQuestionForSession({
    sessionId: sessionId.toString(),
    question: trimmedQuestion,
    fileId: targetFileId,
    directContext: directReplyContext,
  });

  const savedMessage = await appendChatMessage(sessionId, {
    content: result.answer,
    messageType: "ai",
    sender: requester,
    sources: result.sources,
    replyTo: replyToSnapshot,
    metadata: {
      question: trimmedQuestion,
      generatedBy: "rag",
      targetFileId,
    },
  });

  const payload = {
    sessionId: sessionId.toString(),
    answer: result.answer,
    sources: result.sources,
    message: savedMessage,
    questionMessage,
    replyTo: replyToSnapshot,
  };

  io?.to(sessionId.toString()).emit("query:answer", payload);
  emitChatMessage(io, sessionId, savedMessage, "AI");

  return payload;
};
