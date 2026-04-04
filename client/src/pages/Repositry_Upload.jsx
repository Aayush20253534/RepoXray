import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github,
  Search,
  FolderTree,
  BotMessageSquare,
  Network,
  Sparkles,
  Orbit,
  ChevronRight,
  ClipboardPaste,
  ArrowRight,
  Binary,
  Activity,
  Database,
  Cpu,
  Layers3,
  ShieldCheck,
} from 'lucide-react';
import Sidebar from '../components/sidebar';

// ==========================
// Shared UI
// ==========================

const GlassCard = ({ children, className = '', glow = 'purple' }) => {
  const glowMap = {
    purple: 'border-purple-500/20 hover:shadow-[0_0_45px_rgba(168,85,247,0.18)]',
    blue: 'border-blue-500/20 hover:shadow-[0_0_45px_rgba(59,130,246,0.18)]',
    cyan: 'border-cyan-500/20 hover:shadow-[0_0_45px_rgba(6,182,212,0.18)]',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border bg-white/[0.03] backdrop-blur-2xl transition-all duration-500 ${glowMap[glow]} ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%)] pointer-events-none" />
      {children}
    </div>
  );
};

const StatPill = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-neutral-300">
    <Icon className="h-3.5 w-3.5 text-purple-400" />
    <span>{label}</span>
  </div>
);

// ==========================
// Stage 1: Upload Page
// ==========================

const UploadStage = ({ repoUrl, setRepoUrl, onAnalyze }) => {
  const isValidRepo = repoUrl.trim().includes('github.com/');

  const pasteDemo = () => {
    setRepoUrl('https://github.com/facebook/react');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.55 }}
      className="mx-auto flex min-h-[calc(100vh-110px)] max-w-6xl items-center"
    >
      <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-purple-300">
            <Cpu className="h-3.5 w-3.5" />
            Repository Intelligence
          </div>

          <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
            Drop a GitHub repo
            <span className="block bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              into the neural scanner
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            Paste a repository link and launch a cinematic analysis flow that reveals the repository
            as an interactive intelligence tree.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <StatPill icon={FolderTree} label="Directory Mapping" />
            <StatPill icon={BotMessageSquare} label="Code Semantics" />
            <StatPill icon={Network} label="Dependency Vision" />
          </div>
        </div>

        <GlassCard glow="purple" className="p-1">
          <div className="rounded-[26px] border border-white/5 bg-black/35 p-6 md:p-8">
            <div className="mb-6">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                GitHub Repository Link
              </div>

              <div className="relative">
                <Github className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/70 py-4 pl-12 pr-4 text-white outline-none transition-all placeholder:text-neutral-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                What happens next
              </div>

              <div className="space-y-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/25 px-4 py-3">
                  <span>1. Validate repository link</span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/25 px-4 py-3">
                  <span>2. Circular neural buffer sequence</span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/25 px-4 py-3">
                  <span>3. Interactive repo tree emerges</span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={pasteDemo}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-3 text-neutral-300 transition-all hover:bg-neutral-800"
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste Demo
              </button>

              <button
                onClick={() => onAnalyze(repoUrl)}
                disabled={!isValidRepo}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-2">
                  Analyze Repository
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </motion.section>
  );
};

// ==========================
// Stage 2A: Circular Buffer
// ==========================

