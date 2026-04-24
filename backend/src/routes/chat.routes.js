import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  sendMessage,
  getChatHistory,
  clearHistory,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.use(protect);

router.post("/:repoId", sendMessage);
router.get("/:repoId", getChatHistory);
router.delete("/:repoId", clearHistory);

export default router;