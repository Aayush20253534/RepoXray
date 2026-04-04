import os
import json
import uuid
from pathlib import Path
from typing import Dict, Any, List

# --- LangChain & Pydantic Imports ---
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException

def _load_groq_api_key() -> str:
    """Load GROQ_API_KEY from environment, then fallback to local .env file."""
    env_key = os.environ.get("GROQ_API_KEY")
    if env_key:
        return env_key.strip()

    env_file = Path(__file__).resolve().parent / ".env"
    if not env_file.exists():
        return ""

    for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        if key.strip() == "GROQ_API_KEY":
            return value.strip().strip('"').strip("'")

    return ""

GROQ_API_KEY = _load_groq_api_key()

# Initialize the LangChain Groq LLM
if GROQ_API_KEY:
    llm = ChatGroq(
        temperature=0.1, 
        model_name="meta-llama/llama-4-scout-17b-16e-instruct", 
        api_key=GROQ_API_KEY,
        max_retries=2,
        model_kwargs={"response_format": {"type": "json_object"}}
    )
else:
    llm = None

# Directories and extensions to completely ignore
IGNORE_DIRS = {".git", "node_modules", "venv", "__pycache__", ".next", "dist", "build", "coverage"}
IGNORE_EXTS = {".jpg", ".png", ".gif", ".mp4", ".ico", ".svg", ".zip", ".tar", ".gz", ".pdf", ".lock"}
MAX_FILE_SIZE_BYTES = 50000  # Skip or truncate files larger than ~50KB

# --- LangChain Schema Definition ---
class FileAnalysis(BaseModel):
    purpose: str = Field(description="A brief 1-2 sentence description of what this file does.")
    libraries_used: List[str] = Field(description="Array of strings representing main imports/dependencies.")
    coding_pattern: str = Field(description="String (e.g., 'React Component', 'FastAPI Router', 'Utility function', 'Singleton').")
    project_role: str = Field(description="String ('frontend', 'backend', 'database', 'config', 'docs', or 'other').")
    key_functions: List[str] = Field(description="Array of strings representing names of the main functions or classes defined here.")

# Set up the parser based on our Pydantic schema
parser = JsonOutputParser(pydantic_object=FileAnalysis)

# Define the LangChain prompt
prompt_template = PromptTemplate(
    template="""
    You are an automated, strict JSON-only API. You do not converse, you do not explain, and you do not use markdown code blocks (like ```json).
    
    Analyze the following file named '{filename}'. 
    
    If the file is documentation (like README.md, .txt, or config files), summarize its purpose in the "purpose" field, set "project_role" to "docs" or "config", and return empty arrays/Unknown for the code-specific fields.

    File Content:
    {file_content}
    
    CRITICAL INSTRUCTION: Your entire response MUST be exactly one valid JSON object. Do not output anything before or after the JSON.
    
    {format_instructions}
    """,
    input_variables=["filename", "file_content"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

# Create the LCEL (LangChain Expression Language) Chain
if llm:
    analysis_chain = prompt_template | llm | parser
else:
    analysis_chain = None

def is_text_file(filepath: Path) -> bool:
    if filepath.suffix.lower() in IGNORE_EXTS:
        return False
    try:
        with open(filepath, 'tr', encoding='utf-8') as check_file:
            check_file.read(1024)
            return True
    except UnicodeDecodeError:
        return False

def get_file_language(extension: str) -> str:
    ext_map = {
        ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
        ".jsx": "React/JS", ".tsx": "React/TS", ".go": "Go",
        ".rs": "Rust", ".java": "Java", ".cpp": "C++", ".c": "C",
        ".html": "HTML", ".css": "CSS", ".md": "Markdown", ".sql": "SQL",
        ".json": "JSON"
    }
    return ext_map.get(extension.lower(), "Unknown")

def ask_groq_for_xray(file_content: str, filename: str) -> Dict[str, Any]:
    """
    Calls the Groq API via LangChain to analyze the file content.
    """
    if analysis_chain is None:
        return {
            "purpose": "Groq API key not configured. Analysis skipped.",
            "libraries_used": [],
            "coding_pattern": "Unknown",
            "project_role": "Unknown",
            "key_functions": []
        }

    if len(file_content) > 15000:
        file_content = file_content[:15000] + "\n...[TRUNCATED FOR SIZE]"

    try:
        # Invoke the LangChain pipeline
        result = analysis_chain.invoke({
            "filename": filename,
            "file_content": file_content
        })
        return result
    
    except OutputParserException as e:
        print(f"[XRAY ERROR] LangChain parsing failed for {filename}: {e}")
        return {
            "purpose": "LLM failed to return valid JSON schema",
            "libraries_used": [],
            "coding_pattern": "Unknown",
            "project_role": "Unknown",
            "key_functions": []
        }
    except Exception as e:
        print(f"[XRAY ERROR] Groq API failed for {filename}: {e}")
        return {
            "purpose": f"Analysis failed: {str(e)}",
            "libraries_used": [],
            "coding_pattern": "Unknown",
            "project_role": "Unknown",
            "key_functions": []
        }

def analyze_file(filepath: Path) -> Dict[str, Any]:
    """Extracts local metadata and fetches LLM metadata for a single file."""
    metadata = {
        "file_name": filepath.name,
        "extension": filepath.suffix,
        "language": get_file_language(filepath.suffix),
        "size_bytes": filepath.stat().st_size
    }

    if is_text_file(filepath) and metadata["size_bytes"] < MAX_FILE_SIZE_BYTES:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        llm_data = ask_groq_for_xray(content, filepath.name)
        metadata.update(llm_data)
    else:
        metadata.update({
            "purpose": "Binary or overly large file.",
            "libraries_used": [],
            "coding_pattern": "N/A",
            "project_role": "asset/binary",
            "key_functions": []
        })

    return metadata

def generate_flat_repo_map(current_path: Path, base_path: Path, repo_map: Dict[str, Any]) -> None:
    """Recursively walks the directory and builds a flat map of files."""
    try:
        items = sorted(current_path.iterdir(), key=lambda x: (x.is_file(), x.name))
        
        for item in items:
            if item.name in IGNORE_DIRS or item.name.startswith('.'):
                continue
                
            if item.is_dir():
                generate_flat_repo_map(item, base_path, repo_map)
            elif item.is_file():
                relative_path_key = item.relative_to(base_path).as_posix()
                print(f"  -> X-Raying: {relative_path_key}")
                repo_map[relative_path_key] = analyze_file(item)
                
    except PermissionError:
        pass

def run_repo_xray(repo_id: str, clone_path_str: str, output_dir: str = "./Repo_Codes_data"):
    """Main entry point to scan the repo and save the flat JSON map."""
    clone_path = Path(clone_path_str)
    
    if not clone_path.exists():
        raise FileNotFoundError(f"Repository path not found: {clone_path}")
        
    os.makedirs(output_dir, exist_ok=True)
    output_file = Path(output_dir) / f"{repo_id}.json"

    print(f"\n[STARTING X-RAY] Scanning repository: {repo_id}")
    
    flat_repo_map = {}
    generate_flat_repo_map(clone_path, clone_path, flat_repo_map)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(flat_repo_map, f, indent=4)
        
    print(f"[X-RAY COMPLETE] Results saved to: {output_file}")
    return str(output_file)

if __name__ == "__main__":
    dummy_repo_id = str(uuid.uuid4())
    test_path = os.path.dirname(os.path.abspath(__file__)) 
    run_repo_xray(dummy_repo_id, test_path)