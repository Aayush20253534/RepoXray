import os
import json
from pathlib import Path
from langchain_core.prompts import PromptTemplate
from api_groq import llm

# Define where your repositories are cloned on the server.
# Change this to match the destination folder used in your Repo_clone.py script!
REPOS_BASE_DIR = Path("./cloned_repos") 

PROMPT_TEMPLATE = """You are a senior software engineer performing deep code analysis.
You are given the contents of a single file from a GitHub repository.
Your task is to generate a DETAILED, structured summary of this file.

---

OUTPUT FORMAT (STRICT):

1. Purpose
- Clearly explain the primary responsibility of this file
- What role it plays in the overall system

2. Core Functionality
- Describe the main logic implemented
- Mention important operations handled in this file

3. Key Components
- List important functions, classes, or modules
- Briefly describe what each does (1 line each)

4. Dependencies & Integrations
- Mention libraries, frameworks, or external modules used
- Explain how they are used (briefly)

5. Code Characteristics
- Mention patterns used (OOP, functional, async, etc.)
- Highlight any notable design decisions

---

RULES:
- Be concise but information-dense
- DO NOT paste code
- DO NOT explain line-by-line
- DO NOT use generic phrases like "this file contains code for..."
- Focus on WHAT the file does and WHY it exists
- Infer intelligently if context is missing
- Keep total output within ~120-180 words

---

TONE:
Professional, precise, like a senior engineer reviewing a codebase

---

Now analyze the following file:

{code_here}
"""

# Create the LangChain Prompt and Chain
prompt = PromptTemplate(
    input_variables=["code_here"],
    template=PROMPT_TEMPLATE
)
chain = prompt | llm

def get_cache_path(repo_id: str) -> str:
    """Returns the dedicated cache file path for a specific repository."""
    return f"Repo_Codes_data/{repo_id}_file_summaries.json"

def load_summaries(repo_id: str) -> dict:
    cache_path = get_cache_path(repo_id)
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_summaries(repo_id: str, data: dict):
    cache_path = get_cache_path(repo_id)
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# Removed repo_clone from arguments
def summarize_file(repo_id: str, file_path: str) -> dict:
    summaries = load_summaries(repo_id)

    # 1. Check if the summary is already cached for this specific file path
    if file_path in summaries:
        return {"summary": summaries[file_path], "cached": True}

    # 2. Construct the full path using the base directory, repo_id, and file_path
    full_path = REPOS_BASE_DIR / repo_id / file_path
    
    if not full_path.exists():
        raise FileNotFoundError(f"File not found on server: {full_path}")

    code_content = full_path.read_text(encoding="utf-8", errors="ignore")

    # 3. Run the LangChain API call
    response = chain.invoke({"code_here": code_content})
    summary_text = response.content.strip()

    # 4. Save the new summary to the repo's cache
    summaries[file_path] = summary_text
    save_summaries(repo_id, summaries)

    return {"summary": summary_text, "cached": False}