import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  addRepo,
  getMyRepos,
  getRepoById,
  deleteRepo,
} from "../controllers/repo.controller.js";

const router = express.Router();

// All repo routes require login
router.use(protect);

router.post("/", addRepo);
router.get("/", getMyRepos);
router.get("/:id", getRepoById);
router.delete("/:id", deleteRepo);

export default router;