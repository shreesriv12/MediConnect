import mongoose from "mongoose";

const ragChunkSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    fileId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ragChunkSchema.index({ sessionId: 1, fileId: 1, chunkIndex: 1 }, { unique: true });

export default mongoose.model("RagChunk", ragChunkSchema);
