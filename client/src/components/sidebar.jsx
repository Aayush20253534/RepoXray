import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  UploadCloud,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { name: "RepositoryUpload", icon: UploadCloud, path: "/Repositry_Upload" },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved !== null ? saved === "true" : false;
  });

  const [search, setSearch] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // New state variables for backend integration
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isCollapsed ? "78px" : "220px"
    );
  }, [isCollapsed]);

  // Fetch history data from backend
  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoadingHistory(true);
      try {
        const response = await fetch("http://localhost:8000/api/my-repos", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Map backend response (repo_id, repo_name) to frontend format
          const formattedHistory = data.repositories.map(repo => ({
            id: repo.repo_id,
            name: repo.repo_name
          }));
          setHistoryData(formattedHistory);
        } else {
          console.error("Failed to fetch history");
        }
      } catch (error) {
        console.error("Error fetching repository history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredHistory = historyData.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarVariants = {
    expanded: { width: "220px" },
    collapsed: { width: "78px" },
  };

  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const profileName =
    storedUser?.name ||
    storedUser?.username ||
    "User";

  const profileUsername =
    storedUser?.username ||
    "user";

  const profileInitial = profileName?.charAt(0)?.toUpperCase() || "U";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <motion.div
      className="fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/5 bg-[#080b14] shadow-2xl"
      initial={false}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>

            {!isCollapsed && (
              <span className="font-bold text-white">RepoXray</span>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="absolute -right-3 top-5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#161b2c] text-gray-300 hover:text-white"
          >
            {isCollapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => {
                  window.location.href = item.path;
                }}
                className={`flex h-12 w-full items-center rounded-lg transition ${
                  isActive
                    ? "bg-purple-500/10 text-cyan-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div
                  className={`${
                    isCollapsed ? "w-full" : "w-12"
                  } flex justify-center`}
                >
                  <Icon size={20} />
                </div>

                {!isCollapsed && (
                  <span className="text-sm">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Search */}
        {!isCollapsed && (
          <div className="mt-4 px-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
          </div>
        )}

        {/* History */}
        {!isCollapsed && (
          <div className="mt-4 flex-1 overflow-y-auto px-3">
            <p className="mb-2 text-xs text-gray-500">History</p>

            {isLoadingHistory ? (
              <p className="text-xs text-gray-400 px-2">Loading...</p>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => console.log(`Maps to repo: ${item.id}`)}
                  className="w-full truncate rounded-lg px-2 py-2 text-left text-sm text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  {item.name}
                </button>
              ))
            ) : (
              <p className="text-xs text-gray-400 px-2">No repositories found.</p>
            )}
          </div>
        )}

        {/* Profile Section */}
        <div className="mt-auto border-t border-white/5 px-3 py-3">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex w-full items-center rounded-lg p-2 transition hover:bg-white/5 ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">
              {profileInitial}
            </div>

            {!isCollapsed && (
              <div className="text-left min-w-0">
                <p className="truncate text-sm text-white">{profileName}</p>
                <p className="truncate text-xs text-gray-400">
                  {profileUsername}
                </p>
              </div>
            )}
          </button>

          {!isCollapsed && isProfileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="w-full text-left text-sm text-gray-300 hover:text-white"
              >
                🔐 Change Password
              </button>

              {showPassword && (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Old Password"
                    className="w-full rounded bg-black/30 p-2 text-sm outline-none"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full rounded bg-black/30 p-2 text-sm outline-none"
                  />

                  <button className="w-full rounded-lg bg-purple-600 py-2 text-sm hover:bg-purple-700">
                    Confirm Change
                  </button>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-left text-sm text-red-400 hover:text-red-300"
              >
                🚪 Logout
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;