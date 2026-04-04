import React, { useState } from "react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050816]">

      {/* 🌌 Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#0a0f2c] to-purple-700/40" />

      {/* 🔥 Glow Layer */}
      <div className="absolute bottom-0 w-full h-[300px] bg-purple-600/30 blur-[120px]" />

      {/* 🔷 CARD */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-[380px] p-8 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_40px_rgba(139,92,246,0.2)]"
      >

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-white">
            {isLogin ? "Login" : "Create Account"}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Secure access to RepoXray
          </p>
        </div>

        {/* 🔥 Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              isLogin
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                : "text-gray-400"
            }`}
          >
            Login
          </button>

          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              !isLogin
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                : "text-gray-400"
            }`}
          >
            Signup
          </button>
        </div>

        {/* 🔄 FORM */}
        <motion.div
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >

          {/* Name */}
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-purple-400/40"
            />
          )}

          {/* Email */}
          <input
            type="text"
            placeholder="Email or username"
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-purple-400/40"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-purple-400/40"
          />

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              localStorage.setItem("user", "true");
              window.location.href = "/Repositry_Upload";
            }}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            {isLogin ? "Login" : "Create Account"}
          </motion.button>

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center mt-2">
            {isLogin ? "Forgot password?" : "Already have an account?"}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}