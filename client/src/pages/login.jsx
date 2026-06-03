import React, { useState } from "react";
import { motion } from "framer-motion";

const API_BASE_URL = "http://localhost:8000";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleSubmit = async () => {
    resetMessages();

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Username and password are required");
      return;
    }

    if (!isLogin && !formData.name.trim()) {
      setError("Full name is required");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        const loginBody = new URLSearchParams();
        loginBody.append("username", formData.username);
        loginBody.append("password", formData.password);

        const response = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: loginBody.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Login failed");
        }

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify({
          username: formData.username,
        }));

        window.location.href = "/Repositry_Upload";
      } else {
        const response = await fetch(`${API_BASE_URL}/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            username: formData.username,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Signup failed");
        }

        setSuccess("Account created successfully. Please login now.");
        setIsLogin(true);
        setFormData({
          name: "",
          username: "",
          password: "",
        });
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050816]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#0a0f2c] to-purple-700/40" />
      <div className="absolute bottom-0 w-full h-[300px] bg-purple-600/30 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-[380px] p-8 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_40px_rgba(139,92,246,0.2)]"
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-white">
            {isLogin ? "Login" : "Create Account"}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Secure access to RepoXray
          </p>
        </div>

        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          <button
            onClick={() => {
              setIsLogin(true);
              resetMessages();
            }}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              isLogin
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                : "text-gray-400"
            }`}
          >
            Login
          </button>

          <button
            onClick={() => {
              setIsLogin(false);
              resetMessages();
            }}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              !isLogin
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                : "text-gray-400"
            }`}
          >
            Signup
          </button>
        </div>

        <motion.div
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {!isLogin && (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-purple-400/40"
            />
          )}

          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-purple-400/40"
          />

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-purple-400/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-60"
          >
            {loading
              ? isLogin
                ? "Logging in..."
                : "Creating account..."
              : isLogin
              ? "Login"
              : "Create Account"}
          </motion.button>

          <p className="text-xs text-gray-400 text-center mt-2">
            {isLogin ? "Enter your username and password" : "Create your RepoXray account"}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}