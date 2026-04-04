import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import SystemMessage, HumanMessage

# --- CONFIGURATION & PROMPTS ---

INDEXER_INSTRUCTION = """
You are a Technical Structural Analyst. 
For each file provided in the JSON chunk, output a DENSE technical profile:
- Path: [Full File Path]
- Role: (e.g., Entry Point, Utility, Model, Controller, Middleware)
- Key Logic: 1-2 sentences on the unique implementation logic.
- Interaction: List which other local folders or modules this file interacts with.
- Pattern: Note if it uses specific patterns (e.g., Singleton, Decorators, Dependency Injection).
"""

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
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    return prompt | llm | StrOutputParser()


def get_detailed_report(repo_context: dict) -> str:
    # Shared LLM instance with retry logic handled by LangChain internals
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview",   # swap for your target model
        temperature=0,
        max_retries=5,
    )

    file_list = repo_context.get("files", [])
    technical_index = []

    # --- INDEXING PASS ---
    indexer_chain = build_chain(INDEXER_INSTRUCTION, llm)

    print(f"Starting Indexing Pass for {len(file_list)} files...")
    for i in range(0, len(file_list), 10):
        chunk = file_list[i : i + 10]
        print(f" -> Indexing metadata for files {i} to {i + len(chunk)}...")
        result = indexer_chain.invoke({"input": f"Analyze these files: {json.dumps(chunk)}"})
        technical_index.append(result)

    # Shared structural context for all three architect calls
    structural_profiles = (
        "Below are the structural technical profiles of the entire codebase.\n\n"
        "STRUCTURAL PROFILES:\n" + "\n".join(technical_index)
    )

    # --- CALL 1: Project Purpose ---
    print("\n[Call 1/3] Generating Project Purpose...")
    purpose_chain = build_chain(PURPOSE_SYSTEM_PROMPT, llm)
    purpose_result = purpose_chain.invoke({
        "input": structural_profiles + "\n\nNow provide the Project Purpose section only."
    })

    # --- CALL 2: Coding Methodology ---
    print("[Call 2/3] Generating Coding Methodology...")
    methodology_chain = build_chain(METHODOLOGY_SYSTEM_PROMPT, llm)
    methodology_result = methodology_chain.invoke({
        "input": structural_profiles + "\n\nNow provide the Coding Methodology section only."
    })

    # --- CALL 3: Additional Insight ---
    print("[Call 3/3] Generating Additional Insight...")
    additional_chain = build_chain(ADDITIONAL_SYSTEM_PROMPT, llm)
    additional_result = additional_chain.invoke({
        "input": structural_profiles + "\n\nNow provide the Additional Insight section only."
    })

    return "\n\n".join([purpose_result, methodology_result, additional_result])

# --- ADD THIS TO Summary.py ---

def run_summary_generation(repo_id: str, data_dir: str = "./Repo_Codes_data") -> str:
    """Wrapper to run the summary generation as part of the pipeline."""
    tree_file_path = os.path.join(data_dir, f"{repo_id}.json")
    output_path = os.path.join(data_dir, f"{repo_id}_summary.json")
    
    if not os.path.exists(tree_file_path):
        raise FileNotFoundError(f"Tree data missing for summary: {tree_file_path}")
        
    # 1. Load the flat dictionary created by PASS 1 (repo_tree.py)
    with open(tree_file_path, "r", encoding="utf-8") as f:
        tree_data = json.load(f)
        
    # 2. Format the dictionary into a list for the LangChain script
    file_list = [{"path": filepath, **metadata} for filepath, metadata in tree_data.items()]
    repo_context = {"files": file_list}
    
    # 3. Generate the report
    print(f"[SUMMARY] Starting architecture summary for {repo_id}...")
    report_text = get_detailed_report(repo_context)
    
    # 4. Save to a JSON file for the FastAPI endpoint
    summary_data = {
        "repo_id": repo_id,
        "summary_report": report_text
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=4)
        
    print(f"[SUMMARY COMPLETE] Saved summary to {output_path}")
    return output_path

# --- EXECUTION ---

if __name__ == "__main__":
    try:
        if not os.path.exists("repo_data.json"):
            print("Error: repo_data.json not found.")
        else:
            with open("repo_data.json", "r") as f:
                data = json.load(f)

            report = get_detailed_report(data)

            print("\n" + "=" * 30)
            print("--- REPO ANALYSIS REPORT ---")
            print("=" * 30 + "\n")
            print(report)

    except Exception as final_error:
        print(f"\n[CRITICAL ERROR]: {final_error}")