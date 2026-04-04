import React from "react";
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

export default function Profile() {
  return (
    <div className="min-h-screen bg-[#030306] text-white flex">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[var(--sidebar-width,78px)] p-6">

        {/* 🔥 Header */}
        <GlassCard className="mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-cyan-500/20 to-blue-500/20 blur-2xl" />

          <div className="relative flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Icons.User size={32} />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold">Aayush-02</h1>
              <p className="text-sm text-gray-400">
                Repository Intelligence Operator
              </p>

              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  Verified
                </span>
                <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded">
                  Active Scanner
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 📊 Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Repos Scanned", value: 24, icon: Icons.GitBranch },
            { label: "AI Insights", value: 120, icon: Icons.Sparkles },
            { label: "Dependencies", value: 340, icon: Icons.Network },
            { label: "Avg Speed", value: "2.1s", icon: Icons.Activity },
          ].map((item, i) => (
            <GlassCard key={i} className="hover:scale-[1.03] transition">
              <div className="flex items-center gap-3">
                <item.icon className="text-cyan-400" />
                <div>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-xs text-gray-400">{item.label}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* 🧩 Main Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT SIDE */}
          <div className="col-span-8 space-y-6">

            {/* Developer Identity */}
            <GlassCard>
              <h2 className="mb-4 font-semibold">Developer Identity</h2>

              <div className="grid grid-cols-2 gap-4">
                <input className="input" placeholder="Full Name" />
                <input className="input" placeholder="Username" />
                <input className="input" placeholder="Email" />
                <input className="input" placeholder="Phone" />
              </div>

              <textarea
                className="input mt-4 w-full"
                placeholder="Developer Intent"
              />
            </GlassCard>

            {/* AI Insights */}
            <GlassCard>
              <h2 className="mb-4 font-semibold flex items-center gap-2">
                <Icons.Sparkles size={16} />
                AI Insights
              </h2>

              <div className="space-y-2 text-sm text-gray-300">
                <p>• Preferred Stack: React, Node</p>
                <p>• Code Style: Modular</p>
                <p>• Complexity: Medium</p>
              </div>
            </GlassCard>

            {/* Career */}
            <GlassCard>
              <h2 className="mb-4 font-semibold">Career Profile</h2>

              <input className="input mb-4 w-full" placeholder="Target Role" />

              <div className="border border-dashed border-white/20 p-6 rounded-xl text-center text-gray-400">
                Upload Resume
              </div>
            </GlassCard>
          </div>

          {/* RIGHT SIDE */}
          <div className="col-span-4 space-y-6">

            {/* Links */}
            <GlassCard>
              <h2 className="mb-4 font-semibold">Professional Links</h2>

              <input className="input mb-2 w-full" placeholder="GitHub" />
              <input className="input mb-2 w-full" placeholder="Portfolio" />
              <input className="input w-full" placeholder="Email" />
            </GlassCard>

            {/* Security */}
            <GlassCard>
              <h2 className="mb-4 font-semibold">Security</h2>
              <button className="w-full py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
                Change Password
              </button>
            </GlassCard>

            {/* Preferences */}
            <GlassCard>
              <h2 className="mb-4 font-semibold">Preferences</h2>

              <div className="flex justify-between items-center">
                <span className="text-sm">Scan Mode</span>
                <span className="text-cyan-400 text-sm">Deep</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* ✨ Input Style */}
      <style>{`
        .input {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 10px;
          border-radius: 10px;
          outline: none;
        }
        .input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 10px rgba(139,92,246,0.4);
        }
      `}</style>
    </div>
  );
}