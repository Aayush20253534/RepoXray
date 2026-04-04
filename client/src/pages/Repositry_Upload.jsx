import React, { useEffect, useState, useMemo } from 'react';
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
  Hash,
  BadgeInfo,
} from 'lucide-react';
import * as Icons from "lucide-react";
import Sidebar from '../components/sidebar';
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
const API_BASE_URL = "http://localhost:8000";

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

const buildDirectoryTreeFromFlatMap = (flatMap) => {
  if (!flatMap || typeof flatMap !== "object") return [];

  const root = [];

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    nodes.forEach((node) => {
      if (node.type === "folder" && Array.isArray(node.children)) {
        sortNodes(node.children);
      }
    });
  };

  Object.entries(flatMap).forEach(([filePath, meta]) => {
    const parts = filePath.split("/").filter(Boolean);
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;

      if (isLast) {
        currentLevel.push({
          type: "file",
          name: part,
          fullPath: filePath,
          summary: meta?.purpose || "No summary available.",
          overview: meta?.purpose || "No overview available.",
          responsibilities:
            meta?.key_functions?.length > 0
              ? meta.key_functions.map((fn) => `Contains or exposes: ${fn}`)
              : [
                  `Language: ${meta?.language || "Unknown"}`,
                  `Pattern: ${meta?.coding_pattern || "Unknown"}`
                ],
          insights: `Role: ${meta?.project_role || "other"} • Libraries: ${
            meta?.libraries_used?.length ? meta.libraries_used.join(", ") : "None detected"
          }`,
          code: "",
          metadata: meta,
        });
      } else {
        let existingFolder = currentLevel.find(
          (node) => node.type === "folder" && node.name === part
        );

        if (!existingFolder) {
          existingFolder = {
            type: "folder",
            name: part,
            children: [],
          };
          currentLevel.push(existingFolder);
        }

        currentLevel = existingFolder.children;
      }
    });
  });

  sortNodes(root);
  return root;
};

const getGraphNodeTypeLabel = (meta = {}) => {
  const role = (meta.project_role || "").toLowerCase();
  const language = (meta.language || "").toLowerCase();
  const ext = (meta.extension || "").toLowerCase();

  if (role === "frontend") return "Frontend";
  if (role === "backend") return "Backend";
  if (role === "database") return "Database";
  if (role === "config") return "Config";
  if (role === "docs") return "Docs";

  if ([".jsx", ".tsx", ".js", ".ts", ".css", ".html"].includes(ext)) return "Frontend";
  if ([".py", ".java", ".go", ".rs", ".php"].includes(ext)) return "Backend";
  if ([".json", ".yaml", ".yml", ".toml", ".env"].includes(ext)) return "Config";
  if (language.includes("markdown")) return "Docs";

  return "Module";
};

