import simpleGit from "simple-git";
import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import { getEmbedding } from "./embeddings.js";
import { FaissStore } from "./faissStore.js";
import Repo from "../models/repo.model.js";

// Only process these file types
const CODE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx",
  ".py", ".java", ".cpp", ".c",
  ".css", ".scss", ".html", ".md",
];

// Skip these folders completely
const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
];

export const ingestRepo = async (repoId, githubUrl) => {
  const clonePath = path.join("./data/repos", repoId);
  const vectorStorePath = path.join("./data/vectorstores", repoId);

  try {
    // Step 1 — Cloning
    await Repo.findByIdAndUpdate(repoId, { status: "cloning" });
    console.log(`Cloning ${githubUrl}...`);
    await fs.ensureDir(clonePath);
    await simpleGit().clone(githubUrl, clonePath, ["--depth", "1"]);

    // Step 2 — Chunking
    await Repo.findByIdAndUpdate(repoId, { status: "chunking" });
    console.log("Walking files...");

    const pattern = path.join(clonePath, "**/*").replace(/\\/g, "/");
    const files = await glob(pattern, {
      ignore: IGNORE_PATTERNS,
      nodir: true,
    });

    const codeFiles = files.filter((f) =>
      CODE_EXTENSIONS.includes(path.extname(f))
    );

    console.log(`Found ${codeFiles.length} code files`);

    const allChunks = [];
    const languages = new Set();

    for (const filePath of codeFiles) {
      const ext = path.extname(filePath);
      const lang = extToLanguage(ext);
      if (lang) languages.add(lang);

      const content = await fs.readFile(filePath, "utf-8").catch(() => null);
      if (!content || content.length > 100000) continue;

      const relativePath = path.relative(clonePath, filePath).replace(/\\/g, "/");
      const chunks = chunkFile(content, relativePath, ext);
      allChunks.push(...chunks);
    }

    console.log(`Created ${allChunks.length} chunks`);

    // Step 3 — Embedding
    await Repo.findByIdAndUpdate(repoId, { status: "embedding" });

    const store = new FaissStore();

    for (let i = 0; i < allChunks.length; i++) {
      if (i % 20 === 0) console.log(`Embedding ${i}/${allChunks.length}...`);
      const embedding = await getEmbedding(allChunks[i].content);
      store.addVector(embedding, allChunks[i]);
    }

    await store.save(vectorStorePath);

    // Step 4 — Done
    await Repo.findByIdAndUpdate(repoId, {
      status: "ready",
      vectorStorePath,
      stats: {
        totalFiles: codeFiles.length,
        totalChunks: allChunks.length,
        languages: Array.from(languages),
      },
    });

    console.log(`✅ Repo ${repoId} is ready!`);

    // Cleanup cloned files to save disk space
    await fs.remove(clonePath);

  } catch (error) {
    console.error("Ingestion failed:", error.message);
    await Repo.findByIdAndUpdate(repoId, {
      status: "failed",
      errorMessage: error.message,
    });
    await fs.remove(clonePath).catch(() => {});
  }
};

// --- Chunking logic ---

const chunkFile = (content, filePath, ext) => {
  const lines = content.split("\n");

  if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
    return chunkJavaScript(lines, filePath);
  } else if (ext === ".py") {
    return chunkPython(lines, filePath);
  } else {
    return chunkByParagraph(lines, filePath);
  }
};

// JS/TS: chunk by function, class, route
const chunkJavaScript = (lines, filePath) => {
  const chunks = [];
  let current = [];
  let start = 0;
  let depth = 0;
  let inChunk = false;

  const STARTERS = [
    /^(export\s+)?(async\s+)?function\s+\w+/,
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^(export\s+)?class\s+\w+/,
    /^(app|router)\.(get|post|put|delete|patch)\s*\(/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isStarter = STARTERS.some((p) => p.test(trimmed));

    if (isStarter && !inChunk) {
      if (current.length > 3) {
        chunks.push(buildChunk(current, filePath, start, i - 1));
      }
      current = [lines[i]];
      start = i;
      depth = 0;
      inChunk = true;
    } else if (inChunk) {
      current.push(lines[i]);
      depth += (lines[i].match(/{/g) || []).length;
      depth -= (lines[i].match(/}/g) || []).length;

      if (depth <= 0 && current.length > 2) {
        chunks.push(buildChunk(current, filePath, start, i));
        current = [];
        inChunk = false;
        depth = 0;
      }
    } else {
      current.push(lines[i]);
    }
  }

  if (current.length > 3) {
    chunks.push(buildChunk(current, filePath, start, lines.length - 1));
  }

  return chunks;
};

// Python: chunk by def/class
const chunkPython = (lines, filePath) => {
  const chunks = [];
  let current = [];
  let start = 0;

  for (let i = 0; i < lines.length; i++) {
    const isStarter = /^(def |class |async def )/.test(lines[i].trim());

    if (isStarter && i > 0) {
      if (current.length > 2) {
        chunks.push(buildChunk(current, filePath, start, i - 1));
      }
      current = [lines[i]];
      start = i;
    } else {
      current.push(lines[i]);
    }
  }

  if (current.length > 2) {
    chunks.push(buildChunk(current, filePath, start, lines.length - 1));
  }

  return chunks;
};

// Everything else: chunk by blank line groups
const chunkByParagraph = (lines, filePath) => {
  const chunks = [];
  let current = [];
  let start = 0;

  for (let i = 0; i < lines.length; i++) {
    const isEmpty = lines[i].trim() === "";

    if (isEmpty && current.length > 5) {
      chunks.push(buildChunk(current, filePath, start, i));
      current = [];
      start = i + 1;
    } else if (!isEmpty || current.length > 0) {
      current.push(lines[i]);
    }
  }

  if (current.length > 3) {
    chunks.push(buildChunk(current, filePath, start, lines.length - 1));
  }

  return chunks;
};

const buildChunk = (lines, filePath, lineStart, lineEnd) => ({
  content: `// File: ${filePath} (lines ${lineStart + 1}-${lineEnd + 1})\n${lines.join("\n")}`,
  filePath,
  lineStart: lineStart + 1,
  lineEnd: lineEnd + 1,
  snippet: lines.slice(0, 3).join(" ").substring(0, 150),
});

const extToLanguage = (ext) => {
  const map = {
    ".js": "JavaScript", ".jsx": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".py": "Python", ".java": "Java",
    ".cpp": "C++", ".c": "C",
    ".css": "CSS", ".scss": "SCSS", ".html": "HTML",
  };
  return map[ext] || null;
};