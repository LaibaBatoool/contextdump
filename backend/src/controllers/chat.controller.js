import Repo from "../models/repo.model.js";
import Message from "../models/message.model.js";
import { runAgent } from "../services/agent.service.js";

export const sendMessage = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { content } = req.body;

    if (!content)
      return res.status(400).json({ message: "Message content is required" });

    // Check repo exists and is ready
    const repo = await Repo.findById(repoId);
    if (!repo)
      return res.status(404).json({ message: "Repo not found" });

    if (repo.status !== "ready")
      return res.status(400).json({ message: `Repo is still ${repo.status}` });

    if (repo.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    // Save user message
    await Message.create({
      repo: repoId,
      user: req.user._id,
      role: "user",
      content,
    });

    // Get last 6 messages for context
    const history = await Message.find({ repo: repoId, user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const chatHistory = history.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Run the agent
    const { answer, sources, toolUsed } = await runAgent(
      content,
      repo.vectorStorePath,
      chatHistory
    );

    // Save assistant response
    const assistantMessage = await Message.create({
      repo: repoId,
      user: req.user._id,
      role: "assistant",
      content: answer,
      sources,
      toolUsed,
    });

    res.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const messages = await Message.find({
      repo: req.params.repoId,
      user: req.user._id,
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const clearHistory = async (req, res) => {
  try {
    await Message.deleteMany({
      repo: req.params.repoId,
      user: req.user._id,
    });
    res.json({ message: "Chat history cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};