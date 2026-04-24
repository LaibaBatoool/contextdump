import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import api from "../utils/api";

export default function RepoCard({ repo, onDelete }) {
  const navigate = useNavigate();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm("Delete this repo?")) return;
    try {
      await api.delete(`/repos/${repo._id}`);
      onDelete(repo._id);
    } catch (err) {
      alert("Failed to delete repo");
    }
  };

  const handleClick = () => {
    if (repo.status === "ready") navigate(`/repo/${repo._id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-[#111111] border border-zinc-800 rounded-xl p-5 transition-all duration-200 group
        ${repo.status === "ready"
          ? "hover:border-violet-500/50 hover:bg-[#131313] cursor-pointer"
          : "opacity-80 cursor-default"
        }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Repo icon */}
          <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h8M8 16h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-medium text-sm truncate group-hover:text-violet-300 transition-colors">
              {repo.name}
            </h3>
            <p className="text-zinc-600 text-xs truncate mt-0.5">
              {repo.githubUrl.replace("https://github.com/", "")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={repo.status} />
          <button
            onClick={handleDelete}
            className="text-zinc-700 hover:text-red-400 transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      {repo.status === "ready" && (
        <div className="flex items-center gap-4 mb-4">
          <div className="text-center">
            <p className="text-white text-sm font-medium">{repo.stats?.totalFiles || 0}</p>
            <p className="text-zinc-600 text-xs">files</p>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div className="text-center">
            <p className="text-white text-sm font-medium">{repo.stats?.totalChunks || 0}</p>
            <p className="text-zinc-600 text-xs">chunks</p>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div className="flex flex-wrap gap-1">
            {repo.stats?.languages?.slice(0, 3).map((lang) => (
              <span key={lang} className="text-xs text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Processing message */}
      {repo.status !== "ready" && repo.status !== "failed" && (
        <div className="flex items-center gap-2 mt-3">
          <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs">Processing your repository...</p>
        </div>
      )}

      {/* Failed message */}
      {repo.status === "failed" && (
        <p className="text-red-400 text-xs mt-3">{repo.errorMessage || "Ingestion failed"}</p>
      )}

      {/* Click hint */}
      {repo.status === "ready" && (
        <div className="flex items-center gap-1 text-zinc-600 group-hover:text-violet-400 transition-colors">
          <span className="text-xs">Open chat</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}