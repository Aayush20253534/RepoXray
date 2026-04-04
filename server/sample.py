# import json
# from google import genai

# client = genai.Client() # Assumes your API key is set in ENV

# # 1. Load your test data
# with open('repo_data.json', 'r') as f:
#     repo_context = json.load(f)

# # 2. Define the "Master Task"
# prompt = f"""
# Analyze this repository metadata and provide a professional report.
# Metadata: {json.dumps(repo_context)}

# Follow these requirements:
# 1. Project Overview: What is this project's real-world use case?
# 2. Coding Methodology: Identify the architecture (e.g. Client-Server, MVC), 
#    interaction patterns, and consistency.
# """

# # 3. Call Gemini with specific instructions
# response = client.models.generate_content(
#     model="gemini-3-flash-preview",
#     contents=prompt,
#     config={
#         "system_instruction": "You are a Senior Software Architect. Analyze the provided JSON metadata holistically. Output in clean, professional paragraphs. Do not list files individually."
#     }
# )

# print("--- REPO ANALYSIS REPORT ---")
# print(response.text)


import json
import time
from google import genai
from google.genai import errors

client = genai.Client()

with open('repo_data.json', 'r') as f:
    repo_context = json.load(f)

prompt = f"Analyze this repository metadata: {json.dumps(repo_context)}"

# --- THE FIX STARTS HERE ---
def generate_with_retry(max_retries=5):
    wait_time = 2  # Start with 2 seconds
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-3-flash-preview", # Keeping your original model
                contents=prompt,
                config={
                    "system_instruction": "You are a Senior Software Architect. Analyze the provided JSON metadata holistically."
                }
            )
            return response
        except errors.ServerError as e:
            if "503" in str(e) or "high demand" in str(e).lower():
                print(f"Server busy (Attempt {attempt + 1}). Retrying in {wait_time}s...")
                time.sleep(wait_time)
                wait_time *= 2  # Exponentially increase wait (2s, 4s, 8s...)
            else:
                raise e
    raise Exception("Max retries exceeded. Google's servers are under too much load.")

# Run the function
try:
    response = generate_with_retry()
    print("--- REPO ANALYSIS REPORT ---")
    print(response.text)
except Exception as final_error:
    print(f"Failed after retries: {final_error}")