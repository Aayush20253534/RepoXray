import os
import json
import uuid
import asyncio

from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import JWTError, jwt

import models
import schemas
import auth
from database import SessionLocal

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
DATA_DIR = os.getenv("DATA_DIR", "Repo_Codes_data")

if not GROQ_API_KEY:
    raise RuntimeError("Missing GROQ_API_KEY in environment variables")

# ---------------------------------------------------------------------------
# App init
# ---------------------------------------------------------------------------

app = FastAPI(
    title="RepoXray API",
    description="Database-backed repository ingestion API with real-time WebSocket tracking.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ---------------------------------------------------------------------------
# Database session
# ---------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class FileSummaryRequest(BaseModel):
    repo_id: str
    file_path: str

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            auth.SECRET_KEY,
            algorithms=[auth.ALGORITHM],
        )
        username = payload.get("sub")

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(
        models.User.username == username
    ).first()

    if user is None:
        raise credentials_exception

    return user

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "RepoXray backend is running",
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# ---------------------------------------------------------------------------
# Signup / Login
# ---------------------------------------------------------------------------

@app.post("/signup", status_code=201)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = auth.register_user(db, user_in)

    return {
        "message": "User created successfully",
        "user_id": user.id,
    }

@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = auth.authenticate_user(
        db,
        form_data.username,
        form_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    access_token = auth.create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

# ---------------------------------------------------------------------------
# Repo validation
# ---------------------------------------------------------------------------

def validate_repo(repo_id: str, user_id: int):
    from Repo_clone import get_repo_status

    status_info = get_repo_status(repo_id, user_id)

    if status_info.get("status") == "not_found":
        raise HTTPException(
            status_code=404,
            detail="Repository not found or unauthorized.",
        )

    return status_info

# ---------------------------------------------------------------------------
# User repositories
# ---------------------------------------------------------------------------

@app.get("/api/my-repos")
def get_user_repos(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repos = db.query(models.Repository).filter(
        models.Repository.owner_id == current_user.id
    ).all()

    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "repositories": [
            {
                "repo_id": repo.id,
                "repo_name": repo.repo_name,
                "user_id": current_user.id,
                "status": repo.status,
            }
            for repo in repos
        ],
    }

# ---------------------------------------------------------------------------
# Ingest repository
# ---------------------------------------------------------------------------

@app.post("/api/ingest")
def ingest_repository(
    request: schemas.IngestRequest,
    current_user: models.User = Depends(get_current_user),
):
    from Repo_clone import start_clone_job

    url = str(request.github_url).strip()

    if "github.com" not in url:
        raise HTTPException(
            status_code=400,
            detail="Only GitHub URLs are supported.",
        )

    repo_id = str(uuid.uuid4())

    try:
        start_clone_job(url, repo_id, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start clone job: {str(e)}",
        )

    websocket_base = BACKEND_URL.replace("https://", "wss://").replace(
        "http://",
        "ws://",
    )

    return {
        "status": "queued",
        "repo_id": repo_id,
        "websocket_endpoint": f"{websocket_base}/api/ws/status/{repo_id}",
        "tree_endpoint": f"/api/tree/{repo_id}",
        "graph_endpoint": f"/api/graph/{repo_id}",
        "summary_endpoint": f"/api/summary/{repo_id}",
    }

# ---------------------------------------------------------------------------
# File summary
# ---------------------------------------------------------------------------

@app.post("/api/file-summary")
def get_or_create_file_summary(
    request: FileSummaryRequest,
    current_user: models.User = Depends(get_current_user),
):
    from sample_groq import summarize_file

    validate_repo(request.repo_id, current_user.id)

    try:
        return summarize_file(
            repo_id=request.repo_id,
            file_path=request.file_path,
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# WebSocket status
# ---------------------------------------------------------------------------

@app.websocket("/api/ws/status/{repo_id}")
async def repo_status_ws(
    websocket: WebSocket,
    repo_id: str,
    token: str,
    db: Session = Depends(get_db),
):
    await websocket.accept()

    try:
        payload = jwt.decode(
            token,
            auth.SECRET_KEY,
            algorithms=[auth.ALGORITHM],
        )

        username = payload.get("sub")

        if not username:
            await websocket.close(code=1008)
            return

        user = db.query(models.User).filter(
            models.User.username == username
        ).first()

        if not user:
            await websocket.close(code=1008)
            return

        from Repo_clone import get_repo_status

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
        await websocket.close(code=1008)

    except WebSocketDisconnect:
        print(f"[WS] disconnected: {repo_id}")

    except Exception as e:
        print(f"[WS] error: {e}")
        await websocket.close(code=1011)

# ---------------------------------------------------------------------------
# Tree
# ---------------------------------------------------------------------------

@app.get("/api/tree/{repo_id}")
def get_repo_tree(
    repo_id: str,
    current_user: models.User = Depends(get_current_user),
):
    status_info = validate_repo(repo_id, current_user.id)

    if status_info.get("status") not in ["tree_ready", "success", "error"]:
        raise HTTPException(
            status_code=400,
            detail="Tree not ready.",
        )

    path = os.path.join(DATA_DIR, f"{repo_id}.json")

    if not os.path.exists(path):
        raise HTTPException(
            status_code=500,
            detail="Tree file missing.",
        )

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

@app.get("/api/graph/{repo_id}")
def get_repo_graph(
    repo_id: str,
    current_user: models.User = Depends(get_current_user),
):
    status_info = validate_repo(repo_id, current_user.id)

    if status_info.get("status") != "success":
        raise HTTPException(
            status_code=400,
            detail="Graph not ready.",
        )

    path = os.path.join(DATA_DIR, f"{repo_id}_graph.json")

    if not os.path.exists(path):
        raise HTTPException(
            status_code=500,
            detail="Graph file missing.",
        )

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

@app.get("/api/summary/{repo_id}")
def get_repo_summary(
    repo_id: str,
    current_user: models.User = Depends(get_current_user),
):
    status_info = validate_repo(repo_id, current_user.id)

    if status_info.get("status") != "success":
        raise HTTPException(
            status_code=400,
            detail="Summary not ready.",
        )

    path = os.path.join(DATA_DIR, f"{repo_id}_analysis.json")

    if not os.path.exists(path):
        raise HTTPException(
            status_code=500,
            detail="Summary file missing.",
        )

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ---------------------------------------------------------------------------
# File code
# ---------------------------------------------------------------------------

@app.get("/api/file-code/{repo_id}")
def get_file_code(
    repo_id: str,
    file_path: str,
    current_user: models.User = Depends(get_current_user),
):
    status_info = validate_repo(repo_id, current_user.id)

    repo_clone_path = status_info.get("clone_path")

    if not repo_clone_path:
        raise HTTPException(
            status_code=500,
            detail="Missing clone path.",
        )

    full_path = os.path.realpath(
        os.path.join(repo_clone_path, file_path)
    )
    base_path = os.path.realpath(repo_clone_path)

    if not full_path.startswith(base_path):
        raise HTTPException(
            status_code=400,
            detail="Invalid file path.",
        )

    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=404,
            detail="File not found.",
        )

    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
        return {
            "repo_id": repo_id,
            "file_path": file_path,
            "code": f.read(),
        }

# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------

@app.post("/api/change-password")
def change_password(
    request: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(
        request.old_password,
        current_user.hashed_password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Wrong old password.",
        )

    if request.old_password == request.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password cannot be same as old password.",
        )

    auth.update_user_password(db, current_user, request.new_password)

    return {"message": "Password updated"}

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )