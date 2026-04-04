import os
import json
import uuid
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import auth
from database import SessionLocal
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from Repo_clone import get_repo_status, start_clone_job
import schemas
from schemas import UserCreate, IngestRequest
from jose import JWTError, jwt
import models
from dotenv import load_dotenv

load_dotenv()

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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "database": "connected"}

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
        "status_endpoint": f"/api/status/{repo_id}",
        "tree_endpoint": f"/api/tree/{repo_id}",
        "graph_endpoint": f"/api/graph/{repo_id}" # <-- ADDED HELPER LINK
    }

@app.get("/api/status/{repo_id}")
async def check_repo_status(
    repo_id: str,
    current_user: models.User = Depends(get_current_user)
):
    status = get_repo_status(repo_id, current_user.id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized")
    return status


# --- ENDPOINT 1: THE FLAT TREE (AVAILABLE AT 'tree_ready') ---
@app.get("/api/tree/{repo_id}")
async def get_repo_tree(
    repo_id: str,
    current_user: models.User = Depends(get_current_user)
):
    status_info = get_repo_status(repo_id, current_user.id)
    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")
    
    # Allow fetching if Pass 1 is done (tree_ready) OR if the whole pipeline is done (success)
    if status_info.get("status") not in ["tree_ready", "success"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Tree data not ready yet. Current status: {status_info.get('status')}"
        )

    file_path = os.path.join("Repo_Codes_data", f"{repo_id}.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=500, 
            detail="Database says tree is ready, but the JSON file is missing from the server."
        )
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree_data = json.load(f)
        return tree_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading tree data: {str(e)}")


# --- NEW ENDPOINT 2: THE COMPLETE GRAPH (AVAILABLE AT 'success') ---
@app.get("/api/graph/{repo_id}")
async def get_repo_graph(
    repo_id: str,
    current_user: models.User = Depends(get_current_user)
):
    status_info = get_repo_status(repo_id, current_user.id)
    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")
    
    # Strict check: the graph is only ready when Gemini Pass 2 finishes completely
    if status_info.get("status") != "success":
        raise HTTPException(
            status_code=400, 
            detail=f"Graph data not ready yet. Current status: {status_info.get('status')}"
        )

    file_path = os.path.join("Repo_Codes_data", f"{repo_id}_graph.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=500, 
            detail="Database says success, but the graph JSON file is missing from the server."
        )
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading graph data: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)