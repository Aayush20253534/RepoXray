import json
from google import genai

client = genai.Client() # Assumes your API key is set in ENV

# 1. Load your test data
with open('repo_data.json', 'r') as f:
    repo_context = json.load(f)

# 2. Define the "Master Task"
prompt = f"""
Analyze this repository metadata and provide a professional report.
Metadata: {json.dumps(repo_context)}

Follow these requirements:
1. Project Overview: What is this project's real-world use case?
2. Coding Methodology: Identify the architecture (e.g. Client-Server, MVC), 
   interaction patterns, and consistency.
"""

# 3. Call Gemini with specific instructions
response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=prompt,
    config={
        "system_instruction": "You are a Senior Software Architect. Analyze the provided JSON metadata holistically. Output in clean, professional paragraphs. Do not list files individually."
    }
)

print("--- REPO ANALYSIS REPORT ---")
print(response.text)