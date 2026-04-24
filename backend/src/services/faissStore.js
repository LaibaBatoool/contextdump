import faiss from "faiss-node";
import fs from "fs-extra";
import path from "path";

const DIMENSION = 384;

export class FaissStore {
  constructor() {
    this.index = new faiss.IndexFlatIP(DIMENSION);
    this.metadata = [];
  }

  addVector(embedding, metadata) {
    this.index.add(embedding);
    this.metadata.push(metadata);
  }

  search(queryEmbedding, topK = 5) {
    if (this.metadata.length === 0) return [];
    const k = Math.min(topK, this.metadata.length);
    const result = this.index.search(queryEmbedding, k);

    return result.labels
      .map((label, i) => ({
        score: result.distances[i],
        metadata: this.metadata[label],
      }))
      .filter((r) => r.score > 0.3);
  }

  async save(dirPath) {
    await fs.ensureDir(dirPath);
    this.index.write(path.join(dirPath, "index.faiss"));
    await fs.writeJson(path.join(dirPath, "metadata.json"), this.metadata);
    console.log(`Saved ${this.metadata.length} vectors to ${dirPath}`);
  }

  static async load(dirPath) {
    const store = new FaissStore();
    store.index = faiss.IndexFlatIP.read(path.join(dirPath, "index.faiss"));
    store.metadata = await fs.readJson(path.join(dirPath, "metadata.json"));
    console.log(`Loaded ${store.metadata.length} vectors`);
    return store;
  }
}

// Cache so we don't reload on every request
const storeCache = new Map();

export const getStore = async (vectorStorePath) => {
  if (!storeCache.has(vectorStorePath)) {
    const store = await FaissStore.load(vectorStorePath);
    storeCache.set(vectorStorePath, store);
  }
  return storeCache.get(vectorStorePath);
};