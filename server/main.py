import os
import json
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from Repo_clone import get_repo_status, start_clone_job

app = FastAPI(
    title="Explain My Codebase API",
    description="Database-backed repository ingestion API."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    github_url: str 

@app.get("/health")
async def health_check():
    return {"status": "ok", "database": "connected"}

@app.post("/api/ingest")
async def ingest_repository(request: IngestRequest):
    url = str(request.github_url).strip()
    
    if "github.com" not in url:
        raise HTTPException(status_code=400, detail="Only GitHub URLs are supported.")
    
    repo_id = str(uuid.uuid4())
    
    try:
        start_clone_job(url, repo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to initialize clone job in database.")
    
    return {
        "status": "queued",
        "repo_id": repo_id,
        "status_endpoint": f"/api/status/{repo_id}",
        "tree_endpoint": f"/api/tree/{repo_id}" # Added this so the frontend knows where to look later
    }

@app.get("/api/status/{repo_id}")
async def check_repo_status(repo_id: str):
    status = get_repo_status(repo_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository ID not found in database")
    return status

# --- NEW ENDPOINT TO FETCH THE GENERATED JSON TREE ---
@app.get("/api/tree/{repo_id}")
async def get_repo_tree(repo_id: str):
    """Fetches the generated RepoXray JSON file."""
    
    # First, check if the job actually exists and is successful
    status = get_repo_status(repo_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository ID not found.")
    
    if status.get("status") != "success":
        raise HTTPException(
            status_code=400, 
            detail=f"Data not ready. Current status: {status.get('status')}"
        )

    # Construct the path to the expected JSON file
    file_path = os.path.join("Repo_Codes_data", f"{repo_id}.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=500, 
            detail="Database says success, but the JSON file is missing from the server."
        )
        
    # Read and return the JSON
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree_data = json.load(f)
        return tree_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading tree data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)