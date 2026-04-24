import Repo from "../models/repo.model.js";
import { ingestRepo } from "../services/ingestion.service.js";

// Add a new repo and start ingestion
export const addRepo = async (req, res) => {
  try {
    const { githubUrl } = req.body;

    if (!githubUrl)
      return res.status(400).json({ message: "githubUrl is required" });

    // Extract repo name from URL
    const parts = githubUrl.replace(/\.git$/, "").split("/");
    const name = parts[parts.length - 1];

    const repo = await Repo.create({
      owner: req.user._id,
      name,
      githubUrl,
      status: "pending",
    });

    // Start ingestion in background — don't await it
    // This means the API responds instantly and ingestion runs behind the scenes
    ingestRepo(repo._id.toString(), githubUrl);

    res.status(201).json({ repo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all repos for logged in user
export const getMyRepos = async (req, res) => {
  try {
    const repos = await Repo.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ repos });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single repo by id
export const getRepoById = async (req, res) => {
  try {
    const repo = await Repo.findById(req.params.id);

    if (!repo)
      return res.status(404).json({ message: "Repo not found" });

    if (repo.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    res.json({ repo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a repo
export const deleteRepo = async (req, res) => {
  try {
    const repo = await Repo.findById(req.params.id);

    if (!repo)
      return res.status(404).json({ message: "Repo not found" });

    if (repo.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the owner can delete" });

    await repo.deleteOne();
    res.json({ message: "Repo deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};