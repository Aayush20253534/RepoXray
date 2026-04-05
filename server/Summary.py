import json
import os
import re
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# --- CONFIGURATION & PROMPTS ---

PURPOSE_SYSTEM_PROMPT = """
You are an expert software architect. You have been given a codebase to analyze.

YOUR ONLY OUTPUT MUST BE EXACTLY THIS STRUCTURE — NO EXCEPTIONS:

1. Project Purpose
- [2-4 sentences: what the project does and what problem it solves]
- [1 sentence: who the target users are or what the primary use-case is]

═══════════════════════════════════════════════
ABSOLUTE PROHIBITIONS — VIOLATING ANY OF THESE MEANS YOUR RESPONSE IS WRONG:
- DO NOT write any text before "1. Project Purpose"
- DO NOT describe individual files or folders
- DO NOT mention architecture, tech stack, patterns, or libraries
- DO NOT add conclusions, summaries, or closing remarks
- DO NOT exceed 5 sentences total
- DO NOT use headers other than "1. Project Purpose"
═══════════════════════════════════════════════

If you are tempted to add anything outside the format above — STOP. Delete it. Output only what is specified.
"""

METHODOLOGY_SYSTEM_PROMPT = """
You are an expert software architect. You have been given a codebase to analyze.

YOUR ONLY OUTPUT MUST BE EXACTLY THIS STRUCTURE — NO EXCEPTIONS:

2. Coding Methodology
- [Architecture style: name it and describe how it manifests specifically in this codebase]
- [Coding patterns: name each pattern and tie it to a specific module or layer]
- [Data & control flow: trace how data moves between at least 3 specific folders/modules]
- [Conventions: type hinting, error handling, naming — describe consistency level with examples]
- [Abstractions & separation of concerns: name the specific boundaries enforced]
- [Anti-patterns or tech debt: name at least one, or explicitly state "None observed"]

═══════════════════════════════════════════════
ABSOLUTE PROHIBITIONS — VIOLATING ANY OF THESE MEANS YOUR RESPONSE IS WRONG:
- DO NOT write any text before "2. Coding Methodology"
- DO NOT describe files in isolation — every observation must connect to at least one other module
- DO NOT make generic statements that could apply to any codebase
- DO NOT add introductions, transitions, or closing remarks
- DO NOT use headers other than "2. Coding Methodology"
═══════════════════════════════════════════════

Every bullet must be specific to THIS codebase. Generic filler = incorrect output.
If you are tempted to add anything outside the format above — STOP. Delete it.
"""

ADDITIONAL_SYSTEM_PROMPT = """
You are a senior software architect. You have been given a codebase to analyze.

YOUR ONLY OUTPUT MUST BE EXACTLY THIS STRUCTURE — NO EXCEPTIONS:

3a. Tech Stack & Technologies
[Group label — e.g., Core Language]:
- [Technology name]: [One sentence on its exact role in this project]
- [Technology name]: [One sentence on its exact role in this project]
[Group label — e.g., Web Framework]:
- [Technology name]: [One sentence on its exact role in this project]
... (repeat for ALL technologies — every language, framework, library, service)

3b. Additional Insight
[One paragraph, 3-5 sentences. State the single most critical architectural insight.
Explain what it is, why it matters, and what implication it has for the system's future.]

═══════════════════════════════════════════════
ABSOLUTE PROHIBITIONS — VIOLATING ANY OF THESE MEANS YOUR RESPONSE IS WRONG:
- DO NOT write any text before "3a. Tech Stack & Technologies"
- DO NOT omit any technology visible in the codebase — missing entries = incomplete output
- DO NOT write more than ONE insight in 3b — a list in 3b = wrong output
- DO NOT add introductions, transitions, or closing remarks after 3b
- DO NOT describe files individually in either section
- DO NOT use headers other than "3a." and "3b."
═══════════════════════════════════════════════

3b must contain something a junior developer would miss. Surface-level observations = incorrect output.
If you are tempted to add anything outside the format above — STOP. Delete it.
"""

# --- CORE FUNCTIONS ---

def build_chain(system_prompt: str, llm: ChatGroq):
    """Build a simple LangChain chain: prompt → LLM → string output."""
    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
    return prompt | llm | StrOutputParser()

