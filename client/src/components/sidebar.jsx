import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

  // 🔥 NEW PROFILE STATES
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
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

  const historyData = [
    { id: 1, name: "React Repo Analyzer" },
    { id: 2, name: "Node Backend Project" },
    { id: 3, name: "AI Repo Scanner" },
    { id: 4, name: "Portfolio Website" },
  ];

  const filteredHistory = historyData.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarVariants = {
    expanded: { width: "220px" },
    collapsed: { width: "78px" },
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

        {/* 🔷 Header */}
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

        {/* 🔹 Navigation */}
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
                <div className={`${isCollapsed ? "w-full" : "w-12"} flex justify-center`}>
                  <Icon size={20} />
                </div>

                {!isCollapsed && (
                  <span className="text-sm">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 🔍 Search */}
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

        {/* 📜 History */}
        {!isCollapsed && (
          <div className="mt-4 flex-1 overflow-y-auto px-3">
            <p className="mb-2 text-xs text-gray-500">History</p>

            {filteredHistory.map((item) => (
              <button
                key={item.id}
                className="w-full truncate rounded-lg px-2 py-2 text-left text-sm text-gray-400 hover:bg-white/5 hover:text-white"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {/* 👤 PROFILE SECTION */}
        <div className="mt-auto border-t border-white/5 px-3 py-3">

          {/* PROFILE BUTTON */}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex w-full items-center rounded-lg p-2 transition hover:bg-white/5 ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">
              O
            </div>

            {!isCollapsed && (
              <div className="text-left">
                <p className="text-sm text-white">Om Upadhyay</p>
                <p className="text-xs text-gray-400">om-upadhyay</p>
              </div>
            )}
          </button>

          {/* 🔥 EXPAND PANEL */}
          {!isCollapsed && isProfileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >

              {/* Change Password */}
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
                    className="w-full p-2 rounded bg-black/30 text-sm outline-none"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full p-2 rounded bg-black/30 text-sm outline-none"
                  />

                  <button className="w-full py-2 text-sm bg-purple-600 rounded-lg hover:bg-purple-700">
                    Confirm Change
                  </button>
                </div>
              )}

              {/* Logout */}
              <button
                onClick={() => {
                  localStorage.removeItem("user");
                  window.location.href = "/login";
                }}
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