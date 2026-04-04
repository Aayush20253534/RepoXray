import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  UploadCloud,
  Search,
  X,
  User,
  Mail,
  ShieldCheck,
  Activity,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "RepositoryUpload", icon: UploadCloud, path: "/Repositry_Upload" },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved !== null ? saved === "true" : false;
  });

  const [search, setSearch] = useState("");
  const [showProfilePopup, setShowProfilePopup] = useState(false);

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
    <>
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>

              <motion.span
                initial={false}
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  x: isCollapsed ? -8 : 0,
                  width: isCollapsed ? 0 : "auto",
                }}
                className="overflow-hidden whitespace-nowrap font-bold tracking-tight text-white"
              >
                RepoXray
              </motion.span>
            </div>

            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="absolute -right-3 top-5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#161b2c] text-gray-300 transition hover:bg-[#1d2333] hover:text-white"
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
                  onClick={() => navigate(item.path)}
                  className={`flex h-12 w-full items-center rounded-lg transition ${
                    isActive
                      ? "bg-purple-500/10 text-cyan-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div
                    className={`flex justify-center ${
                      isCollapsed ? "w-full" : "w-12"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={
                        isActive
                          ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                          : ""
                      }
                    />
                  </div>

                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.name}</span>
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
                  className="w-full bg-transparent text-sm text-white outline-none placeholder-gray-500"
                />
              </div>
            </div>
          )}

          {/* History */}
          {!isCollapsed && (
            <div className="no-scrollbar mt-4 flex-1 overflow-y-auto px-3">
              <p className="mb-2 text-xs text-gray-500">History</p>

              <div className="space-y-1">
                {filteredHistory.map((item) => (
                  <button
                    key={item.id}
                    className="w-full truncate rounded-lg px-2 py-2 text-left text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Profile */}
          <div className="mt-auto border-t border-white/5 px-3 py-3">
            <button
              onClick={() => setShowProfilePopup(true)}
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
                  <p className="text-xs text-gray-400">Open Profile Card</p>
                </div>
              )}
            </button>
          </div>
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </motion.div>

      {/* Profile Popup */}
      <AnimatePresence>
        {showProfilePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-y-0 right-0 z-[120] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md"
            style={{ left: "var(--sidebar-width, 78px)" }}
            onClick={() => setShowProfilePopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a10] shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_26%)]" />

              <div className="relative border-b border-white/8 bg-white/[0.03] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-2xl font-bold text-white shadow-[0_0_28px_rgba(168,85,247,0.35)]">
                      O
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        Om Upadhyay
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Repository Intelligence Operator
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                          Verified
                        </span>
                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">
                          Active Scanner
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowProfilePopup(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-neutral-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <User className="h-4 w-4 text-purple-300" />
                    Identity
                  </div>
                  <div className="space-y-2 text-sm text-neutral-300">
                    <p><span className="text-neutral-500">Name:</span> Om Upadhyay</p>
                    <p><span className="text-neutral-500">Role:</span> Frontend / RepoXray Operator</p>
                    <p><span className="text-neutral-500">Username:</span> om-upadhyay</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Mail className="h-4 w-4 text-cyan-300" />
                    Contact
                  </div>
                  <div className="space-y-2 text-sm text-neutral-300">
                    <p><span className="text-neutral-500">Email:</span> om@example.com</p>
                    <p><span className="text-neutral-500">GitHub:</span> github.com/omupadhyay</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Status
                  </div>
                  <div className="space-y-2 text-sm text-neutral-300">
                    <p>Secure workspace access enabled</p>
                    <p>Profile verified for internal actions</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Activity className="h-4 w-4 text-pink-300" />
                    Activity
                  </div>
                  <div className="space-y-2 text-sm text-neutral-300">
                    <p>Repos scanned: 24</p>
                    <p>Insights generated: 120</p>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-wrap items-center justify-end gap-3 border-t border-white/8 px-6 py-4">
                <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/[0.07] hover:text-white">
                  <Globe className="h-4 w-4" />
                  GitHub
                </button>

                <button
                  onClick={() => setShowProfilePopup(false)}
                  className="rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_30px_rgba(168,85,247,0.28)] transition hover:scale-[1.01]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;