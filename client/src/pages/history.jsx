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
  const [filter, setFilter] = useState("all");

  // 🔥 State (so we can delete)
  const [historyData, setHistoryData] = useState([
    {
      id: 1,
      name: "React Repo Analyzer",
      link: "https://github.com/facebook/react",
      date: "2026-04-04 10:30 AM",
    },
    {
      id: 2,
      name: "Node Backend Project",
      link: "https://github.com/nodejs/node",
      date: "2026-04-03 08:15 PM",
    },
    {
      id: 3,
      name: "AI Repo Scanner",
      link: "https://github.com/openai/gpt",
      date: "2026-04-02 06:45 PM",
    },
  ]);

  // 🧠 Convert string → Date
  const parseDate = (dateStr) => new Date(dateStr);

  const now = new Date();

  // 🔍 Search + 📅 Filter
  const filteredData = historyData.filter((repo) => {
    const matchesSearch = repo.name.toLowerCase().includes(search.toLowerCase());

    const repoDate = parseDate(repo.date);
    let matchesFilter = true;

    if (filter === "today") {
      matchesFilter =
        repoDate.toDateString() === now.toDateString();
    }

    if (filter === "week") {
      const diff = (now - repoDate) / (1000 * 60 * 60 * 24);
      matchesFilter = diff <= 7;
    }

    return matchesSearch && matchesFilter;
  });

  // 🗑 Delete Function
  const handleDelete = (id) => {
    setHistoryData((prev) => prev.filter((item) => item.id !== id));
  };

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

        {/* 🔍 Search + 📅 Filter */}
        <GlassCard className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          
          {/* Search */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <Icons.Search className="text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {["all", "today", "week"].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  filter === type
                    ? "bg-cyan-500/30 text-cyan-300"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {type === "all" && "All"}
                {type === "today" && "Today"}
                {type === "week" && "Last 7 Days"}
              </button>
            ))}
          </div>

        </GlassCard>

        {/* 📦 History List */}
        <div className="space-y-4">

          {filteredData.length > 0 ? (
            filteredData.map((repo) => (
              <motion.div
                key={repo.id}
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
                <div className="flex gap-2">
                  
                  {/* View */}
                  <button className="px-3 py-1 text-sm bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition">
                    View
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(repo.id)}
                    className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                  >
                    Delete
                  </button>

                </div>
              </motion.div>
            ))
          ) : (
            <GlassCard className="text-center">
              <Icons.Database className="mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400">No repositories found</p>
            </GlassCard>
          )}

        </div>
      </div>
    </div>
  );
}