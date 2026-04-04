from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
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
        "status_endpoint": f"/api/status/{repo_id}"
    }

@app.get("/api/status/{repo_id}")
async def check_repo_status(repo_id: str):
    status = get_repo_status(repo_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository ID not found in database")
    return status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)