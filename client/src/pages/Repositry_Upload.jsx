import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  
  Search,
  FolderTree,
  BotMessageSquare,
  Network,
  Orbit,
  ChevronRight,
  ChevronDown,
  ClipboardPaste,
  ArrowRight,
  Cpu,
  Layers3,
  FolderOpen,
  FileCode2,
  FileJson,
  Folder,
  FileText,
  X,
  Code2,
  AlignLeft,
} from 'lucide-react';
import * as Icons from "lucide-react";
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%)]" />
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

const NavTabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`group flex h-14 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-all duration-300 ${
      active
        ? 'border-purple-400/40 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-cyan-500/15 text-white shadow-[0_0_25px_rgba(168,85,247,0.18)]'
        : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
    }`}
  >
    <Icon className={`h-4 w-4 ${active ? 'text-purple-300' : 'text-neutral-500 group-hover:text-cyan-300'}`} />
    <span className="truncate">{label}</span>
  </button>
);

const TREE_DATA = [
  {
    type: 'folder',
    name: 'src',
    children: [
      {
        type: 'folder',
        name: 'components',
        children: [
          {
            type: 'file',
            name: 'Sidebar.jsx',
            summary: 'Renders the app sidebar with navigation controls and layout anchors.',
            overview:
              'Sidebar.jsx defines the persistent navigation shell for the product and acts as the entry point for section-level movement across the interface.',
            responsibilities: [
              'Renders the sidebar navigation container and menu links',
              'Supports layout anchoring for the main application shell',
              'Improves navigation consistency across pages and views',
            ],
            insights:
              'This file is foundational for interface structure because it stabilizes navigation behavior and keeps the overall experience modular and reusable.',
            code: `export default function Sidebar() {
  return <aside>Sidebar</aside>;
}`,
          },
        ],
      },
      {
        type: 'folder',
        name: 'pages',
        children: [
          {
            type: 'file',
            name: 'RepositoryUploadPage.jsx',
            summary: 'Handles repository URL input and starts the analysis flow.',
            overview:
              'RepositoryUploadPage.jsx is responsible for collecting the repository link, validating the user action, and initiating the analysis pipeline.',
            responsibilities: [
              'Accepts and validates repository URL input',
              'Triggers the analysis flow and loading stage',
              'Provides a clean launch point for repository scanning',
            ],
            insights:
              'This page is conversion-critical because it transforms a simple link input into the product’s full repository intelligence experience.',
            code: `export default function RepositoryUploadPage() {
  return <div>Upload Page</div>;
}`,
          },
          {
            type: 'file',
            name: 'RepositoryResultsPage.jsx',
            summary: 'Displays repository analysis results using directory, summary, and dependency views.',
            overview:
              'RepositoryResultsPage.jsx organizes the post-analysis experience and surfaces the main intelligence outputs through a tab-based interface.',
            responsibilities: [
              'Displays repository insights across structured tabs',
              'Connects directory tree, summaries, and dependency data',
              'Provides an exploration surface for the analyzed repository',
            ],
            insights:
              'This file acts as the insight dashboard layer, turning raw repository data into something visual, readable, and product-friendly.',
            code: `export default function RepositoryResultsPage() {
  return <div>Results Page</div>;
}`,
          },
        ],
      },
      {
        type: 'folder',
        name: 'hooks',
        children: [],
      },
      {
        type: 'folder',
        name: 'utils',
        children: [],
      },
      {
        type: 'file',
        name: 'App.jsx',
        summary: 'Top-level application shell that manages page routing and layout composition.',
        overview:
          'App.jsx defines the root interface composition and determines how the major pages and shared layout elements are stitched together.',
        responsibilities: [
          'Acts as the top-level application wrapper',
          'Coordinates routing and page-level rendering',
          'Maintains global layout structure and composition',
        ],
        insights:
          'This is the architectural control point of the frontend, making it one of the most important files for maintainability and scalability.',
        code: `function App() {
  return <div>App</div>;
}

export default App;`,
      },
    ],
  },
  {
    type: 'folder',
    name: 'public',
    children: [],
  },
  {
    type: 'file',
    name: 'package.json',
    summary: 'Defines project metadata, scripts, and package dependencies.',
    overview:
      'package.json contains the project identity, execution scripts, and dependency contract required to run and build the application.',
    responsibilities: [
      'Declares project metadata and package identity',
      'Defines scripts for development and build workflows',
      'Tracks dependency versions required by the application',
    ],
    insights:
      'This file is the dependency backbone of the project and directly affects reproducibility, tooling, and environment consistency.',
    code: `{
  "name": "repoxray"
}`,
  },
  {
    type: 'file',
    name: 'vite.config.js',
    summary: 'Configures the Vite build system and frontend tooling pipeline.',
    overview:
      'vite.config.js shapes how the frontend dev server, bundling, and environment behavior are configured during development and production.',
    responsibilities: [
      'Configures the Vite toolchain and plugins',
      'Supports build-time and development-time behavior',
      'Improves frontend performance and project setup clarity',
    ],
    insights:
      'Though usually small, this file has high leverage because it influences how the entire frontend compiles, serves, and scales.',
    code: `import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
});`,
  },
];

