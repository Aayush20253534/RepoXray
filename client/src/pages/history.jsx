import React, { useState } from "react";
import Sidebar from "../components/sidebar";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";

const GlassCard = ({ children, className = "" }) => {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 ${className}`}>
      {children}
    </div>
  );
};

export default function History() {
  const [search, setSearch] = useState("");

  // 🔥 Dummy Data (later replace with backend/localStorage)
  const historyData = [
    {
      name: "React Repo Analyzer",
      link: "https://github.com/facebook/react",
      date: "2026-04-04 10:30 AM",
    },
    {
      name: "Node Backend Project",
      link: "https://github.com/nodejs/node",
      date: "2026-04-03 08:15 PM",
    },
    {
      name: "AI Repo Scanner",
      link: "https://github.com/openai/gpt",
      date: "2026-04-02 06:45 PM",
    },
  ];

  const filteredData = historyData.filter((repo) =>
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#030306] text-white flex">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[var(--sidebar-width,78px)] p-6">

        {/* 🔷 Header */}
        <GlassCard className="mb-6">
          <h1 className="text-2xl font-bold">Scan History</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track and revisit your repository intelligence sessions
          </p>
        </GlassCard>

        {/* 🔍 Search */}
        <GlassCard className="mb-6">
          <div className="flex items-center gap-3">
            <Icons.Search className="text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </GlassCard>

        {/* 📦 History List */}
        <div className="space-y-4">

          {filteredData.length > 0 ? (
            filteredData.map((repo, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 flex justify-between items-center transition"
              >
                {/* LEFT */}
                <div className="flex items-start gap-4">
                  <Icons.GitBranch className="text-cyan-400 mt-1" />

                  <div>
                    <h2 className="font-semibold">{repo.name}</h2>
                    <p className="text-xs text-gray-400">{repo.link}</p>
                    <p className="text-xs text-gray-500 mt-1">{repo.date}</p>
                  </div>
                </div>

                {/* RIGHT */}
                <div>
  <button className="px-3 py-1 text-sm bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition">
    View
  </button>
</div>
              </motion.div>
            ))
          ) : (
            <GlassCard className="text-center">
              <Icons.Database className="mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400">No repositories analyzed yet</p>
            </GlassCard>
          )}

        </div>
      </div>
    </div>
  );
}