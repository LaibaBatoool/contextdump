export default function StatusBadge({ status }) {
  const config = {
    pending:   { color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",   dot: "bg-zinc-400",   label: "Pending" },
    cloning:   { color: "text-blue-400 bg-blue-400/10 border-blue-400/20",   dot: "bg-blue-400 animate-pulse",   label: "Cloning" },
    chunking:  { color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", dot: "bg-yellow-400 animate-pulse", label: "Chunking" },
    embedding: { color: "text-orange-400 bg-orange-400/10 border-orange-400/20", dot: "bg-orange-400 animate-pulse", label: "Embedding" },
    ready:     { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400", label: "Ready" },
    failed:    { color: "text-red-400 bg-red-400/10 border-red-400/20",     dot: "bg-red-400",    label: "Failed" },
  };

  const c = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}