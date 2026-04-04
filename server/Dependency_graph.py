import os
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Set

# --- REGEX PATTERNS FOR IMPORTS ---
PY_IMPORT_RE = re.compile(r'^\s*(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.,\s]+))', re.MULTILINE)
JS_IMPORT_RE = re.compile(r'(?:import\s+.*?from\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\))')

def scan_directory(base_path: Path) -> Dict[str, Any]:
    """
    NEW: Automatically crawls the directory to find all valid code files,
    ignoring common hidden/build folders to prevent noise.
    """
    repo_map = {}
    ignore_dirs = {'node_modules', '__pycache__', '.git', 'venv', 'env', 'dist', 'build'}
    
    for path in base_path.rglob('*'):
        if path.is_file():
            # Skip ignored directories and hidden folders
            if any(part in ignore_dirs or part.startswith('.') for part in path.parts):
                continue
            
            # Convert to a clean POSIX path (forward slashes) relative to the root folder
            rel_path = path.relative_to(base_path).as_posix()
            ext = path.suffix.lower()
            
            lang = "Unknown"
            if ext == '.py': lang = "Python"
            elif ext in ['.js', '.jsx']: lang = "JavaScript"
            elif ext in ['.ts', '.tsx']: lang = "TypeScript"
            
            if lang != "Unknown":
                repo_map[rel_path] = {"language": lang, "type": "file"}
                
    return repo_map

def extract_imports(file_content: str, language: str) -> List[str]:
    """Extracts raw import strings from file content."""
    raw_imports = []
    
    if language == "Python":
        for match in PY_IMPORT_RE.findall(file_content):
            if match[0]: raw_imports.append(match[0])
            if match[1]: raw_imports.extend([i.strip() for i in match[1].split(',')])
                
    elif language in ["JavaScript", "TypeScript"]:
        for match in JS_IMPORT_RE.findall(file_content):
            raw_imports.append(match[0] or match[1])

    return raw_imports

def resolve_import_path(source_file: str, raw_import: str, repo_keys: Set[str], language: str) -> str:
    """Matches a raw import string to an exact file path in the scanned repository."""
    source_dir = os.path.dirname(source_file)
    possible_paths = []
    
    if language == "Python":
        base_path = raw_import.replace('.', '/')
        possible_paths = [
            f"{base_path}.py",
            f"{base_path}/__init__.py"
        ]
        if source_dir: # Check relative to current file
            possible_paths.append(f"{source_dir}/{base_path}.py")
            
    elif language in ["JavaScript", "TypeScript"]:
        if raw_import.startswith('.'):
            # Resolve complex relative paths (e.g., ../../components/Button)
            resolved_base = os.path.normpath(os.path.join(source_dir, raw_import)).replace('\\', '/')
        else:
            resolved_base = raw_import # Absolute alias or external module
            
        possible_paths = [
            f"{resolved_base}.js", f"{resolved_base}.ts",
            f"{resolved_base}.jsx", f"{resolved_base}.tsx",
            f"{resolved_base}/index.js", f"{resolved_base}/index.ts",
            f"{resolved_base}/index.jsx", f"{resolved_base}/index.tsx",
            resolved_base 
        ]

    # Look for a strict match in the files we actually crawled
    for path in possible_paths:
        clean_path = path.lstrip('./')
        if clean_path in repo_keys:
            return clean_path
            
    return None

def build_dependency_graph(target_directory: str, repo_id: str = "project", output_dir: str = "./dependency_graphs") -> str:
    """
    Main engine: Crawls folder, parses files, builds graph, saves JSON.
    """
    base_path = Path(target_directory).resolve()
    
    if not base_path.exists():
        print(f"[ERROR] Directory does not exist: {base_path}")
        return
        
    print(f"\n[1/3] Scanning directory: {base_path}")
    flat_repo_map = scan_directory(base_path)
    repo_keys = set(flat_repo_map.keys())
    print(f"      Found {len(repo_keys)} valid code files.")
    
    nodes = []
    edges = []
    
    print(f"[2/3] Extracting edges and resolving imports...")
    # Build Nodes
    for file_path, metadata in flat_repo_map.items():
        nodes.append({"id": file_path, "data": metadata})
        
    # Build Edges
    for source_file, metadata in flat_repo_map.items():
        full_path = base_path / source_file
        language = metadata.get("language")
        
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            raw_imports = extract_imports(content, language)
            
            for imp in raw_imports:
                target_file = resolve_import_path(source_file, imp, repo_keys, language)
                
                # If we found a valid internal target, create an edge
                if target_file and target_file != source_file:
                    edges.append({
                        "id": f"{source_file}->{target_file}",
                        "source": source_file,
                        "target": target_file,
                        "type": "import"
                    })
        except Exception as e:
            print(f"  [!] Warning: Could not process {source_file}: {e}")

    # Assemble and Save
    print(f"[3/3] Saving graph data...")
    graph_data = {"repo_id": repo_id, "nodes": nodes, "edges": edges}
    
    os.makedirs(output_dir, exist_ok=True)
    output_file = Path(output_dir) / f"{repo_id}_graph.json"
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=4)
        
    print(f"\n[COMPLETE] Graph saved to: {output_file}")
    print(f"           Stats: {len(nodes)} nodes, {len(edges)} edges connected.")
    return str(output_file)

# --- HOW TO RUN IT ---
if __name__ == "__main__":
    # Change this to the path of the project you want to scan!
    # For example: TARGET_PROJECT_PATH = "C:/Users/Name/Projects/MyReactApp"
    # or TARGET_PROJECT_PATH = "../my-python-backend"
    TARGET_PROJECT_PATH = "D:\\Projects_Main\\RepoXray\\server\\cloned_repos\\a48d085c-56ff-49e9-bcef-59afc274a48f" 
    
    build_dependency_graph(
        target_directory=TARGET_PROJECT_PATH, 
        repo_id="my_local_project"
    )