const getGraphNodeIconConfig = (meta = {}) => {
  const role = (meta.project_role || "").toLowerCase();
  const ext = (meta.extension || "").toLowerCase();

  // 🟠 FRONTEND
  if (role === "frontend" || [".jsx", ".tsx", ".js", ".ts", ".css", ".html"].includes(ext)) {
    return {
      icon: Layers3,
      iconWrapClass: 'border-orange-500/25 bg-orange-500/12',
      iconClass: 'text-orange-300',
    };
  }

  // 🔵 BACKEND
  if (role === "backend" || [".py", ".java", ".go", ".rs", ".php"].includes(ext)) {
    return {
      icon: Cpu,
      iconWrapClass: 'border-blue-500/25 bg-blue-500/12',
      iconClass: 'text-blue-300',
    };
  }

  // 🟢 EVERYTHING ELSE (config + db + docs + unknown)
  return {
    icon: FileJson,
    iconWrapClass: 'border-emerald-500/25 bg-emerald-500/12',
    iconClass: 'text-emerald-300',
  };
};
const buildReactFlowGraphFromBackend = (graphData) => {
  if (!graphData || typeof graphData !== "object") {
    return { nodes: [], edges: [] };
  }

  const backendNodes = graphData.nodes || {};
  const backendEdges = Array.isArray(graphData.edges) ? graphData.edges : [];
  const filePaths = Object.keys(backendNodes);

  if (filePaths.length === 0) {
    return { nodes: [], edges: [] };
  }

  const incomingCount = {};
  const outgoingMap = {};
  const connectedSet = new Set();

  filePaths.forEach((path) => {
    incomingCount[path] = 0;
    outgoingMap[path] = [];
  });

  backendEdges.forEach((edge) => {
    if (!edge?.source || !edge?.target) return;
    if (!backendNodes[edge.source] || !backendNodes[edge.target]) return;

    outgoingMap[edge.source].push(edge.target);
    incomingCount[edge.target] = (incomingCount[edge.target] || 0) + 1;

    connectedSet.add(edge.source);
    connectedSet.add(edge.target);
  });

  const rootCandidates = filePaths.filter(
    (path) => connectedSet.has(path) && (incomingCount[path] || 0) === 0
  );

  const connectedNodes = filePaths.filter((path) => connectedSet.has(path));
  const isolatedNodes = filePaths.filter((path) => !connectedSet.has(path));

  const visited = new Set();
  const levelMap = {};
  const subtreeWidthMap = {};

  const computeSubtreeWidth = (nodeId) => {
    if (subtreeWidthMap[nodeId]) return subtreeWidthMap[nodeId];

    const children = outgoingMap[nodeId] || [];
    const validChildren = children.filter((child) => !visited.has(child));

    if (validChildren.length === 0) {
      subtreeWidthMap[nodeId] = 1;
      return 1;
    }

    let total = 0;

    validChildren.forEach((child) => {
      visited.add(child);
      total += computeSubtreeWidth(child);
    });

    subtreeWidthMap[nodeId] = Math.max(total, 1);
    return subtreeWidthMap[nodeId];
  };

  rootCandidates.forEach((root) => {
    if (!visited.has(root)) {
      visited.add(root);
      computeSubtreeWidth(root);
    }
  });

  const remainingConnected = connectedNodes.filter((node) => !subtreeWidthMap[node]);
  remainingConnected.forEach((node) => {
    subtreeWidthMap[node] = 1;
  });

  const positionedNodes = [];
  const placedIds = new Set();

  const xUnit = 180;
  const yUnit = 130;
  const startX = 120;
  const startY = 80;

  const placeTree = (nodeId, centerX, level) => {
    if (placedIds.has(nodeId)) return;
    placedIds.add(nodeId);
    levelMap[nodeId] = level;

    const meta = backendNodes[nodeId] || {};
    const fileName = nodeId.split("/").pop();
    const iconConfig = getGraphNodeIconConfig(meta);

    positionedNodes.push({
      id: nodeId,
      type: "dependencyNode",
      position: {
        x: centerX,
        y: startY + level * yUnit,
      },
      data: {
        label: fileName,
        fullPath: nodeId,
        fileType: getGraphNodeTypeLabel(meta),
        ...iconConfig,
      },
      selected: false,
    });

    const children = (outgoingMap[nodeId] || []).filter((child) => !placedIds.has(child));
    if (children.length === 0) return;

    const totalWidth = children.reduce(
      (sum, child) => sum + (subtreeWidthMap[child] || 1),
      0
    );

    let cursorX = centerX - ((totalWidth - 1) * xUnit) / 2;

    children.forEach((child) => {
      const childWidth = subtreeWidthMap[child] || 1;
      const childCenterX = cursorX + ((childWidth - 1) * xUnit) / 2;
      placeTree(child, childCenterX, level + 1);
      cursorX += childWidth * xUnit;
    });
  };

  let forestCursorX = startX;

  rootCandidates.forEach((root) => {
    if (placedIds.has(root)) return;

    const widthUnits = subtreeWidthMap[root] || 1;
    const rootCenterX = forestCursorX + ((widthUnits - 1) * xUnit) / 2;
    placeTree(root, rootCenterX, 0);
    forestCursorX += widthUnits * xUnit + 140;
  });

  const unplacedConnected = connectedNodes.filter((node) => !placedIds.has(node));
  if (unplacedConnected.length > 0) {
    let extraX = forestCursorX;

    unplacedConnected.forEach((node, index) => {
      const meta = backendNodes[node] || {};
      const fileName = node.split("/").pop();
      const iconConfig = getGraphNodeIconConfig(meta);

      positionedNodes.push({
        id: node,
        type: "dependencyNode",
        position: {
          x: extraX,
          y: startY + (index % 3) * yUnit,
        },
        data: {
          label: fileName,
          fullPath: node,
          fileType: getGraphNodeTypeLabel(meta),
          ...iconConfig,
        },
        selected: false,
      });

      extraX += xUnit;
    });

    forestCursorX = extraX + 100;
  }

  if (isolatedNodes.length > 0) {
  const connectedBottomY =
    positionedNodes.length > 0
      ? Math.max(...positionedNodes.map((node) => node.position.y))
      : startY;

  const isolatedBaseY = connectedBottomY + 220;
  const isolatedCols = Math.min(4, Math.max(2, isolatedNodes.length));
  const isolatedXStart = startX + 40;

  isolatedNodes.forEach((nodeId, index) => {
    const meta = backendNodes[nodeId] || {};
    const fileName = nodeId.split("/").pop();
    const iconConfig = getGraphNodeIconConfig(meta);

    const col = index % isolatedCols;
    const row = Math.floor(index / isolatedCols);

    positionedNodes.push({
      id: nodeId,
      type: "dependencyNode",
      position: {
        x: isolatedXStart + col * 240,
        y: isolatedBaseY + row * 150,
      },
      data: {
        label: fileName,
        fullPath: nodeId,
        fileType: `${getGraphNodeTypeLabel(meta)} • Isolated`,
        ...iconConfig,
      },
      selected: false,
    });
  });
}
  const edges = backendEdges
    .filter((edge) => backendNodes[edge.source] && backendNodes[edge.target])
    .map((edge, index) => ({
      id: `edge-${index}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: "#8b5cf6",
        strokeWidth: 2.2,
        strokeDasharray: "7 7",
      },
    }));

  return { nodes: positionedNodes, edges };
};

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

const DirectoryExplorer = ({ treeData = [], onFileClick }) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-3">
      <div className="mb-3 flex items-center gap-2 border-b border-white/5 px-2 pb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
        <FolderTree className="h-4 w-4 text-purple-300" />
        Explorer
      </div>

      <div className="space-y-1">
        {treeData.length > 0 ? (
          treeData.map((node, index) => (
            <TreeNode
              key={`${node.name}-${index}`}
              node={node}
              depth={0}
              onFileClick={onFileClick}
            />
          ))
        ) : (
          <div className="px-3 py-6 text-sm text-neutral-500">
            No directory data available.
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================
// Stage 1: Upload Page
// ==========================

const UploadStage = ({ repoUrl, setRepoUrl, onAnalyze, apiError, isSubmitting }) => {
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
      className="mx-auto flex min-h-[calc(100vh-110px)] max-w-6xl items-start pt-0"
    >
      <div className="grid w-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-start pt-4">
          <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-purple-300">
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
          <div className="rounded-[26px] border border-white/5 bg-black/35 p-4 md:p-4">
            <div className="mb-6">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                GitHub Repository Link
              </div>

              <div className="relative">
                <Icons.GitBranch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/70 py-4 pl-12 pr-4 text-white outline-none transition-all placeholder:text-neutral-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {apiError && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {apiError}
                </div>
              )}
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
                  <span>3. Produce semantic code summary</span>
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
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-3 text-neutral-300 transition-all hover:bg-neutral-800 disabled:opacity-50"
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste Demo
              </button>

              <button
                onClick={() => onAnalyze(repoUrl)}
                disabled={!isValidRepo || isSubmitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? "Sending to Backend..." : "Analyze Repository"}
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

const LoadingBuffer = ({ statusText = "Processing repository..." }) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    "Cloning repository core...",
    "Reading project skeleton...",
    "Indexing source files...",
    "Tracing dependency signatures...",
    "Composing code summary...",
    statusText,
  ];

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2;
        if (next >= 100) {
          return 0; // loop forever
        }
        return next;
      });
    }, 90);

    const statusTimer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 1200);

    return () => {
      clearInterval(progressTimer);
      clearInterval(statusTimer);
    };
  }, [statusText, statuses.length]);

  const orbitDots = Array.from({ length: 10 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[calc(100vh-110px)] items-center justify-center"
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-black/30 px-6 py-14 backdrop-blur-2xl md:px-12">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/12 blur-[150px]" />
          <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/12 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_58%)]" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative flex h-[360px] w-[360px] items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.2, 0.35, 0.2] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border border-purple-500/10 bg-purple-500/5 blur-[2px]"
            />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-purple-500/30"
            >
              <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-purple-400 shadow-[0_0_22px_rgba(168,85,247,0.95)]" />
              <div className="absolute left-8 top-[22%] h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_16px_rgba(217,70,239,0.8)]" />
            </motion.div>

            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[24px] rounded-full border border-cyan-500/25"
            >
              <div className="absolute right-10 top-[12%] h-3.5 w-3.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.95)]" />
              <div className="absolute bottom-8 left-[18%] h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.8)]" />
            </motion.div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[50px] rounded-full border border-blue-500/20 border-dashed"
            >
              <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.9)]" />
            </motion.div>

            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[78px] rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(168,85,247,0.95) 0deg, rgba(34,211,238,0.85) 90deg, transparent 120deg, transparent 220deg, rgba(59,130,246,0.85) 270deg, rgba(168,85,247,0.95) 320deg, transparent 360deg)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 8px), white calc(100% - 7px))",
                mask:
                  "radial-gradient(farthest-side, transparent calc(100% - 8px), white calc(100% - 7px))",
              }}
            />

            {orbitDots.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.25, 0.8, 0.25],
                }}
                transition={{
                  duration: 2 + i * 0.18,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.12,
                }}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${2 + (i % 3)}px`,
                  height: `${2 + (i % 3)}px`,
                  top: `${18 + ((i * 7) % 64)}%`,
                  left: `${14 + ((i * 9) % 70)}%`,
                  boxShadow: "0 0 12px rgba(255,255,255,0.45)",
                }}
              />
            ))}

            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.8, 0.55] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute h-32 w-32 rounded-full bg-purple-500/20 blur-3xl"
            />

            <motion.div
              animate={{ scale: [1, 1.16, 1], opacity: [0.35, 0.55, 0.35] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute h-44 w-44 rounded-full bg-cyan-500/12 blur-3xl"
            />

            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full border border-white/10 bg-white/[0.05] shadow-[0_0_60px_rgba(168,85,247,0.15)] backdrop-blur-xl"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/20 via-cyan-500/10 to-blue-500/20"
              >
                <Orbit className="h-8 w-8 text-white" />
              </motion.div>
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.35 }}
              className="mt-5 text-center text-sm font-medium text-purple-300 md:text-base"
            >
              {statuses[statusIndex]}
            </motion.p>
          </AnimatePresence>

          <div className="mt-8 w-full max-w-xl">
            <div className="h-2.5 overflow-hidden rounded-full border border-white/5 bg-neutral-900">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.08 }}
                className="relative h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-blue-500"
              >
                <div className="absolute inset-y-0 right-0 w-16 bg-white/20 blur-md" />
              </motion.div>
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