const getFileIcon = (name) => {
  if (name.endsWith('.json')) return FileJson;
  if (name.endsWith('.jsx') || name.endsWith('.js')) return FileCode2;
  return FileText;
};

const TreeNode = ({ node, depth = 0, onFileClick }) => {
  const isFolder = node.type === 'folder';
  const [isOpen, setIsOpen] = useState(depth < 1);

  const paddingLeft = 12 + depth * 18;

  if (isFolder) {
    return (
      <div className="select-none">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-neutral-300 transition-all hover:bg-white/[0.04]"
          style={{ paddingLeft }}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />
          )}

          {isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-purple-300" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-cyan-300" />
          )}

          <span className="truncate font-medium">{node.name}</span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && node.children?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="relative">
                {node.children.map((child, index) => (
                  <TreeNode
                    key={`${child.name}-${index}-${depth + 1}`}
                    node={child}
                    depth={depth + 1}
                    onFileClick={onFileClick}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const FileIcon = getFileIcon(node.name);

  return (
    <button
      type="button"
      onClick={() => onFileClick?.(node)}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-neutral-400 transition-all hover:bg-white/[0.03] hover:text-white"
      style={{ paddingLeft: paddingLeft + 28 }}
    >
      <FileIcon className="h-4 w-4 shrink-0 text-blue-300" />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

const DirectoryExplorer = ({ onFileClick }) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-3">
      <div className="mb-3 flex items-center gap-2 border-b border-white/5 px-2 pb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
        <FolderTree className="h-4 w-4 text-purple-300" />
        Explorer
      </div>

      <div className="space-y-1">
        {TREE_DATA.map((node, index) => (
          <TreeNode
            key={`${node.name}-${index}`}
            node={node}
            depth={0}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    </div>
  );
};

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
            Paste a repository link and move into a clean tabbed analysis view for structure,
            summary, and dependencies.
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
                <Icons.GitBranch  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
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
                  <span>1. Clone repository into analysis engine</span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/25 px-4 py-3">
                  <span>2. Generate structured directory tree</span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/25 px-4 py-3">
                  <span>3. Produce semantic code summary </span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/25 px-4 py-3">
                  <span>4. Build dependency relationship graph</span>
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
    'Opening minimal result view...',
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

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
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
// Stage 2B: Minimal Results Page
// ==========================

const DIRECTORY_DATA = [
  {
    type: 'folder',
    name: 'src',
    children: [
      {
        type: 'folder',
        name: 'components',
        children: [
          {
            type: 'file',
            name: 'Sidebar.jsx',
            summary: 'Renders the app sidebar with navigation controls and layout anchors.',
            code: `export default function Sidebar() {
  return <aside>Sidebar</aside>;
}`,
          },
        ],
      },
      {
        type: 'folder',
        name: 'pages',
        children: [
          {
            type: 'file',
            name: 'RepositoryUploadPage.jsx',
            summary: 'Handles repository URL input and starts the analysis flow.',
            code: `export default function RepositoryUploadPage() {
  return <div>Upload Page</div>;
}`,
          },
          {
            type: 'file',
            name: 'RepositoryResultsPage.jsx',
            summary: 'Displays repository analysis results using directory, summary, and dependency views.',
            code: `export default function RepositoryResultsPage() {
  return <div>Results Page</div>;
}`,
          },
        ],
      },
      {
        type: 'file',
        name: 'App.jsx',
        summary: 'Top-level application shell that manages page routing and layout composition.',
        code: `function App() {
  return <div>App</div>;
}

export default App;`,
      },
    ],
  },
  {
    type: 'file',
    name: 'package.json',
    summary: 'Defines project metadata, scripts, and package dependencies.',
    code: `{
  "name": "repoxray"
}`,
  },
];

const getOverview = (file) =>
  file.overview ||
  `${file.name} is a focused module in the repository that contributes to the overall application flow, keeps the project structure organized, and supports the user-facing repository intelligence experience.`;

const getResponsibilities = (file) =>
  file.responsibilities || [
    `Supports the primary behavior expected from ${file.name}`,
    'Maintains a clean separation between structure, logic, and presentation',
    'Improves maintainability through modular and reusable implementation',
  ];

const getInsights = (file) =>
  file.insights ||
  `This file appears to play an important role in keeping the codebase modular, readable, and scalable. Its structure suggests a clean implementation approach suitable for iterative product development.`;

const FilePreviewModal = ({ file, viewMode, setViewMode, onClose }) => {
  if (!file) return null;

  const overview = getOverview(file);
  const responsibilities = getResponsibilities(file);
  const insights = getInsights(file);
  const codeLines = file.code?.split('\n').length || 0;

  return (
    <AnimatePresence>
      <motion.div
        key="file-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.985 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-5xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0a10] shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
        >
          <div className="border-b border-white/8 bg-white/[0.03] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-300">
                  <FileText className="h-4 w-4" />
                  File Preview
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-white">{file.name}</h3>
                  </div>

                  <button
                    onClick={onClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.20em] text-neutral-500">
                      One-line Summary
                    </div>

                    <div className="flex items-center gap-2">
  <span className="text-sm text-neutral-200 truncate">
    {file.summary}
  </span>
</div>

                    <div className="my-2 h-px w-full bg-white/10" />
                  </div>

                  <div className="flex shrink-0 items-center">
                    <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1">
                      <button
                        onClick={() => setViewMode('summary')}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                          viewMode === 'summary'
                            ? 'bg-white/[0.08] text-white'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <AlignLeft className="h-4 w-4" />
                        Summary
                      </button>

                      <button
                        onClick={() => setViewMode('code')}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                          viewMode === 'code'
                            ? 'bg-white/[0.08] text-white'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Code2 className="h-4 w-4" />
                        Code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0f1117]">
              <div className="flex items-center justify-between border-b border-white/6 bg-white/[0.02] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>

                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                  {viewMode === 'summary' ? 'Summary View' : 'Code View'}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {viewMode === 'summary' ? (
                  <motion.div
                    key="summary-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="h-[260px] overflow-y-auto px-5 py-4 text-sm leading-7 text-neutral-300"
                  >
                    <div className="space-y-4">
                      <div className="rounded-xl border border-white/6 bg-white/[0.03] p-4">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                          Overview
                        </div>
                        <p>{overview}</p>
                      </div>

                      <div className="rounded-xl border border-white/6 bg-white/[0.03] p-4">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                          Responsibilities
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-300">
                          {responsibilities.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-white/6 bg-white/[0.03] p-4">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                          Insights
                        </div>
                        <p className="text-sm text-neutral-300">
                          {insights}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.pre
                    key="code-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="h-[260px] overflow-auto px-5 py-4 font-mono text-sm leading-7 text-cyan-200"
                  >
                    <>
                      <div className="mb-3 flex items-center justify-between text-xs text-neutral-500">
                        <span>{file.name}</span>
                        <span>{codeLines} lines</span>
                      </div>

                      <code>{file.code}</code>
                    </>
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ResultsStage = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileViewMode, setFileViewMode] = useState('summary');

  const openFileModal = (file) => {
    setSelectedFile(file);
    setFileViewMode('summary');
  };

  const closeFileModal = () => {
    setSelectedFile(null);
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl pt-2"
    >
      <nav className="mb-6 w-full">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NavTabButton
            active={activeTab === 'directory'}
            onClick={() => setActiveTab('directory')}
            icon={FolderTree}
            label="Directory Tree"
          />
          <NavTabButton
            active={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            icon={BotMessageSquare}
            label="Code Summary"
          />
          <NavTabButton
            active={activeTab === 'dependencies'}
            onClick={() => setActiveTab('dependencies')}
            icon={Network}
            label="Dependency Graph"
          />
        </div>
      </nav>

      <GlassCard glow="purple" className="min-h-[560px] p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'directory' && (
            <motion.div
              key="directory"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
            >
              <DirectoryExplorer onFileClick={openFileModal} />
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 text-neutral-300 leading-7">
                This repository appears to be a modern React frontend with a clean page-based flow.
                It is focused on repository submission, loading animation, and technical visualization.
                The code structure is modular, component-driven, and designed for an advanced UI experience.
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 text-neutral-300 leading-7">
                Key traits:
                <br />
                • Reusable UI components
                <br />
                • Animation-heavy experience using Framer Motion
                <br />
                • Dashboard-like results presentation
                <br />
                • Easy to extend into real backend-powered repo analysis
              </div>
            </motion.div>
          )}

          {activeTab === 'dependencies' && (
            <motion.div
              key="dependencies"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="space-y-3"
            >
              {[
                'react',
                'framer-motion',
                'lucide-react',
                'tailwindcss',
                'react-router-dom',
              ].map((lib) => (
                <div
                  key={lib}
                  className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-4 text-neutral-200"
                >
                  <span>{lib}</span>
                  <ChevronRight className="h-4 w-4 text-neutral-600" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      <FilePreviewModal
        file={selectedFile}
        viewMode={fileViewMode}
        setViewMode={setFileViewMode}
        onClose={closeFileModal}
      />
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
          <AnimatePresence mode="wait">
            {stage === 'upload' && (
              <motion.div
                key="upload-layout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                      <Layers3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold tracking-tight text-white">RepoXray Intelligence Engine</div>
                      <div className="text-sm text-neutral-500">Advanced Repository Analysis Platform</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                      Secure
                    </div>
                    <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                      System Nominal
                    </div>
                  </div>
                </div>

                <UploadStage
                  repoUrl={repoUrl}
                  setRepoUrl={setRepoUrl}
                  onAnalyze={handleAnalyze}
                />
              </motion.div>
            )}

            {stage === 'results' && (
              <motion.div
                key="results-layout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {showLoadingInsideResults ? (
                  <LoadingBuffer onComplete={() => setShowLoadingInsideResults(false)} />
                ) : (
                  <ResultsStage />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}