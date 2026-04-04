import json
import os
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# --- CONFIGURATION & PROMPTS ---

PURPOSE_SYSTEM_PROMPT = """
You are an expert software architect analyzing a codebase.
Your ONLY task is to explain the project's purpose — concisely and clearly.

OUTPUT FORMAT (STRICT):

1. Project Purpose
- Clearly explain what the project does in 2-4 sentences.
- Identify the primary problem it solves.
- Mention the target users or use-case if inferable.

IMPORTANT RULES:
- Be brief and sharp. No fluff, no filler.
- DO NOT describe files individually.
- DO NOT discuss architecture, patterns, or tech stack.
- ONLY answer: what does this project do and why does it exist?
"""

METHODOLOGY_SYSTEM_PROMPT = """
You are an expert software architect analyzing a codebase.
Your ONLY task is to provide an exhaustive breakdown of the coding methodology.

OUTPUT FORMAT (STRICT):

2. Coding Methodology
- Describe the overall architecture (e.g., modular, layered, Hexagonal, MVC).
- Explain specific coding patterns discovered (OOP, Functional, Async/Await, etc.).
- DETAILED INTERACTION: This section must be extensive. Explain how specific folders and 
  modules depend on each other — trace data flow and control flow across the system.
- Mention coding conventions followed (e.g., Type Hinting, error handling strategies, 
  naming conventions) and how consistently they are applied.
- Discuss abstractions, interfaces, and separation of concerns in detail.
- Highlight any anti-patterns or technical debt if observable.

IMPORTANT RULES:
- This section must be really really detailed and thorough — go deep, not wide.
- DO NOT describe files individually in isolation.
- SYNTHESIZE patterns and interactions across the entire repository.
- Avoid generic statements; every sentence must be specific to this codebase.
"""

ADDITIONAL_SYSTEM_PROMPT = """
You are a senior software architect delivering a professional code review.
Your task has TWO parts — complete BOTH in order.
 
OUTPUT FORMAT (STRICT):
 
3a. Tech Stack & Technologies
- List every language, framework, library, and external service used in this codebase.
- For each entry, add one sharp sentence on its specific role in this project.
- Group them logically: (e.g., Core Language, Web Framework, Database, AI/ML, DevOps, etc.)
- DO NOT just list names — explain how each technology is actually used here.
 
3b. Additional Insight
- Select the SINGLE most critical architectural insight about this repository.
  This could relate to: System Design, Scalability, Security, Performance,
  Tech Stack Nuances, or a hidden design decision with major implications.
- Explain WHY this specific aspect is the most important thing to understand
  about how this system is built or how it will evolve.
- Provide a senior-level, professional analysis — not a surface observation.
 
IMPORTANT RULES:
- 3a must be exhaustive — do not omit any technology visible in the codebase.
- 3b is ONE insight only. Do NOT provide a list or multiple points.
- Make 3b genuinely insightful — something a junior dev would miss.
- DO NOT describe files individually in either section.
- Be information-dense and opinionated.
"""

# --- CORE FUNCTIONS ---

def build_chain(system_prompt: str, llm: ChatGoogleGenerativeAI):
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
    llm = ChatGoogleGenerativeAI(model="gemini-3-flash-preview", temperature=0, max_retries=5)
    
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
    test_id = sys.argv[1] if len(sys.argv) > 1 else "TEST_UUID_HERE"
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