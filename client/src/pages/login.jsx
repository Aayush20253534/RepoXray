import React, { useState } from "react";
import { Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-[#030306] flex items-center justify-center relative overflow-hidden">

      {/* 🌌 Animated Background */}
      <motion.div
        className="absolute w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[160px]"
        animate={{ x: [0, 100, -100, 0], y: [0, -80, 80, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
        style={{ top: "-150px", left: "-150px" }}
      />

      <motion.div
        className="absolute w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px]"
        animate={{ x: [0, -120, 120, 0], y: [0, 100, -100, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
        style={{ bottom: "-150px", right: "-150px" }}
      />

      {/* 🔷 Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-[380px] p-8 rounded-2xl border border-purple-500/20 bg-[#0a0f1c]/80 backdrop-blur-xl shadow-[0_0_60px_rgba(139,92,246,0.15)]"
      >

        {/* ✨ Animated Border Glow */}
        <div className="absolute inset-0 rounded-2xl border border-purple-500/10 animate-pulse pointer-events-none" />

        {/* 🔹 Logo */}
        <div className="text-center mb-6">
          <motion.div
            className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⚡
          </motion.div>

          <h1 className="text-2xl font-bold tracking-wide text-purple-300">
            REPOXRAY
          </h1>

          <p className="text-xs text-gray-400 tracking-widest mt-1">
            SECURE SYSTEM ACCESS
          </p>
        </div>

        {/* 🔥 Tabs */}
        <div className="flex bg-[#0f172a] rounded-xl p-1 mb-6 border border-white/5">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              isLogin
                ? "bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                : "text-gray-500"
            }`}
          >
            LOGIN
          </button>

          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              !isLogin
                ? "bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                : "text-gray-500"
            }`}
          >
            SIGNUP
          </button>
        </div>

        {/* 🔄 Form */}
        <motion.div
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >

          {!isLogin && (
            <div className="flex items-center gap-3 bg-[#0f172a] p-3 rounded-lg border border-white/5 focus-within:border-purple-400/40 transition">
              <User size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Full Name"
                className="bg-transparent outline-none w-full text-sm text-white"
              />
            </div>
          )}

          <div className="flex items-center gap-3 bg-[#0f172a] p-3 rounded-lg border border-white/5 focus-within:border-purple-400/40 transition">
            <Mail size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Username / Email"
              className="bg-transparent outline-none w-full text-sm text-white"
            />
          </div>

          <div className="flex items-center gap-3 bg-[#0f172a] p-3 rounded-lg border border-white/5 focus-within:border-purple-400/40 transition">
            <Lock size={16} className="text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              className="bg-transparent outline-none w-full text-sm text-white"
            />
          </div>

          {/* 🚀 Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              localStorage.setItem("user", "true");
              window.location.href = "/Repositry_Upload";
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_25px_rgba(139,92,246,0.4)]"
          >
            {isLogin ? "CONNECT" : "CREATE ACCOUNT"}
          </motion.button>

        </motion.div>
      </motion.div>
    </div>
  );
}