const [question, setQuestion] = useState('');
const [submittedQuestion, setSubmittedQuestion] = useState('');
const [showAnswer, setShowAnswer] = useState(false);

const generatedAnswer = useMemo(() => {
  if (!submittedQuestion.trim()) return '';

  const q = submittedQuestion.toLowerCase();

  if (q.includes('what does this file do') || q.includes('purpose') || q.includes('what is this')) {
    return overview;
  }

  if (q.includes('responsibil') || q.includes('tasks') || q.includes('role')) {
    return responsibilities.join(' • ');
  }

  if (q.includes('important') || q.includes('why') || q.includes('insight')) {
    return insights;
  }

  if (q.includes('summary') || q.includes('one line')) {
    return file.summary;
  }

  if (q.includes('code') || q.includes('lines')) {
    return `${file.name} contains approximately ${codeLines} lines of code in this preview and is part of the repository intelligence flow.`;
  }

  return `Based on this file, ${file.name} is mainly responsible for ${file.summary.toLowerCase()} ${overview}`;
}, [submittedQuestion, overview, responsibilities, insights, file, codeLines]);

const handleAsk = () => {
  if (!question.trim()) return;
  setSubmittedQuestion(question);
  setShowAnswer(true);
};
  return (
    <AnimatePresence>
      <motion.div
  key="file-modal"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-y-0 right-0 z-[100] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-md"
  style={{ left: 'var(--sidebar-width, 78px)' }}
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

<div className="overflow-hidden rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(34,211,238,0.07),rgba(255,255,255,0.02))]">
  <div className="border-b border-white/8 px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10">
        <Search className="h-4 w-4 text-cyan-300" />
      </div>

      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">Ask about this file</div>
        <div className="text-xs text-neutral-400">
          Type a question and press Enter or click Ask
        </div>
      </div>
    </div>
  </div>

  <div className="p-4">
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAsk();
            }
          }}
          placeholder="What does this file do? Why is it important? What are its responsibilities?"
          className="w-full rounded-2xl border border-white/10 bg-[#0b0f17] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-neutral-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      <button
        type="button"
        onClick={handleAsk}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-300/40 hover:bg-cyan-500/15 hover:text-white"
      >
        <ArrowRight className="h-4 w-4" />
        Ask
      </button>
    </div>

    <div className="mt-3 flex flex-wrap gap-2">
      {['What does this file do?', 'What are its responsibilities?', 'Why is it important?'].map((sample) => (
        <button
          key={sample}
          type="button"
          onClick={() => {
            setQuestion(sample);
            setSubmittedQuestion(sample);
            setShowAnswer(true);
          }}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-neutral-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-white"
        >
          {sample}
        </button>
      ))}
    </div>

    {showAnswer && submittedQuestion.trim() && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border border-cyan-500/20 bg-[#0b1220] p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Answer
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-neutral-400">
            {file.name}
          </div>
        </div>

        <p className="text-sm leading-7 text-neutral-200">
          {generatedAnswer}
        </p>
      </motion.div>
    )}
  </div>
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
               <div className="mb-4 flex items-center justify-between">

  {/* File Name Card (LEFT) */}
  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.3 text-[11px] text-emerald-400">
    {file.name}
  </div>

  {/* Lines Card (RIGHT) */}
  <div className="rounded-3xl border border-purple-500/20 bg-purple-500/10 px-3 py-0.3 text-[11px] text-purple-300">
    {codeLines} lines
  </div>

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


