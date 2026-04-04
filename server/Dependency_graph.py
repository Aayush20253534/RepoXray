import os
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Set

# --- REGEX PATTERNS FOR IMPORTS ---
# Python: Matches "import X" and "from X import Y"
PY_IMPORT_RE = re.compile(r'^\s*(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.,\s]+))', re.MULTILINE)

# JS/TS: Matches "import ... from 'X'" and "require('X')"
JS_IMPORT_RE = re.compile(r'(?:import\s+.*?from\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\))')

def extract_imports(filepath: Path, file_content: str, language: str) -> List[str]:
    """Extracts raw import strings from file content based on language."""
    raw_imports = []
    
    if language == "Python":
        matches = PY_IMPORT_RE.findall(file_content)
        for match in matches:
            # match is a tuple: (from_import, normal_import)
            if match[0]: # from X import Y
                raw_imports.append(match[0])
            if match[1]: # import X, Y
                # Handle comma separated imports
                imports = [i.strip() for i in match[1].split(',')]
                raw_imports.extend(imports)
                
    elif language in ["JavaScript", "TypeScript", "React/JS", "React/TS"]:
        matches = JS_IMPORT_RE.findall(file_content)
        for match in matches:
            # match is a tuple: (import_from, require)
            raw_imports.append(match[0] or match[1])

    return raw_imports

def resolve_import_path(source_file: str, raw_import: str, repo_keys: Set[str], language: str) -> str:
    """Attempts to match a raw import string to an actual file path in the repository."""
    source_dir = os.path.dirname(source_file)
    
    if language == "Python":
        # Convert 'database.models' to 'database/models'
        base_path = raw_import.replace('.', '/')
        possible_paths = [
            f"{base_path}.py",
            f"{base_path}/__init__.py",
            f"{source_dir}/{base_path}.py" if source_dir else f"{base_path}.py"
        ]
        
    elif language in ["JavaScript", "TypeScript", "React/JS", "React/TS"]:
        if raw_import.startswith('.'):
            # Resolve relative path
            resolved_base = os.path.normpath(os.path.join(source_dir, raw_import)).replace('\\', '/')
        else:
            # Likely an external node_module or absolute alias, but we'll check just in case
            resolved_base = raw_import
            
        possible_paths = [
            f"{resolved_base}.js", f"{resolved_base}.ts",
            f"{resolved_base}.jsx", f"{resolved_base}.tsx",
            f"{resolved_base}/index.js", f"{resolved_base}/index.ts",
            f"{resolved_base}/index.jsx", f"{resolved_base}/index.tsx",
            resolved_base # In case it already has an extension
        ]
    else:
        return None

    # Check if any of our guessed paths actually exist in the repo
    for path in possible_paths:
        # Normalize to posix for dictionary key lookup
        clean_path = path.lstrip('./')
        if clean_path in repo_keys:
            return clean_path
            
    return None

def build_dependency_graph(repo_id: str, base_path_str: str, flat_repo_map: Dict[str, Any], output_dir: str = "./dependency_graphs") -> str:
    """
    Scans the repository for imports, builds nodes and edges, and saves to JSON.
    """
    base_path = Path(base_path_str)
    repo_keys = set(flat_repo_map.keys())
    
    nodes = []
    edges = []
    
    print(f"\n[GRAPH ENGINE] Building dependency graph for {repo_id}...")
    
    # 1. Build Nodes
    for file_path, metadata in flat_repo_map.items():
        nodes.append({
            "id": file_path,
            "data": metadata
        })
        
    # 2. Build Edges
    for source_file, metadata in flat_repo_map.items():
        full_path = base_path / source_file
        language = metadata.get("language", "Unknown")
        
        # Only parse supported text files
        if language not in ["Python", "JavaScript", "TypeScript", "React/JS", "React/TS"]:
            continue
            
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            raw_imports = extract_imports(full_path, content, language)
            
            for imp in raw_imports:
                target_file = resolve_import_path(source_file, imp, repo_keys, language)
                
                if target_file and target_file != source_file:
                    edges.append({
                        "id": f"{source_file}->{target_file}",
                        "source": source_file,
                        "target": target_file,
                        "type": "import"
                    })
        except Exception as e:
            print(f"  [GRAPH ENGINE ERROR] Could not process edges for {source_file}: {e}")

    # 3. Assemble and Save
    graph_data = {
        "repo_id": repo_id,
        "nodes": nodes,
        "edges": edges
    }
    
    os.makedirs(output_dir, exist_ok=True)
    output_file = Path(output_dir) / f"{repo_id}_graph.json"
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=4)
        
    print(f"[GRAPH ENGINE COMPLETE] Graph saved to: {output_file} ({len(nodes)} nodes, {len(edges)} edges)")
    return str(output_file)