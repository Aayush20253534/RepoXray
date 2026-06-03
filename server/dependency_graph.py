import os
import re
import ast
import json
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional


# ---------------------------------------------------------------------------
# Language-specific import extractors
# ---------------------------------------------------------------------------

def _extract_python_imports(source: str) -> List[str]:
    imports: List[str] = []
    try:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(("." * (node.level or 0)) + node.module)
                elif node.level:
                    # bare relative: "from . import something"
                    imports.append("." * node.level)
    except SyntaxError:
        for m in re.finditer(r"^\s*(?:import|from)\s+([\w.]+)", source, re.MULTILINE):
            imports.append(m.group(1))
    return imports


def _extract_js_ts_imports(source: str) -> List[str]:
    imports: List[str] = []
    # ES: import ... from 'x'  or  import 'x'
    for m in re.finditer(r"""import\s+(?:.*?from\s+)?['"]([^'"]+)['"]""", source, re.DOTALL):
        imports.append(m.group(1))
    # require('x') / import('x')
    for m in re.finditer(r"""(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)""", source):
        imports.append(m.group(1))
    # export ... from 'x'
    for m in re.finditer(r"""export\s+.*?from\s+['"]([^'"]+)['"]""", source, re.DOTALL):
        imports.append(m.group(1))
    return imports


def _extract_java_imports(source: str) -> List[str]:
    return [m.group(1) for m in re.finditer(r"^\s*import\s+([\w.]+)\s*;", source, re.MULTILINE)]


def _extract_go_imports(source: str) -> List[str]:
    imports: List[str] = []
    for m in re.finditer(r'import\s+"([^"]+)"', source):
        imports.append(m.group(1))
    block = re.search(r'import\s*\(([^)]+)\)', source, re.DOTALL)
    if block:
        for m in re.finditer(r'"([^"]+)"', block.group(1)):
            imports.append(m.group(1))
    return imports


def _extract_rust_imports(source: str) -> List[str]:
    return [m.group(1).replace("::", ".") for m in re.finditer(r"^\s*(?:use|mod)\s+([\w:]+)", source, re.MULTILINE)]


def _extract_css_imports(source: str) -> List[str]:
    return [m.group(1) for m in re.finditer(r'@import\s+[\'"]([^\'"]+)[\'"]', source)]


_EXTRACTORS = {
    ".py":   _extract_python_imports,
    ".js":   _extract_js_ts_imports,
    ".jsx":  _extract_js_ts_imports,
    ".ts":   _extract_js_ts_imports,
    ".tsx":  _extract_js_ts_imports,
    ".mjs":  _extract_js_ts_imports,
    ".cjs":  _extract_js_ts_imports,
    ".java": _extract_java_imports,
    ".go":   _extract_go_imports,
    ".rs":   _extract_rust_imports,
    ".css":  _extract_css_imports,
    ".scss": _extract_css_imports,
}

_MAX_READ_BYTES = 100_000

# Common path aliases — we strip these prefixes and try the remainder
_ALIAS_PREFIXES = ("@/", "~/", "@components/", "@pages/", "@utils/", "@hooks/",
                   "@api/", "@lib/", "@store/", "@assets/", "@styles/", "@types/")

# Candidate extensions to try when resolving bare specifiers
_RESOLVE_EXTS = [
    "", ".js", ".jsx", ".ts", ".tsx", ".mjs",
    "/index.js", "/index.jsx", "/index.ts", "/index.tsx",
    ".py", ".go", ".java", ".rs",
]


# ---------------------------------------------------------------------------
# Path resolver
# ---------------------------------------------------------------------------

def _normalise(path: str) -> str:
    return path.replace("\\", "/").lstrip("./")


def _try_candidates(candidates: List[str], all_paths: Set[str]) -> Optional[str]:
    for c in candidates:
        c = _normalise(c)
        if c in all_paths:
            return c
    return None


