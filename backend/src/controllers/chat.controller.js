import Repo from "../models/repo.model.js";
import Message from "../models/message.model.js";
import { runAgent } from "../services/agent.service.js";
import axios from "axios";
import FormData from "form-data";

export const sendMessage = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { content } = req.body;

    if (!content)
      return res.status(400).json({ message: "Message content is required" });

    const repo = await Repo.findById(repoId);
    if (!repo)
      return res.status(404).json({ message: "Repo not found" });

    if (repo.status !== "ready")
      return res.status(400).json({ message: `Repo is still ${repo.status}` });

    if (repo.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    await Message.create({
      repo: repoId,
      user: req.user._id,
      role: "user",
      content,
    });

    const history = await Message.find({ repo: repoId, user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const chatHistory = history.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const { answer, sources, toolUsed } = await runAgent(
      content,
      repo.vectorStorePath,
      chatHistory
    );

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

export const sendVoiceMessage = async (req, res) => {
  try {
    const { repoId } = req.params;

    if (!req.file)
      return res.status(400).json({ message: "Audio file is required" });

    // Step 1: Transcribe audio via Whisper service
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const whisperResponse = await axios.post(
      "http://127.0.0.1:8001/transcribe",
      formData,
      { headers: formData.getHeaders() }
    );

    const content = whisperResponse.data.text;

    if (!content || content.trim() === "")
      return res.status(400).json({ message: "Could not transcribe audio" });

    // Step 2: Validate repo access (same as sendMessage)
    const repo = await Repo.findById(repoId);
    if (!repo)
      return res.status(404).json({ message: "Repo not found" });

    if (repo.status !== "ready")
      return res.status(400).json({ message: `Repo is still ${repo.status}` });

    if (repo.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    // Step 3: Save user message
    await Message.create({
      repo: repoId,
      user: req.user._id,
      role: "user",
      content,
    });

    // Step 4: Get chat history and run agent
    const history = await Message.find({ repo: repoId, user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const chatHistory = history.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const { answer, sources, toolUsed } = await runAgent(
      content,
      repo.vectorStorePath,
      chatHistory
    );

    // Step 5: Save assistant message
    const assistantMessage = await Message.create({
      repo: repoId,
      user: req.user._id,
      role: "assistant",
      content: answer,
      sources,
      toolUsed,
    });

    // Step 6: Convert answer to speech via TTS service
    let audioBase64 = null;
    try {
      const ttsResponse = await axios.post(
        `http://127.0.0.1:8001/synthesize?text=${encodeURIComponent(answer)}`,
        {},
        { responseType: "arraybuffer" }  // important: tells axios to treat response as binary
      );
      audioBase64 = Buffer.from(ttsResponse.data).toString("base64");
    } catch (ttsError) {
      // TTS failure should NOT break the whole response
      // text answer still gets returned, audio will just be null
      console.error("TTS error (non-fatal):", ttsError.message);
    }

    res.json({
      message: assistantMessage,
      transcribedText: content,
      audio: audioBase64,        // base64 MP3 string, or null if TTS failed
      audioMimeType: "audio/mpeg"
    });

  } catch (error) {
    console.error("Voice chat error:", error.message);
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
