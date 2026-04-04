import os
import json
import uuid
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from dotenv import load_dotenv

import auth
import models
import schemas
from database import SessionLocal
from schemas import UserCreate, IngestRequest
from Repo_clone import get_repo_status, start_clone_job
import schemas
from schemas import UserCreate, IngestRequest
from jose import JWTError, jwt
from sample_groq import summarize_file
import models
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Explain My Codebase API",
    description="Database-backed repository ingestion API with real-time WebSocket tracking."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SummaryRequest(BaseModel):
    user_id: str
    repo_clone: str   # local path to the cloned repo, e.g. "/tmp/repos/my-repo"
    file_path: str

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/summarize")
def summarize(request: SummaryRequest):
    try:
        result = summarize_file(
            user_id=request.user_id,
            repo_clone=request.repo_clone,
            file_path=request.file_path,
        )
        return {
            "success": True,
            "cached": result["cached"],
            "id": result["id"],
            "file_path": request.file_path,
            "summary": result["summary"],
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summaries/{user_id}")
def get_user_summaries(user_id: str):
    """Fetch all cached summaries for a given user."""
    import json, os
    if not os.path.exists("uuid_summary.json"):
        return {"summaries": []}
    with open("uuid_summary.json") as f:
        all_data = json.load(f)
    user_entries = [v for v in all_data.values() if v.get("user_id") == user_id]
    return {"summaries": user_entries}

@app.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = auth.register_user(db, user_in)
    return {"message": "User created successfully", "user_id": user.id}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/ingest")
async def ingest_repository(
    request: IngestRequest, 
    current_user: models.User = Depends(get_current_user) 
):
    url = str(request.github_url).strip()
    
    if "github.com" not in url:
        raise HTTPException(status_code=400, detail="Only GitHub URLs are supported.")
    
    repo_id = str(uuid.uuid4())
    
    try:
        start_clone_job(url, repo_id, current_user.id) 
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to initialize clone job in database.")
    
    return {
        "status": "queued",
        "repo_id": repo_id,
        "websocket_endpoint": f"ws://localhost:8000/api/ws/status/{repo_id}",
        "tree_endpoint": f"/api/tree/{repo_id}",
        "graph_endpoint": f"/api/graph/{repo_id}",
        "summary_endpoint": f"/api/summary/{repo_id}"  # <-- ADDED
    }

# --- REAL-TIME WEBSOCKET STATUS TRACKER ---
@app.websocket("/api/ws/status/{repo_id}")
async def repo_status_ws(
    websocket: WebSocket, 
    repo_id: str, 
    token: str, # Passed as a query param since browser WebSockets can't send auth headers easily
    db: Session = Depends(get_db)
):
    await websocket.accept()
    try:
        # 1. Authenticate the WebSocket connection manually
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 2. Start checking and pushing status updates
        last_status = None
        while True:
            status_info = get_repo_status(repo_id, user.id)
            current_status = status_info.get("status")
            
            # Only send a message if the status actually changed to save bandwidth
            if current_status != last_status:
                await websocket.send_json(status_info)
                last_status = current_status
            
            # Close connection automatically if the pipeline finishes or fails
            if current_status in ["success", "error", "not_found"]:
                break
                
            await asyncio.sleep(2) # Server-side delay, taking the load off the frontend
            
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected from repo {repo_id}")

# --- ENDPOINT 1: THE FLAT TREE ---
@app.get("/api/tree/{repo_id}")
async def get_repo_tree(
    repo_id: str,
    current_user: models.User = Depends(get_current_user)
):
    status_info = get_repo_status(repo_id, current_user.id)
    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")
    
    if status_info.get("status") not in ["tree_ready", "success"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Tree data not ready yet. Current status: {status_info.get('status')}"
        )

    file_path = os.path.join("Repo_Codes_data", f"{repo_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Tree JSON file is missing from the server.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading tree data: {str(e)}")

# --- ENDPOINT 2: THE COMPLETE GRAPH ---
@app.get("/api/graph/{repo_id}")
async def get_repo_graph(
    repo_id: str,
    current_user: models.User = Depends(get_current_user)
):
    status_info = get_repo_status(repo_id, current_user.id)
    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")
    
    if status_info.get("status") != "success":
        raise HTTPException(
            status_code=400, 
            detail=f"Graph data not ready yet. Current status: {status_info.get('status')}"
        )

    file_path = os.path.join("Repo_Codes_data", f"{repo_id}_graph.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Graph JSON file is missing from the server.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading graph data: {str(e)}")

# --- ENDPOINT 3: THE ARCHITECTURAL SUMMARY ---
@app.get("/api/summary/{repo_id}")
async def get_repo_summary(
    repo_id: str,
    current_user: models.User = Depends(get_current_user)
):
    status_info = get_repo_status(repo_id, current_user.id)
    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")
    
    if status_info.get("status") != "success":
        raise HTTPException(
            status_code=400, 
            detail=f"Summary data not ready yet. Current status: {status_info.get('status')}"
        )

    file_path = os.path.join("Repo_Codes_data", f"{repo_id}_summary.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Summary JSON file is missing from the server.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading summary data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)