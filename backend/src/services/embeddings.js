import { pipeline } from "@xenova/transformers";

let embedder = null;

const loadEmbedder = async () => {
  if (!embedder) {
    console.log("Loading embedding model... (first time takes ~30s)");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Embedding model ready ✅");
  }
  return embedder;
};

export const getEmbedding = async (text) => {
  const model = await loadEmbedder();
  const truncated = text.substring(0, 512);
  const output = await model(truncated, { pooling: "mean", normalize: true });
  return Array.from(output.data);
};