import json
import os
import re
import time
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUMMARY_MODEL = "llama-3.3-70b-versatile"
MAX_CONTEXT_CHARS = 14_000

# ---------------------------------------------------------------------------
# PROMPTS  — tighter, plainer output so regex extraction is reliable
# ---------------------------------------------------------------------------

PURPOSE_SYSTEM_PROMPT = """You are an expert software architect analyzing a codebase.

Output EXACTLY this format, nothing before or after:

===PROJECT_PURPOSE===
Write 3-5 sentences here. Cover: what the product does, what problem it solves, and who the target users are.
Do NOT mention file names, libraries, or architecture patterns.
===END==="""

METHODOLOGY_SYSTEM_PROMPT = """You are an expert software architect analyzing a codebase.

Output EXACTLY this format, nothing before or after:

===CODING_METHODOLOGY===
- Architecture: [name the style, e.g. MVC / layered / microservices — explain how it appears in THIS repo]
- Patterns: [name specific patterns and which module/layer uses them]
- Data Flow: [trace how data moves between at least 3 specific modules/folders]
- Conventions: [type hints, error handling, naming consistency — cite real examples]
- Separation of Concerns: [name the specific boundaries enforced]
- Tech Debt: [name at least one issue, or write "None observed"]
===END==="""

ADDITIONAL_SYSTEM_PROMPT = """You are a senior software architect analyzing a codebase.

Output EXACTLY this format, nothing before or after:

===TECH_STACK===
[Group: e.g. Backend Language]
- [Technology]: [one sentence on its exact role in this project]
- [Technology]: [one sentence on its exact role in this project]
[Group: e.g. Frontend Framework]
- [Technology]: [one sentence on its exact role in this project]
(continue for ALL visible technologies — miss none)

===INSIGHT===
Write one paragraph (3-5 sentences). State the single most critical architectural decision in this codebase, why it matters, and the future implication for the system. This must be something a junior developer would miss.
===END==="""

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def build_chain(system_prompt: str, llm: ChatGroq):
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    return prompt | llm | StrOutputParser()


def _slim_file_list(file_list: list) -> list:
    slimmed = []
    for f in file_list:
        role = (f.get("project_role") or "").lower()
        if role == "asset/binary":
            continue
        slimmed.append({
            "path":           f.get("path", ""),
            "language":       f.get("language", ""),
            "project_role":   role,
            "purpose":        (f.get("purpose") or "")[:180],
            "libraries_used": f.get("libraries_used", [])[:12],
            "coding_pattern": f.get("coding_pattern", ""),
            "key_functions":  f.get("key_functions", [])[:5],
        })
    return slimmed