def _extract_summary_sections(report_text: str) -> dict:
    """Extract expected sections from report text using robust heading matching."""
    patterns = {
        "project_purpose": r"1\.\s*Project Purpose\s*(.*?)(?=\n\s*2\.\s*Coding Methodology|\Z)",
        "coding_methodology": r"2\.\s*Coding Methodology\s*(.*?)(?=\n\s*3a\.\s*Tech Stack\s*&\s*Technologies|\Z)",
        "tech_stack_and_insight": r"3a\.\s*Tech Stack\s*&\s*Technologies\s*(.*)",
    }
    
    return {
        key: (match.group(1).strip() if (match := re.search(pat, report_text, flags=re.IGNORECASE | re.DOTALL)) else "")
        for key, pat in patterns.items()
    }

def get_detailed_report(repo_context: dict) -> dict:
    llm = ChatGroq(model_name="openai/gpt-oss-120b", temperature=0, max_retries=5)
    
    structural_profiles = (
        "Below is the complete JSON metadata for the entire codebase.\n\nREPOSITORY DATA:\n" 
        + json.dumps(repo_context.get("files", []), indent=2)
    )

    # Consolidated execution of LangChain chains
    chains = {
        "Project Purpose": PURPOSE_SYSTEM_PROMPT,
        "Coding Methodology": METHODOLOGY_SYSTEM_PROMPT,
        "Additional Insight": ADDITIONAL_SYSTEM_PROMPT
    }
    
    results = []
    for step, (name, prompt) in enumerate(chains.items(), 1):
        print(f"[Call {step}/3] Generating {name}...")
        results.append(build_chain(prompt, llm).invoke({
            "input": f"{structural_profiles}\n\nNow provide the {name} section only."
        }))

    report_text = "\n\n".join(results)
    sections = _extract_summary_sections(report_text)

    return {
        "raw": {"summary_report": report_text},
        "structured": {**sections, "summary_report": report_text},
        "sections": {"sections": [
            {"id": "1", "title": "Project Purpose", "content": sections["project_purpose"]},
            {"id": "2", "title": "Coding Methodology", "content": sections["coding_methodology"]},
            {"id": "3", "title": "Tech Stack & Additional Insight", "content": sections["tech_stack_and_insight"]},
        ]}
    }

# --- SUMMARY PIPELINE ---

def run_summary_generation(repo_id: str, data_dir: str = "./Repo_Codes_data") -> str:
    """Wrapper to run the summary generation as part of the pipeline."""
    tree_file_path = os.path.join(data_dir, f"{repo_id}.json")
    
    if not os.path.exists(tree_file_path):
        raise FileNotFoundError(f"Tree data missing for summary: {tree_file_path}")
        
    with open(tree_file_path, "r", encoding="utf-8") as f:
        file_list = [{"path": path, **meta} for path, meta in json.load(f).items()]
    
    print(f"[SUMMARY] Starting architecture summary for {repo_id}...")
    report = get_detailed_report({"files": file_list})
    
    # Consolidate all information into a single structured format
    analysis_data = {
        "repo_id": repo_id,
        "analysis": report
    }

    # Write single JSON file
    output_path = os.path.join(data_dir, f"{repo_id}_analysis.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(analysis_data, f, indent=4)

    print(f"[SUMMARY COMPLETE] Saved summary file for {repo_id} at {output_path}")
    return output_path

# --- EXECUTION ---

if __name__ == "__main__":
    # Removed the hardcoded 'D:\...' paths for a cleaner, universal test block
    import sys
    test_id = sys.argv[1] if len(sys.argv) > 1 else "0ff845ad-a734-4caf-8bcb-fa9fc9ec4aea"
    test_path = os.path.join(".", "Repo_Codes_data", f"{test_id}.json")
    
    try:
        if not os.path.exists(test_path):
            print(f"Test skipped: Place a valid '{test_id}.json' inside './Repo_Codes_data' to run standalone.")
        else:
            with open(test_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            test_report = get_detailed_report(data)
            print("\n" + "=" * 30 + "\n--- REPO ANALYSIS REPORT ---\n" + "=" * 30 + "\n")
            print(test_report["raw"]["summary_report"])

    except Exception as final_error:
        print(f"\n[CRITICAL ERROR]: {final_error}")