import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import RepoCard from "../components/RepoCard";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [githubUrl, setGithubUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [showInput, setShowInput] = useState(false);

  const fetchRepos = async () => {
    try {
      const { data } = await api.get("/repos");
      setRepos(data.repos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
    // Poll every 5 seconds to update ingestion status
    const interval = setInterval(fetchRepos, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddRepo = async (e) => {
    e.preventDefault();
    setError("");
    if (!githubUrl.includes("github.com")) {
      setError("Please enter a valid GitHub URL");
      return;
    }
    setAdding(true);
    try {
      const { data } = await api.post("/repos", { githubUrl });
      setRepos((prev) => [data.repo, ...prev]);
      setGithubUrl("");
      setShowInput(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add repo");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id) => {
    setRepos((prev) => prev.filter((r) => r._id !== id));
  };

  const readyRepos = repos.filter((r) => r.status === "ready");
  const processingRepos = repos.filter((r) => r.status !== "ready" && r.status !== "failed");
  const failedRepos = repos.filter((r) => r.status === "failed");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      {/* Background glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-white text-2xl font-semibold mb-1">
              Hey, {user?.name} 👋
            </h1>
            <p className="text-zinc-500 text-sm">
              Connect a GitHub repo and start asking questions about your code.
            </p>
          </div>

          <button
            onClick={() => setShowInput(!showInput)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Repo
          </button>
        </div>

        {/* Add Repo Input */}
        {showInput && (
          <div className="bg-[#111111] border border-zinc-800 rounded-xl p-5 mb-8">
            <h2 className="text-white text-sm font-medium mb-4">Add a GitHub Repository</h2>
            <form onSubmit={handleAddRepo} className="flex gap-3">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="flex-1 bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="submit"
                disabled={adding}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {adding ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : "Add"}
              </button>
            </form>
            {error && (
              <p className="text-red-400 text-xs mt-3">{error}</p>
            )}
            <p className="text-zinc-600 text-xs mt-3">
              Only public GitHub repositories are supported.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : repos.length === 0 ? (

          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
              <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">No repositories yet</h3>
            <p className="text-zinc-600 text-sm max-w-xs">
              Add a public GitHub repo to get started. The agent will index it and answer your questions.
            </p>
          </div>

        ) : (
          <div className="space-y-8">

            {/* Processing */}
            {processingRepos.length > 0 && (
              <div>
                <h2 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">
                  Processing
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processingRepos.map((repo) => (
                    <RepoCard key={repo._id} repo={repo} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}

            {/* Ready */}
            {readyRepos.length > 0 && (
              <div>
                <h2 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">
                  Ready to chat
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyRepos.map((repo) => (
                    <RepoCard key={repo._id} repo={repo} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}

            {/* Failed */}
            {failedRepos.length > 0 && (
              <div>
                <h2 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">
                  Failed
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {failedRepos.map((repo) => (
                    <RepoCard key={repo._id} repo={repo} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}