def _resolve(
    specifier: str,
    source_file: str,
    all_paths: Set[str],
    source_ext: str,
) -> Optional[str]:
    """Map a raw import specifier to an internal repo file path."""

    # 1. Relative path (./x, ../x)
    if specifier.startswith("."):
        base = str(Path(source_file).parent / specifier)
        candidates = [base + ext for ext in _RESOLVE_EXTS]
        hit = _try_candidates(candidates, all_paths)
        if hit:
            return hit

    # 2. Path alias (@/, ~/, @components/, …)
    for alias in _ALIAS_PREFIXES:
        if specifier.startswith(alias):
            remainder = specifier[len(alias):]
            # search the repo for paths ending with remainder (+ extensions)
            for ext in _RESOLVE_EXTS:
                suffix = remainder + ext
                for known in all_paths:
                    if known.endswith("/" + suffix) or known == suffix:
                        return known
            break

    # 3. Python: bare module name  (database → database.py)
    if source_ext == ".py":
        src_dir = str(Path(source_file).parent)

        # Relative Python import (. or ..)
        if specifier.startswith("."):
            dots = len(specifier) - len(specifier.lstrip("."))
            module_part = specifier.lstrip(".")
            base_dir = Path(source_file)
            for _ in range(dots):
                base_dir = base_dir.parent
            if module_part:
                candidate = str(base_dir / module_part.replace(".", "/")) + ".py"
                hit = _try_candidates([candidate], all_paths)
                if hit:
                    return hit
            return None

        bare = specifier.split(".")[0]  # take first segment of dotted name
        # Same directory first
        for known in all_paths:
            if known.endswith("/" + bare + ".py") or known == bare + ".py":
                return known
        # Dotted module: mypackage.module → mypackage/module.py
        as_path = specifier.replace(".", "/") + ".py"
        hit = _try_candidates([as_path], all_paths)
        if hit:
            return hit

    # 4. Slash-separated non-relative JS path (components/Button, src/utils/api)
    if "/" in specifier and not specifier.startswith(".") and not specifier.startswith("@"):
        for ext in _RESOLVE_EXTS:
            suffix = specifier.lstrip("/") + ext
            hit = _try_candidates([suffix], all_paths)
            if hit:
                return hit
            # Also try matching the tail of any known path
            for known in all_paths:
                if known.endswith("/" + suffix):
                    return known

    return None


# ---------------------------------------------------------------------------
# Heuristic layer: infer edges from file metadata when source is unavailable
# ---------------------------------------------------------------------------

_HEURISTIC_PAIRS: List[Tuple[str, str]] = [
    # (source pattern, target pattern) — checked against file names
    ("index",    "app"),
    ("app",      "router"),
    ("router",   "routes"),
    ("main",     "app"),
    ("server",   "db"),
    ("server",   "database"),
    ("server",   "config"),
    ("routes",   "controllers"),
    ("routes",   "middleware"),
    ("controllers", "models"),
    ("controllers", "services"),
    ("services", "models"),
    ("models",   "database"),
    ("models",   "db"),
    ("middleware","auth"),
    ("auth",     "database"),
    ("auth",     "models"),
    ("seed",     "models"),
    ("seed",     "database"),
]


