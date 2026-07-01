import express from "express";
import multer from "multer";
import { protect } from "../middleware/auth.middleware.js";
import {
  sendMessage,
  sendVoiceMessage,
  getChatHistory,
  clearHistory,
} from "../controllers/chat.controller.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.post("/:repoId", sendMessage);
router.post("/:repoId/voice", upload.single("audio"), sendVoiceMessage);
router.get("/:repoId", getChatHistory);
router.delete("/:repoId", clearHistory);

export default router;
