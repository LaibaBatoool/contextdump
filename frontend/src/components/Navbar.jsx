import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold font-mono">CD</span>
          </div>
          <span className="text-white font-semibold tracking-tight">
            ContextDump
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 text-sm hidden sm:block">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        </div>

      </div>
    </nav>
  );
}