def _truncate_context(context_str: str, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    if len(context_str) <= max_chars:
        return context_str
    print(f"[SUMMARY] Context truncated from {len(context_str)} to {max_chars} chars.")
    return context_str[:max_chars] + "\n... [TRUNCATED]"


def _invoke_with_retry(chain, payload: dict, call_name: str, max_retries: int = 4) -> str:
    delay = 12
    for attempt in range(1, max_retries + 1):
        try:
            return chain.invoke(payload)
        except Exception as e:
            err_str = str(e)
            if any(x in err_str for x in ("rate_limit_exceeded", "413", "429")):
                if attempt == max_retries:
                    raise
                wait = delay * attempt
                print(f"[SUMMARY] Rate limit on '{call_name}' (attempt {attempt}/{max_retries}). Waiting {wait}s…")
                time.sleep(wait)
            else:
                raise


def _extract_between(text: str, start_tag: str, end_tag: str) -> str:
    """Extract content between two delimiter tags, case-insensitive."""
    pattern = re.escape(start_tag) + r"\s*(.*?)\s*" + re.escape(end_tag)
    m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _extract_summary_sections(results: list) -> dict:
    """
    Parse the three LLM responses using explicit delimiters.
    Each result uses ===TAG=== ... ===END=== markers.
    """
    purpose_raw, methodology_raw, additional_raw = results

    project_purpose    = _extract_between(purpose_raw,    "===PROJECT_PURPOSE===", "===END===")
    coding_methodology = _extract_between(methodology_raw, "===CODING_METHODOLOGY===", "===END===")

    # Tech stack and insight are both in the third response
    tech_stack  = _extract_between(additional_raw, "===TECH_STACK===",  "===INSIGHT===")
    insight     = _extract_between(additional_raw, "===INSIGHT===",     "===END===")
    tech_stack_and_insight = (
        (tech_stack + "\n\n**Key Architectural Insight**\n" + insight).strip()
        if tech_stack or insight
        else additional_raw.strip()
    )

    # Fallbacks: if delimiters weren't respected, use the raw output
    if not project_purpose:
        project_purpose = purpose_raw.strip()
    if not coding_methodology:
        coding_methodology = methodology_raw.strip()
    if not tech_stack_and_insight:
        tech_stack_and_insight = additional_raw.strip()

    return {
        "project_purpose":        project_purpose,
        "coding_methodology":     coding_methodology,
        "tech_stack_and_insight": tech_stack_and_insight,
    }


# ---------------------------------------------------------------------------
# MAIN REPORT
# ---------------------------------------------------------------------------

def get_detailed_report(repo_context: dict) -> dict:
    llm = ChatGroq(model_name=SUMMARY_MODEL, temperature=0, max_retries=3)

    slim_files = _slim_file_list(repo_context.get("files", []))
    context_str = _truncate_context(
        "Below is the codebase metadata (JSON).\n\nREPOSITORY DATA:\n"
        + json.dumps(slim_files, indent=2)
    )

    calls = [
        ("Project Purpose",    PURPOSE_SYSTEM_PROMPT),
        ("Coding Methodology", METHODOLOGY_SYSTEM_PROMPT),
        ("Tech Stack & Insight", ADDITIONAL_SYSTEM_PROMPT),
    ]

    results = []
    for step, (name, sys_prompt) in enumerate(calls, 1):
        print(f"[Call {step}/3] Generating {name}…")
        chain  = build_chain(sys_prompt, llm)
        result = _invoke_with_retry(
            chain,
            {"input": f"{context_str}\n\nNow generate the {name} section."},
            call_name=name,
        )
        results.append(result)
        if step < 3:
            time.sleep(4)   # spread TPM usage

    sections = _extract_summary_sections(results)
    report_text = "\n\n".join(results)

    return {
        "raw": {"summary_report": report_text},
        "structured": {**sections, "summary_report": report_text},
        "sections": {
            "sections": [
                {"id": "1", "title": "Project Purpose",
                 "content": sections["project_purpose"]},
                {"id": "2", "title": "Coding Methodology",
                 "content": sections["coding_methodology"]},
                {"id": "3", "title": "Tech Stack & Additional Insight",
                 "content": sections["tech_stack_and_insight"]},
            ]
        },
    }


# ---------------------------------------------------------------------------
# PIPELINE ENTRY POINT
# ---------------------------------------------------------------------------

def run_summary_generation(repo_id: str, data_dir: str = "./Repo_Codes_data") -> str:
    tree_file_path = os.path.join(data_dir, f"{repo_id}.json")
    if not os.path.exists(tree_file_path):
        raise FileNotFoundError(f"Tree data missing for summary: {tree_file_path}")

    with open(tree_file_path, "r", encoding="utf-8") as f:
        file_list = [{"path": path, **meta} for path, meta in json.load(f).items()]

    print(f"[SUMMARY] Starting architecture summary for {repo_id} ({len(file_list)} files)…")
    report = get_detailed_report({"files": file_list})

    output_path = os.path.join(data_dir, f"{repo_id}_analysis.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"repo_id": repo_id, "analysis": report}, f, indent=4)

    print(f"[SUMMARY COMPLETE] Saved → {output_path}")
    return output_path


# ---------------------------------------------------------------------------
# STANDALONE TEST
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    test_id = sys.argv[1] if len(sys.argv) > 1 else "0ff845ad-a734-4caf-8bcb-fa9fc9ec4aea"
    test_path = os.path.join(".", "Repo_Codes_data", f"{test_id}.json")
    try:
        if not os.path.exists(test_path):
            print(f"Test skipped: place a valid '{test_id}.json' in './Repo_Codes_data'")
        else:
            with open(test_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            file_list = [{"path": p, **m} for p, m in data.items()]
            report = get_detailed_report({"files": file_list})
            print("\n" + "=" * 50)
            print(report["raw"]["summary_report"])
    except Exception as e:
        print(f"\n[CRITICAL ERROR]: {e}")

