import os
import json
import uuid
from pathlib import Path
from groq import Groq
from typing import Dict, Any, List

# TODO: Set your GROQ_API_KEY in your environment variables
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Directories and extensions to completely ignore to save API calls and time
IGNORE_DIRS = {".git", "node_modules", "venv", "__pycache__", ".next", "dist", "build", "coverage"}
IGNORE_EXTS = {".jpg", ".png", ".gif", ".mp4", ".ico", ".svg", ".zip", ".tar", ".gz", ".pdf", ".lock"}
MAX_FILE_SIZE_BYTES = 50000  # Skip or truncate files larger than ~50KB

def is_text_file(filepath: Path) -> bool:
    """Basic check to ensure we don't try to read binary files."""
    if filepath.suffix.lower() in IGNORE_EXTS:
        return False
    try:
        with open(filepath, 'tr', encoding='utf-8') as check_file:
            check_file.read(1024)
            return True
    except UnicodeDecodeError:
        return False

def get_file_language(extension: str) -> str:
    """Fallback logic for language mapping."""
    ext_map = {
        ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
        ".jsx": "React/JS", ".tsx": "React/TS", ".go": "Go",
        ".rs": "Rust", ".java": "Java", ".cpp": "C++", ".c": "C",
        ".html": "HTML", ".css": "CSS", ".md": "Markdown", ".sql": "SQL"
    }
    return ext_map.get(extension.lower(), "Unknown")

def ask_groq_for_xray(file_content: str, filename: str) -> Dict[str, Any]:
    """
    Calls the Groq API to analyze the file content and return structured JSON.
    """
    # Truncate content to avoid blowing up context windows
    if len(file_content) > 15000:
        file_content = file_content[:15000] + "\n...[TRUNCATED FOR SIZE]"

    prompt = f"""
    Analyze the following code file named '{filename}'.
    Return ONLY a valid JSON object with the following keys:
    - "purpose": A brief 1-2 sentence description of what this file does.
    - "libraries_used": Array of strings (main imports/dependencies).
    - "coding_pattern": String (e.g., "React Component", "FastAPI Router", "Utility function", "Singleton").
    - "project_role": String ("frontend", "backend", "database", "config", "docs", or "other").
    - "key_functions": Array of strings (names of the main functions or classes defined here).

    Code:
    ```
    {file_content}
    ```
    """

    try:
        # Using llama3-8b-8192 as it is incredibly fast and cheap for simple parsing
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a code analysis bot. Output strictly valid JSON without markdown wrapping."},
                {"role": "user", "content": prompt}
            ],
            model="llama3-8b-8192", 
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        
        response_text = chat_completion.choices[0].message.content
        return json.loads(response_text)
    
    except Exception as e:
        print(f"[XRAY ERROR] Groq API failed for {filename}: {e}")
        return {
            "purpose": "Analysis failed or skipped",
            "libraries_used": [],
            "coding_pattern": "Unknown",
            "project_role": "Unknown",
            "key_functions": []
        }

def analyze_file(filepath: Path, base_path: Path) -> Dict[str, Any]:
    """Extracts local metadata and fetches LLM metadata for a single file."""
    relative_path = filepath.relative_to(base_path)
    
    # 1. Local Meta Data
    metadata = {
        "file_name": filepath.name,
        "path": str(relative_path),
        "parent_folder": filepath.parent.name if filepath.parent != base_path else "root",
        "extension": filepath.suffix,
        "language": get_file_language(filepath.suffix),
        "size_bytes": filepath.stat().st_size
    }

    # 2. LLM Meta Data (Only if it's a manageable text file)
    if is_text_file(filepath) and metadata["size_bytes"] < MAX_FILE_SIZE_BYTES:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        print(f"  -> X-Raying: {relative_path}")
        llm_data = ask_groq_for_xray(content, filepath.name)
        
        # Merge LLM data into our metadata dictionary
        metadata.update(llm_data)
    else:
        # Fallback for big files or binaries
        metadata.update({
            "purpose": "Binary or overly large file.",
            "libraries_used": [],
            "coding_pattern": "N/A",
            "project_role": "asset/binary",
            "key_functions": []
        })

    return {"type": "file", "metadata": metadata}

def generate_repo_tree(current_path: Path, base_path: Path) -> Dict[str, Any]:
    """Recursively walks the directory and builds the tree structure."""
    tree = {
        "type": "directory",
        "name": current_path.name,
        "path": str(current_path.relative_to(base_path)) if current_path != base_path else "root",
        "children": []
    }

    try:
        # Sort items so directories come first, then files
        items = sorted(current_path.iterdir(), key=lambda x: (x.is_file(), x.name))
        
        for item in items:
            if item.name in IGNORE_DIRS or item.name.startswith('.'):
                continue
                
            if item.is_dir():
                tree["children"].append(generate_repo_tree(item, base_path))
            elif item.is_file():
                tree["children"].append(analyze_file(item, base_path))
                
    except PermissionError:
        pass # Skip folders we don't have access to
        
    return tree

def run_repo_xray(repo_id: str, clone_path_str: str, output_dir: str = "./xray_results"):
    """Main entry point to scan the repo and save the JSON file."""
    clone_path = Path(clone_path_str)
    
    if not clone_path.exists():
        raise FileNotFoundError(f"Repository path not found: {clone_path}")
        
    os.makedirs(output_dir, exist_ok=True)
    output_file = Path(output_dir) / f"{repo_id}.json"

    print(f"\n[STARTING X-RAY] Scanning repository: {repo_id}")
    
    # Generate the complete tree
    repo_tree = generate_repo_tree(clone_path, clone_path)
    
    # Save to unique JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(repo_tree, f, indent=4)
        
    print(f"[X-RAY COMPLETE] Results saved to: {output_file}")
    return str(output_file)

# --- For isolated testing ---
if __name__ == "__main__":
    # Test it by pointing it at its own project directory!
    dummy_repo_id = str(uuid.uuid4())
    test_path = os.path.dirname(os.path.abspath(__file__)) 
    run_repo_xray(dummy_repo_id, test_path)