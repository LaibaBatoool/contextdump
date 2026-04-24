import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../utils/api";

function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1
        ${isUser ? "bg-violet-600" : "bg-zinc-800 border border-zinc-700"}`}>
        {isUser ? (
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        ) : (
          <span className="text-zinc-400 text-xs font-bold font-mono">AI</span>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-[#1a1a1a] border border-zinc-800 text-zinc-200 rounded-tl-sm"
          }`}>
          {message.content}
        </div>

        {/* Sources */}
        {!isUser && message.sources?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.sources.slice(0, 3).map((source, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1"
              >
                <svg className="w-3 h-3 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-zinc-400 text-xs font-mono truncate max-w-[200px]">
                  {source.filePath}
                </span>
                <span className="text-zinc-600 text-xs shrink-0">
                  :{source.lineStart}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tool used badge */}
        {!isUser && message.toolUsed && (
          <span className="text-zinc-600 text-xs flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {message.toolUsed.replace(/_/g, " ")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RepoChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [repoRes, chatRes] = await Promise.all([
          api.get(`/repos/${id}`),
          api.get(`/chat/${id}`),
        ]);
        setRepo(repoRes.data.repo);
        setMessages(chatRes.data.messages);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = {
      _id: Date.now(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const { data } = await api.post(`/chat/${id}`, {
        content: userMessage.content,
      });
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now() + 1,
          role: "assistant",
          content: "Something went wrong. Please try again.",
          sources: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear chat history?")) return;
    await api.delete(`/chat/${id}`);
    setMessages([]);
  };

  const suggestions = [
    "Where is authentication handled?",
    "Explain the folder structure",
    "How does the API routing work?",
    "Generate docs for this project",
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      {/* Fixed background glow */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Repo header */}
      <div className="border-b border-zinc-800/50 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-zinc-600 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <div>
              <span className="text-white text-sm font-medium">{repo?.name}</span>
              <span className="text-zinc-600 text-xs ml-2">
                {repo?.stats?.totalChunks} chunks · {repo?.stats?.languages?.join(", ")}
              </span>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

          {messages.length === 0 ? (
            /* Empty state with suggestions */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">Ask anything about this repo</h3>
              <p className="text-zinc-600 text-sm mb-8 max-w-sm">
                The agent has indexed {repo?.stats?.totalChunks} code chunks and will cite exact file locations.
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg._id} message={msg} />
            ))
          )}

          {/* Thinking indicator */}
          {sending && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <span className="text-zinc-400 text-xs font-bold font-mono">AI</span>
              </div>
              <div className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/50 bg-[#0a0a0a] sticky bottom-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about this codebase..."
              disabled={sending}
              className="flex-1 bg-[#1a1a1a] border border-zinc-800 focus:border-violet-500 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}