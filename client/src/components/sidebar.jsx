import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { name: 'RepositoryUpload', icon: Icons.GitBranch, path: "/Repositry_Upload" },
];

const Sidebar = () => {

  // ✅ Sidebar OPEN by default
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved !== null ? saved === "true" : false; // 🔥 default open
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // 🔥 Dummy history (replace later)
  const historyData = [
    { id: 1, name: "React Repo Analyzer" },
    { id: 2, name: "Node Backend Project" },
    { id: 3, name: "AI Repo Scanner" },
    { id: 4, name: "Portfolio Website" },
  ];

  // 🔍 Filter history
  const filteredHistory = historyData.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarVariants = {
    expanded: { width: '220px' },
    collapsed: { width: '78px' },
  };

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '78px' : '220px'
    );
  }, [isCollapsed]);

  return (
    <motion.div
      className="fixed left-0 top-0 h-screen bg-[#080b14] border-r border-white/5 flex flex-col z-50 shadow-2xl"
      initial={false}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex flex-col h-full">

        {/* 🔷 Header */}
        <div className="px-4 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>

            {!isCollapsed && (
              <span className="font-bold text-white">RepoXray</span>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-5 w-6 h-6 bg-[#161b2c] rounded-md flex items-center justify-center"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* 🔹 Navigation */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center h-12 rounded-lg transition
                  ${isActive ? 'bg-purple-500/10 text-cyan-400' : 'text-gray-400 hover:bg-white/5'}
                `}
              >
                <div className={`${isCollapsed ? 'w-full' : 'w-12'} flex justify-center`}>
                  <item.icon size={20} />
                </div>

                {!isCollapsed && (
                  <span className="text-sm">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 🔍 Search (ChatGPT style) */}
        {!isCollapsed && (
          <div className="px-3 mt-4">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
              <Icons.Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm w-full text-white placeholder-gray-500"
              />
            </div>
          </div>
        )}

        {/* 🔥 History */}
        <div className="flex-1 px-3 mt-4 overflow-y-auto no-scrollbar">
          {!isCollapsed && (
            <p className="text-xs text-gray-500 mb-2">History</p>
          )}

          <div className="space-y-1">
            {filteredHistory.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-2 py-2 text-sm text-gray-400 hover:bg-white/5 rounded-lg truncate"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* 👤 Profile */}
        <div className="px-3 py-3 border-t border-white/5">
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition">
            
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">
              O
            </div>

            {!isCollapsed && (
              <div className="text-left">
                <p className="text-sm">Om Upadhyay</p>
                <p className="text-xs text-gray-400">View Profile</p>
              </div>
            )}
          </button>
        </div>

      </div>

      {/* Hide scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
};

export default Sidebar;