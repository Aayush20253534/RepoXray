from api_groq import client
import json, uuid, os
from pathlib import Path


SUMMARY_FILE = "uuid_summary.json"

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


def load_summaries() -> dict:
    if os.path.exists(SUMMARY_FILE):
        with open(SUMMARY_FILE, "r") as f:
            return json.load(f)
    return {}


def save_summaries(data: dict):
    with open(SUMMARY_FILE, "w") as f:
        json.dump(data, f, indent=2)


def summarize_file(user_id: str, repo_clone: str, file_path: str) -> dict:
    summaries = load_summaries()
    file_name = Path(file_path).name

    # Return cached summary if exists
    if file_name in summaries:
        return {"summary": summaries[file_name], "cached": True}

    # Read the actual file
    full_path = Path(repo_clone) / file_path
    if not full_path.exists():
        raise FileNotFoundError(f"File not found: {full_path}")

    code_content = full_path.read_text(encoding="utf-8", errors="ignore")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": PROMPT_TEMPLATE.format(code_here=code_content)
            }
        ],
        temperature=0.3,
    )

    summary_text = response.choices[0].message.content.strip()

    # Save as { "main.py": "summary text..." }
    summaries[file_name] = summary_text
    save_summaries(summaries)

    return {"summary": summary_text, "cached": False}