def _heuristic_edges(
    nodes_data: Dict,
    existing_edges: Set[Tuple[str, str]],
) -> List[Dict[str, str]]:
    """
    For files whose source code could not be read (large / binary / missing),
    infer plausible edges from their names and metadata.
    Only adds edges that don't already exist.
    """
    new_edges: List[Dict[str, str]] = []

    for src_path, src_meta in nodes_data.items():
        src_name = Path(src_path).stem.lower()
        src_role = (src_meta.get("project_role") or "").lower()
        src_libs  = [l.lower() for l in src_meta.get("libraries_used") or []]

        for tgt_path, tgt_meta in nodes_data.items():
            if src_path == tgt_path:
                continue
            tgt_name = Path(tgt_path).stem.lower()
            tgt_role = (tgt_meta.get("project_role") or "").lower()
            key = (src_path, tgt_path)
            if key in existing_edges:
                continue

            # Rule 1: named heuristic pairs
            for (s_pat, t_pat) in _HEURISTIC_PAIRS:
                if s_pat in src_name and t_pat in tgt_name:
                    new_edges.append({"source": src_path, "target": tgt_path})
                    existing_edges.add(key)
                    break

            # Rule 2: a file lists another internal file's stem in libraries_used
            if tgt_name in src_libs and key not in existing_edges:
                new_edges.append({"source": src_path, "target": tgt_path})
                existing_edges.add(key)

            # Rule 3: frontend → backend entry point (index.js / main.py / server.js)
            if (src_role == "frontend" and tgt_role == "backend"
                    and tgt_name in ("main", "server", "index", "app")
                    and key not in existing_edges):
                new_edges.append({"source": src_path, "target": tgt_path})
                existing_edges.add(key)

    return new_edges


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def build_dependency_graph(
    repo_id: str,
    data_dir: str = "./Repo_Codes_data",
    clone_base: str = "./cloned_repos",
) -> str:
    input_nodes_path = Path(data_dir) / f"{repo_id}.json"
    output_graph_path = Path(data_dir) / f"{repo_id}_graph.json"
    clone_path = Path(clone_base) / repo_id

    if not input_nodes_path.exists():
        raise FileNotFoundError(
            f"[ERROR] Nodes file not found: {input_nodes_path}"
        )

    with open(input_nodes_path, "r", encoding="utf-8") as f:
        nodes_data: Dict = json.load(f)

    all_paths: Set[str] = set(nodes_data.keys())
    edges: List[Dict[str, str]] = []
    seen_edges: Set[Tuple[str, str]] = set()

    print(f"\n[STATIC ANALYSIS] Building dependency graph for {repo_id} "
          f"({len(all_paths)} files)…")

    files_parsed = 0
    files_missing = 0

    for file_path, meta in nodes_data.items():
        ext = (meta.get("extension") or Path(file_path).suffix).lower()
        extractor = _EXTRACTORS.get(ext)
        if extractor is None:
            continue

        # Try Windows-style path as well (cloned_repos\id\...)
        full_path = clone_path / file_path
        if not full_path.exists():
            # try replacing forward slashes with OS sep
            alt = clone_path / Path(file_path.replace("/", os.sep))
            if alt.exists():
                full_path = alt
            else:
                files_missing += 1
                continue

        try:
            raw = full_path.read_bytes()[:_MAX_READ_BYTES].decode("utf-8", errors="ignore")
        except Exception:
            files_missing += 1
            continue

        files_parsed += 1
        specifiers = extractor(raw)

        for spec in specifiers:
            target = _resolve(spec, file_path, all_paths, ext)
            if target and target != file_path:
                key = (file_path, target)
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append({"source": file_path, "target": target})

    print(f"[STATIC ANALYSIS] Parsed {files_parsed} files, "
          f"{files_missing} missing/unreadable.")
    print(f"[STATIC ANALYSIS] Static pass found {len(edges)} edges.")

    # --- Heuristic pass to fill in gaps ---
    heuristic = _heuristic_edges(nodes_data, seen_edges)
    if heuristic:
        print(f"[HEURISTIC] Added {len(heuristic)} inferred edges.")
        edges.extend(heuristic)

    total = len(edges)
    final_graph = {"nodes": nodes_data, "edges": edges}

    with open(output_graph_path, "w", encoding="utf-8") as f:
        json.dump(final_graph, f, indent=4)

    print(f"[SUCCESS] Total {total} dependency edges.")
    print(f"[SUCCESS] Graph saved → {output_graph_path}")
    return str(output_graph_path)


# ---------------------------------------------------------------------------
# Standalone test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    repo_id = sys.argv[1] if len(sys.argv) > 1 else "test_repo"
    try:
        build_dependency_graph(repo_id)
    except Exception as e:
        print(f"Test failed: {e}")