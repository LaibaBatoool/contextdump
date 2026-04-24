import mongoose from "mongoose";

const repoSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    githubUrl: { type: String, required: true },
    description: { type: String, default: "" },

    // Tracks where we are in the ingestion pipeline
    status: {
      type: String,
      enum: ["pending", "cloning", "chunking", "embedding", "ready", "failed"],
      default: "pending",
    },
    errorMessage: { type: String, default: null },

    // Filled after ingestion completes
    stats: {
      totalFiles: { type: Number, default: 0 },
      totalChunks: { type: Number, default: 0 },
      languages: [String],
    },

    vectorStorePath: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Repo", repoSchema);