const DependencyNode = ({ data, selected }) => {
  const Icon = data.icon || Cpu;

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      className={`w-[180px] cursor-pointer rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all duration-300 ${
        selected
          ? 'border-cyan-400/50 bg-[#101826] shadow-[0_0_30px_rgba(34,211,238,0.18)]'
          : 'border-white/10 bg-[#0d1117]/95 shadow-[0_10px_35px_rgba(0,0,0,0.32)] hover:border-cyan-400/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.10)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-[#0d1117] !bg-purple-400"
      />

      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            data.iconWrapClass || 'border-purple-500/20 bg-purple-500/10'
          }`}
        >
          <Icon className={`h-4 w-4 ${data.iconClass || 'text-purple-300'}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {data.label}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
            {data.fileType}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-[#0d1117] !bg-cyan-400"
      />
    </motion.div>
  );
};

const dependencyNodeTypes = {
  dependencyNode: DependencyNode,
};

const dependencyNodesData = [
  {
    id: 'root',
    type: 'dependencyNode',
    position: { x: 520, y: 20 },
    data: {
      label: 'App.jsx',
      fileType: 'Frontend',
      icon: Layers3,
      iconWrapClass: 'border-purple-500/20 bg-purple-500/10',
      iconClass: 'text-purple-300',
    },
  },
  {
    id: 'react',
    type: 'dependencyNode',
    position: { x: 60, y: 210 },
    data: {
      label: 'react',
      fileType: 'Frontend',
      icon: Cpu,
      iconWrapClass: 'border-cyan-500/20 bg-cyan-500/10',
      iconClass: 'text-cyan-300',
    },
  },
  {
    id: 'router',
    type: 'dependencyNode',
    position: { x: 380, y: 210 },
    data: {
      label: 'react-router-dom',
      fileType: 'Frontend',
      icon: ArrowRight,
      iconWrapClass: 'border-blue-500/20 bg-blue-500/10',
      iconClass: 'text-blue-300',
    },
  },
  {
    id: 'motion',
    type: 'dependencyNode',
    position: { x: 700, y: 210 },
    data: {
      label: 'framer-motion',
      fileType: 'Frontend',
      icon: Orbit,
      iconWrapClass: 'border-fuchsia-500/20 bg-fuchsia-500/10',
      iconClass: 'text-fuchsia-300',
    },
  },
  {
    id: 'xyflow',
    type: 'dependencyNode',
    position: { x: 1020, y: 210 },
    data: {
      label: '@xyflow/react',
      fileType: 'Frontend',
      icon: Network,
      iconWrapClass: 'border-emerald-500/20 bg-emerald-500/10',
      iconClass: 'text-emerald-300',
    },
  },
  {
    id: 'lucide',
    type: 'dependencyNode',
    position: { x: 220, y: 430 },
    data: {
      label: 'lucide-react',
      fileType: 'Frontend',
      icon: BadgeInfo,
      iconWrapClass: 'border-amber-500/20 bg-amber-500/10',
      iconClass: 'text-amber-300',
    },
  },
  {
    id: 'tailwind',
    type: 'dependencyNode',
    position: { x: 540, y: 430 },
    data: {
      label: 'tailwindcss',
      fileType: 'Frontend',
      icon: Hash,
      iconWrapClass: 'border-pink-500/20 bg-pink-500/10',
      iconClass: 'text-pink-300',
    },
  },
  {
    id: 'pages',
    type: 'dependencyNode',
    position: { x: 860, y: 430 },
    data: {
      label: 'RepositoryResultsPage.jsx',
      fileType: 'Frontend',
      icon: FolderTree,
      iconWrapClass: 'border-indigo-500/20 bg-indigo-500/10',
      iconClass: 'text-indigo-300',
    },
  },
];
const dependencyEdgesData = [
  {
    id: 'e-root-react',
    source: 'root',
    target: 'react',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#8b5cf6',
      strokeWidth: 2.2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-root-router',
    source: 'root',
    target: 'router',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#38bdf8',
      strokeWidth: 2.2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-root-motion',
    source: 'root',
    target: 'motion',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#c084fc',
      strokeWidth: 2.2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-root-xyflow',
    source: 'root',
    target: 'xyflow',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#34d399',
      strokeWidth: 2.2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-react-lucide',
    source: 'react',
    target: 'lucide',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#f59e0b',
      strokeWidth: 2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-router-pages',
    source: 'router',
    target: 'pages',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#6366f1',
      strokeWidth: 2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-motion-tailwind',
    source: 'motion',
    target: 'tailwind',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#ec4899',
      strokeWidth: 2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-xyflow-pages',
    source: 'xyflow',
    target: 'pages',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#10b981',
      strokeWidth: 2,
      strokeDasharray: '7 7',
    },
  },
  {
    id: 'e-tailwind-pages',
    source: 'tailwind',
    target: 'pages',
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: '#a855f7',
      strokeWidth: 2,
      strokeDasharray: '7 7',
    },
  },
];
const ResultsStage = ({ repoTreeData = [], repoGraphData = { nodes: [], edges: [] } }) => {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileViewMode, setFileViewMode] = useState('summary');
 const [selectedDependencyNode, setSelectedDependencyNode] = useState(null);

const initialNodes = useMemo(
  () =>
    (repoGraphData?.nodes || []).map((node) => ({
      ...node,
      selected: false,
    })),
  [repoGraphData]
);

const initialEdges = useMemo(() => repoGraphData?.edges || [], [repoGraphData]);

const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

useEffect(() => {
  setFlowNodes((nodes) =>
    nodes.map((node) => ({
      ...node,
      selected: node.id === selectedDependencyNode,
    }))
  );
}, [selectedDependencyNode, setFlowNodes]);

useEffect(() => {
  setFlowNodes(
    (repoGraphData?.nodes || []).map((node) => ({
      ...node,
      selected: node.id === selectedDependencyNode,
    }))
  );

  setFlowEdges(repoGraphData?.edges || []);
}, [repoGraphData, selectedDependencyNode, setFlowNodes, setFlowEdges]);

const resetDependencyGraph = () => {
  setSelectedDependencyNode(null);

  setFlowNodes(
    (repoGraphData?.nodes || []).map((node) => ({
      ...node,
      selected: false,
    }))
  );

  setFlowEdges(repoGraphData?.edges || []);
};
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
              <DirectoryExplorer treeData={repoTreeData} onFileClick={openFileModal} />
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
    className="space-y-4"
  >
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
  <div>
    <div className="text-sm font-semibold text-white">Interactive Dependency Tree</div>
    <div className="mt-1 text-sm text-neutral-400">
      Pan, zoom, drag nodes freely, and reset the layout anytime.
    </div>
  </div>

  <div className="flex items-center gap-2">
    <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
      <Network className="h-3.5 w-3.5 text-cyan-300" />
      Tree Mode
    </div>

    <button
      type="button"
      onClick={resetDependencyGraph}
      className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-white"
    >
      <Orbit className="h-3.5 w-3.5" />
      Reset Graph
    </button>
  </div>
</div>
<div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-[#07090f]">
  <div className="h-[620px] w-full">
    {flowNodes.length === 0 ? (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <div className="text-base font-semibold text-white">
            Dependency graph is still processing
          </div>
          <div className="mt-2 text-sm text-neutral-500">
            Backend graph data is still processing, or failed to generate.
          </div>
        </div>
      </div>
    ) : (
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={dependencyNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        minZoom={0.5}
        maxZoom={1.8}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        panOnScroll={false}
        selectionOnDrag={false}
        onNodeClick={(_, node) => setSelectedDependencyNode(node.id)}
        onPaneClick={() => setSelectedDependencyNode(null)}
      >
        <Background gap={22} size={1} color="#1f2937" />
      </ReactFlow>
    )}
  </div>
</div>
    </div>
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
  const [repoTreeData, setRepoTreeData] = useState([]);
  const [stage, setStage] = useState('upload');
  const [repoUrl, setRepoUrl] = useState('');
  const [showLoadingInsideResults, setShowLoadingInsideResults] = useState(true);
  const [repoId, setRepoId] = useState(null);
  const [repoGraphData, setRepoGraphData] = useState({ nodes: [], edges: [] });
  const [repoStatus, setRepoStatus] = useState(null);
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!repoId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(
      `${API_BASE_URL.replace("http", "ws")}/api/ws/status/${repoId}?token=${token}`
    );

    ws.onmessage = async (event) => {
      try {
        const statusInfo = JSON.parse(event.data);
        const currentStatus = statusInfo.status;

        setRepoStatus(currentStatus || "processing");
if (currentStatus === "tree_ready") {
  await fetchRepoTree(repoId);
  setShowLoadingInsideResults(false);
}

if (currentStatus === "success") {
  await fetchRepoTree(repoId);
  await fetchRepoGraph(repoId);
  setShowLoadingInsideResults(false);
}
        if (currentStatus === "error" || currentStatus === "not_found") {
          setApiError(statusInfo.detail || "Repository processing failed.");
          setShowLoadingInsideResults(false);
          setStage("upload");
        }
      } catch (err) {
        console.error("WebSocket parse error:", err);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket connection failed.");
    };

    return () => {
      ws.close();
    };
  }, [repoId]);

const fetchRepoTree = async (incomingRepoId) => {
  const token = localStorage.getItem("token");
  if (!token || !incomingRepoId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/${incomingRepoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to fetch repository tree.");
    }

    const nestedTree = buildDirectoryTreeFromFlatMap(data);
    setRepoTreeData(nestedTree);
  } catch (error) {
    console.error("Tree fetch error:", error);
    setRepoTreeData([]);
  }
};

const fetchRepoGraph = async (incomingRepoId) => {
  const token = localStorage.getItem("token");
  if (!token || !incomingRepoId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/graph/${incomingRepoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to fetch repository graph.");
    }

    const flowGraph = buildReactFlowGraphFromBackend(data);
    setRepoGraphData(flowGraph);
  } catch (error) {
    console.error("Graph fetch error:", error);
    setRepoGraphData({ nodes: [], edges: [] });
  }
};

  const handleAnalyze = async (incomingRepoUrl) => {
    const cleanUrl = incomingRepoUrl.trim();
    const token = localStorage.getItem("token");

    if (!cleanUrl) {
      setApiError("Please enter a GitHub repository URL.");
      return;
    }

    if (!cleanUrl.includes("github.com/")) {
      setApiError("Please enter a valid GitHub repository URL.");
      return;
    }

    if (!token) {
      setApiError("You are not logged in. Please login again.");
      window.location.href = "/";
      return;
    }

    try {
      setApiError("");
      setIsSubmitting(true);
      setRepoStatus("Submitting repository...");
      setStage("results");
      setShowLoadingInsideResults(true);
      setRepoId(null);
      setRepoTreeData([]);
      setRepoGraphData({ nodes: [], edges: [] });

      const response = await fetch(`${API_BASE_URL}/api/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          github_url: cleanUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send repository to backend");
      }

      setRepoId(data.repo_id);
      setRepoStatus(data.status || "queued");

      console.log("Ingest response:", data);
    } catch (error) {
      console.error("Analyze error:", error);
      setApiError(error.message || "Something went wrong while analyzing repository.");
      setShowLoadingInsideResults(false);
      setStage("upload");
    } finally {
      setIsSubmitting(false);
    }
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
  className="relative z-10 transition-all duration-300"
  style={{ marginLeft: 'var(--sidebar-width, 78px)' }}
>
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-8 md:py-6">
          <AnimatePresence mode="wait">
            {stage === 'upload' && (
              <motion.div
                key="upload-layout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-2 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                      <Layers3 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col leading-tight gap-[8px]">
  <div className="text-lg font-bold text-white">
    RepoXray Intelligence Engine
  </div>
  <div className="text-xs text-neutral-500 -mt-1">
    Advanced Repository Analysis Platform
  </div>
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
  apiError={apiError}
  isSubmitting={isSubmitting}
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
  <LoadingBuffer statusText={repoStatus || "Backend processing in progress..."} />
) : (
  <ResultsStage
  repoTreeData={repoTreeData}
  repoGraphData={repoGraphData}
/>
)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}