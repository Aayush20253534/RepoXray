import os
import json
import uuid
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from dotenv import load_dotenv

# Local imports
import models
import schemas
import auth
from database import engine, SessionLocal
from schemas import UserCreate, IngestRequest
from Repo_clone import get_repo_status, start_clone_job
from sample_groq import summarize_file

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

# Updated Request Model for the single secured endpoint
class FileSummaryRequest(BaseModel):
    repo_id: str
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

# --- ENDPOINT 4: GET RAW FILE CODE ---
@app.get("/api/file-code/{repo_id}")
async def get_file_code(
    repo_id: str,
    file_path: str,  # e.g. "main.py" or "src/utils.py"
    current_user: models.User = Depends(get_current_user)
):
    # 1. Check repo exists + belongs to this user + is ready
    status_info = get_repo_status(repo_id, current_user.id)
    
    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")
    
    if status_info.get("status") not in ["tree_ready", "success", "error"]:
        raise HTTPException(
            status_code=400,
            detail=f"Repo not ready yet. Current status: {status_info.get('status')}"
        )

    # 2. Get clone path directly from DB (already stored by Repo_clone.py)
    repo_clone_path = status_info.get("clone_path")
    if not repo_clone_path:
        raise HTTPException(status_code=500, detail="Clone path not found in database.")

    # 3. Prevent path traversal attacks
    full_path = os.path.realpath(os.path.join(repo_clone_path, file_path))
    base_path = os.path.realpath(repo_clone_path)

    if not full_path.startswith(base_path):
        raise HTTPException(status_code=400, detail="Invalid file path.")

    # 4. Read and return file
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail=f"File '{file_path}' not found in repo.")
    
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=400, detail=f"'{file_path}' is a directory, not a file.")

    try:
        code = open(full_path, "r", encoding="utf-8", errors="ignore").read()
        return {
            "repo_id": repo_id,
            "file_path": file_path,
            "code": code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


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
        "summary_endpoint": f"/api/summary/{repo_id}"
    }

# --- NEW UNIFIED SECURE SUMMARY ENDPOINT ---
@app.post("/api/file-summary")
async def get_or_create_file_summary(
    request: FileSummaryRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Checks if a file summary is cached in the repo's specific JSON file.
    If yes, returns it. If not, generates via LangChain API, caches it, and returns.
    """
    # Verify the user has access to this repo and it exists
    status_info = get_repo_status(request.repo_id, current_user.id)
    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")

    try:
        # We no longer pass repo_clone here
        result = summarize_file(
            repo_id=request.repo_id,
            file_path=request.file_path,
        )
        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# --- REAL-TIME WEBSOCKET STATUS TRACKER ---
@app.websocket("/api/ws/status/{repo_id}")
async def repo_status_ws(
    websocket: WebSocket, 
    repo_id: str, 
    token: str, 
    db: Session = Depends(get_db)
):
    await websocket.accept()
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        last_status = None
        while True:
            status_info = get_repo_status(repo_id, user.id)
            current_status = status_info.get("status")
            
            if current_status != last_status:
                await websocket.send_json(status_info)
                last_status = current_status
            
            if current_status in ["success", "error", "not_found"]:
                break
                
            await asyncio.sleep(2) 
            
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
    
    if status_info.get("status") not in ["tree_ready", "success", "error"]:
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

    file_path = os.path.join("Repo_Codes_data", f"{repo_id}_analysis.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Summary JSON file is missing from the server.")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading summary data: {str(e)}")

@app.post("/api/change-password")
async def change_password(
    request: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Secured endpoint to change the logged-in user's password.
    """
    # 1. Verify that the provided old password matches the current one
    if not auth.verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password."
        )
    
    # 2. Prevent reusing the same password (optional but recommended)
    if request.old_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the old password."
        )

    # 3. Update the password in the database
    auth.update_user_password(db, current_user, request.new_password)
    
    return {"message": "Password changed successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)