const LoadingBuffer = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    'Cloning repository core...',
    'Reading project skeleton...',
    'Indexing source files...',
    'Tracing dependency signatures...',
    'Composing code summary...',
    'Rendering intelligence tree...',
  ];

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(progressTimer);
          setTimeout(onComplete, 700);
          return 100;
        }
        return next;
      });
    }, 70);

    const statusTimer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 1200);

    return () => {
      clearInterval(progressTimer);
      clearInterval(statusTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[calc(100vh-110px)] items-center justify-center"
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-black/30 px-6 py-14 backdrop-blur-2xl md:px-12">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[140px]" />
          <div className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[110px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative flex h-[320px] w-[320px] items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-purple-500/30"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-6 rounded-full border border-cyan-500/30"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 13, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-12 rounded-full border border-blue-500/20"
            />

            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="absolute h-28 w-28 rounded-full bg-purple-500/20 blur-3xl"
            />
            <motion.div
              animate={{ scale: [1, 1.14, 1] }}
              transition={{ duration: 2.8, repeat: Infinity }}
              className="absolute h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl"
            />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              className="absolute h-[250px] w-[250px]"
            >
              <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
              <div className="absolute bottom-5 right-6 h-2.5 w-2.5 rounded-full bg-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.9)]" />
              <div className="absolute left-7 top-10 h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.9)]" />
            </motion.div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Orbit className="h-8 w-8 text-white" />
              </div>
              <div className="text-5xl font-bold text-white">{progress}%</div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                Processing
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 text-center text-sm font-medium text-purple-300 md:text-base"
            >
              {statuses[statusIndex]}
            </motion.p>
          </AnimatePresence>

          <div className="mt-8 w-full max-w-xl">
            <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-neutral-900">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==========================
// Stage 2B: Results Page
// ==========================

const ResultsStage = ({ repoUrl }) => {
  const [selectedNode, setSelectedNode] = useState('summary');

  const repoName = useMemo(() => {
    const parts = repoUrl.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'repository';
  }, [repoUrl]);

  const nodes = [
    { id: 'tree', label: 'Dir Tree', icon: FolderTree, x: -230, y: -125, color: '#A855F7' },
    { id: 'summary', label: 'Code Summary', icon: BotMessageSquare, x: 240, y: 0, color: '#3B82F6' },
    { id: 'graph', label: 'Dependency Graph', icon: Network, x: -230, y: 125, color: '#06B6D4' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-7xl pt-4"
    >
      <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Repository Intelligence Map
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            {repoName}
          </h2>

          <p className="mt-3 max-w-2xl text-neutral-400">
            The repository has been transformed into a living graph. Select a node to explore structure,
            logic, and dependency behavior.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:w-[560px]">
          <GlassCard glow="purple" className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Mode</div>
            <div className="mt-1 text-lg font-semibold text-white">Deep Scan</div>
          </GlassCard>
          <GlassCard glow="blue" className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Files</div>
            <div className="mt-1 text-lg font-semibold text-white">248</div>
          </GlassCard>
          <GlassCard glow="cyan" className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Language</div>
            <div className="mt-1 text-lg font-semibold text-white">JavaScript</div>
          </GlassCard>
          <GlassCard glow="purple" className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Status</div>
            <div className="mt-1 text-lg font-semibold text-emerald-400">Nominal</div>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <GlassCard glow="purple" className="relative min-h-[620px] overflow-hidden p-0 xl:col-span-7">
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[580px] w-[580px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-[150px]" />
            <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[110px]" />
          </div>

          <div className="absolute left-5 top-5 z-20 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-neutral-300 backdrop-blur-xl">
            Neural Repo Tree
          </div>

          <div className="relative z-10 flex min-h-[620px] items-center justify-center overflow-hidden">
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <linearGradient id="repoLine" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
                </linearGradient>
              </defs>

              {nodes.map((node) => (
                <motion.line
                  key={node.id}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.35 }}
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${node.x}px)`}
                  y2={`calc(50% + ${node.y}px)`}
                  stroke="url(#repoLine)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            <motion.div
              whileHover={{ scale: 1.04 }}
              className="absolute z-20 flex h-32 w-32 items-center justify-center rounded-full border border-white/15 bg-white/5 shadow-[0_0_60px_rgba(255,255,255,0.08)] backdrop-blur-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.8, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-white/5"
              />
              <div className="relative z-10 flex flex-col items-center">
                <Github className="h-9 w-9 text-white" />
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-neutral-300">
                  {repoName}
                </div>
              </div>
            </motion.div>

            {nodes.map((node, index) => (
              <motion.button
                key={node.id}
                onClick={() => setSelectedNode(node.id)}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1, x: node.x, y: node.y }}
                transition={{ duration: 0.6, delay: 0.55 + index * 0.12 }}
                whileHover={{
                  scale: 1.08,
                  boxShadow: `0 0 40px ${node.color}55`,
                }}
                className={`absolute z-20 w-[160px] rounded-2xl border p-4 backdrop-blur-2xl transition-all ${
                  selectedNode === node.id
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-white/10 bg-black/35 text-neutral-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${node.color}22` }}
                  >
                    <node.icon className="h-5 w-5" style={{ color: node.color }} />
                  </div>
                  <div className="text-center text-[11px] font-bold uppercase tracking-[0.16em]">
                    {node.label}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-6 xl:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">Insight Panels</h3>
            <div className="flex gap-2">
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">
                Healthy
              </div>
              <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">
                Live
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedNode === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="space-y-4"
              >
                <GlassCard glow="blue" className="p-6">
                  <h4 className="mb-3 flex items-center gap-2 font-bold text-blue-300">
                    <Activity className="h-4 w-4" />
                    Code Summary
                  </h4>
                  <p className="text-sm leading-7 text-neutral-300">
                    This repository appears modular and UI-driven, with reusable components,
                    route-level organization, and a clear split between visual layers and data flow.
                    The surface looks polished while the internal shape stays maintainable.
                  </p>
                </GlassCard>

                <div className="grid grid-cols-2 gap-4">
                  <GlassCard glow="purple" className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Complexity</div>
                    <div className="mt-1 text-xl font-semibold text-white">Medium-High</div>
                  </GlassCard>
                  <GlassCard glow="cyan" className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Maintainability</div>
                    <div className="mt-1 text-xl font-semibold text-white">Strong</div>
                  </GlassCard>
                </div>

                <GlassCard glow="blue" className="p-6">
                  <h4 className="mb-3 flex items-center gap-2 font-bold text-cyan-300">
                    <Binary className="h-4 w-4" />
                    Observations
                  </h4>
                  <ul className="space-y-3 text-sm text-neutral-300">
                    <li>• Component-driven structure is clearly dominant.</li>
                    <li>• Suitable for React/Vite style architecture visualization.</li>
                    <li>• Good fit for AI-generated documentation panels.</li>
                    <li>• Likely expandable into a real backend-powered repo analyzer later.</li>
                  </ul>
                </GlassCard>
              </motion.div>
            )}

            {selectedNode === 'tree' && (
              <motion.div
                key="tree"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="space-y-4"
              >
                <GlassCard glow="purple" className="p-6">
                  <h4 className="mb-4 flex items-center gap-2 font-bold text-purple-300">
                    <FolderTree className="h-4 w-4" />
                    Dir Tree
                  </h4>

                  <div className="space-y-2 font-mono text-xs">
                    {[
                      '/src',
                      '  /components',
                      '  /pages',
                      '  /hooks',
                      '  /utils',
                      '/public',
                      'package.json',
                      'vite.config.js',
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-neutral-300 transition-all hover:border-purple-500/30"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {selectedNode === 'graph' && (
              <motion.div
                key="graph"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="space-y-4"
              >
                <GlassCard glow="cyan" className="p-6">
                  <h4 className="mb-4 flex items-center gap-2 font-bold text-cyan-300">
                    <Database className="h-4 w-4" />
                    Dependency Graph
                  </h4>

                  <div className="space-y-3">
                    {[
                      'react',
                      'framer-motion',
                      'lucide-react',
                      'tailwindcss',
                      'react-router-dom',
                    ].map((lib) => (
                      <div
                        key={lib}
                        className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3"
                      >
                        <span className="text-sm text-neutral-200">{lib}</span>
                        <ChevronRight className="h-4 w-4 text-neutral-600" />
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <div className="grid grid-cols-2 gap-4">
                  <GlassCard glow="cyan" className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Packages</div>
                    <div className="mt-1 text-xl font-semibold text-white">18</div>
                  </GlassCard>
                  <GlassCard glow="blue" className="p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Critical Nodes</div>
                    <div className="mt-1 text-xl font-semibold text-white">3</div>
                  </GlassCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <GlassCard glow="purple" className="p-6">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Why this feels advanced
            </h4>
            <p className="text-sm leading-6 text-neutral-400">
              The central repo orb, glowing gradients, floating node emergence, and glassmorphism panel stack
              make the whole view feel less like a form and more like a control room.
            </p>
          </GlassCard>
        </div>
      </div>
    </motion.section>
  );
};

// ==========================
// Main Page
// ==========================

export default function RepositoryIntelligencePage() {
  const [stage, setStage] = useState('upload');
  const [repoUrl, setRepoUrl] = useState('');
  const [showLoadingInsideResults, setShowLoadingInsideResults] = useState(true);

  const handleAnalyze = (url) => {
    setRepoUrl(url);
    setStage('results');
    setShowLoadingInsideResults(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030306] text-white selection:bg-purple-500/30">
      <Sidebar />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[20%] top-0 h-[520px] w-[520px] rounded-full bg-purple-600/10 blur-[170px]" />
        <div className="absolute bottom-0 right-[15%] h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[170px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.08]" />
      </div>

      <main
        style={{ marginLeft: 'var(--sidebar-width, 78px)' }}
        className="relative z-10 transition-all duration-300"
      >
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-8 md:py-10">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                <Layers3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-white">RepoXray Neural Engine</div>
                <div className="text-sm text-neutral-500">Aesthetic repository intelligence explorer</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure
              </div>
              <div className="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                <Activity className="h-3.5 w-3.5" />
                System Nominal
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {stage === 'upload' && (
              <UploadStage
                key="upload"
                repoUrl={repoUrl}
                setRepoUrl={setRepoUrl}
                onAnalyze={handleAnalyze}
              />
            )}

            {stage === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {showLoadingInsideResults ? (
                  <LoadingBuffer onComplete={() => setShowLoadingInsideResults(false)} />
                ) : (
                  <ResultsStage repoUrl={repoUrl} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}