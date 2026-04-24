import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    repo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repo",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },

    // Which code chunks the agent used to answer
    sources: [
      {
        filePath: String,
        lineStart: Number,
        lineEnd: Number,
        snippet: String,
      },
    ],

    toolUsed: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);