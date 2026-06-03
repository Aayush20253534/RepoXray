import os
import json
import uuid
import asyncio

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
from dotenv import load_dotenv

# -----------------------------
# ENV SAFETY CHECK
# -----------------------------
load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    raise RuntimeError("❌ Missing GROQ_API_KEY in environment variables")

# -----------------------------
# LOCAL IMPORTS (lightweight only)
# -----------------------------
import models
import schemas
import auth
from database import SessionLocal

# NOTE: heavy imports are moved inside endpoints

# -----------------------------
# APP INIT
# -----------------------------
app = FastAPI(
    title="Explain My Codebase API",
    description="Database-backed repository ingestion API with real-time WebSocket tracking.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# -----------------------------
# DB SESSION
# -----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# MODELS
# -----------------------------
class FileSummaryRequest(BaseModel):
    repo_id: str
    file_path: str


# -----------------------------
# AUTH HELPERS
# -----------------------------
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
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = (
        db.query(models.User)
        .filter(models.User.username == username)
        .first()
    )

    if user is None:
        raise credentials_exception

    return user


# -----------------------------
# SIGNUP / LOGIN
# -----------------------------
@app.post("/signup", status_code=201)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = auth.register_user(db, user_in)
    return {"message": "User created successfully", "user_id": user.id}


@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)

    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id}
    )

    return {"access_token": access_token, "token_type": "bearer"}


# -----------------------------
# REPO VALIDATION (reusable)
# -----------------------------
def validate_repo(repo_id: str, user_id: int, db: Session):
    from Repo_clone import get_repo_status  # add this line
    status_info = get_repo_status(repo_id, user_id)

    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")

    return status_info


# -----------------------------
# USER REPOS
# -----------------------------
@app.get("/api/my-repos")
def get_user_repos(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repos = (
        db.query(models.Repository)
        .filter(models.Repository.owner_id == current_user.id)
        .all()
    )

    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "repositories": [
            {
                "repo_id": repo.id,
                "repo_name": repo.repo_name,
                "user_id": current_user.id,
            }
            for repo in repos
        ],
    }


# -----------------------------
# INGEST REPO
# -----------------------------
@app.post("/api/ingest")
def ingest_repository(
    request: schemas.IngestRequest,
    current_user: models.User = Depends(get_current_user),
):
    from Repo_clone import start_clone_job  # lazy import

    url = str(request.github_url).strip()

    if "github.com" not in url:
        raise HTTPException(status_code=400, detail="Only GitHub URLs are supported.")

    repo_id = str(uuid.uuid4())

    try:
        start_clone_job(url, repo_id, current_user.id)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to start clone job.")

    return {
        "status": "queued",
        "repo_id": repo_id,
        "websocket_endpoint": f"ws://localhost:8000/api/ws/status/{repo_id}",
        "tree_endpoint": f"/api/tree/{repo_id}",
        "graph_endpoint": f"/api/graph/{repo_id}",
        "summary_endpoint": f"/api/summary/{repo_id}",
    }


# -----------------------------
# FILE SUMMARY (AI)
# -----------------------------
@app.post("/api/file-summary")
def get_or_create_file_summary(
    request: FileSummaryRequest,
    current_user: models.User = Depends(get_current_user),
):
    from Repo_clone import get_repo_status
    from sample_groq import summarize_file

    status_info = validate_repo(request.repo_id, current_user.id, None)

    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repo not found.")

    try:
        return summarize_file(
            repo_id=request.repo_id,
            file_path=request.file_path,
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# WEBSOCKET STATUS
# -----------------------------
@app.websocket("/api/ws/status/{repo_id}")
async def repo_status_ws(
    websocket: WebSocket,
    repo_id: str,
    token: str,
    db: Session = Depends(get_db),
):
    await websocket.accept()

    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")

        user = (
            db.query(models.User)
            .filter(models.User.username == username)
            .first()
        )

        if not user:
            await websocket.close(code=1008)
            return

        last_status = None

        from Repo_clone import get_repo_status  # lazy import

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


# -----------------------------
# TREE
# -----------------------------
@app.get("/api/tree/{repo_id}")
def get_repo_tree(
    repo_id: str,
    current_user: models.User = Depends(get_current_user),
):
    from Repo_clone import get_repo_status

    status_info = get_repo_status(repo_id, current_user.id)

    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404)

    if status_info.get("status") not in ["tree_ready", "success", "error"]:
        raise HTTPException(status_code=400, detail="Tree not ready.")

    path = os.path.join("Repo_Codes_data", f"{repo_id}.json")

    if not os.path.exists(path):
        raise HTTPException(status_code=500, detail="Tree file missing.")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------
# GRAPH
# -----------------------------
@app.get("/api/graph/{repo_id}")
def get_repo_graph(
    repo_id: str,
    current_user: models.User = Depends(get_current_user),
):
    from Repo_clone import get_repo_status

    status_info = get_repo_status(repo_id, current_user.id)

    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404)

    if status_info.get("status") != "success":
        raise HTTPException(status_code=400, detail="Graph not ready.")

    path = os.path.join("Repo_Codes_data", f"{repo_id}_graph.json")

    if not os.path.exists(path):
        raise HTTPException(status_code=500, detail="Graph file missing.")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------
# SUMMARY
# -----------------------------
@app.get("/api/summary/{repo_id}")
def get_repo_summary(
    repo_id: str,
    current_user: models.User = Depends(get_current_user),
):
    from Repo_clone import get_repo_status

    status_info = get_repo_status(repo_id, current_user.id)

    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404)

    if status_info.get("status") != "success":
        raise HTTPException(status_code=400, detail="Summary not ready.")

    path = os.path.join("Repo_Codes_data", f"{repo_id}_analysis.json")

    if not os.path.exists(path):
        raise HTTPException(status_code=500, detail="Summary file missing.")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------
# FILE CODE
# -----------------------------
@app.get("/api/file-code/{repo_id}")
def get_file_code(
    repo_id: str,
    file_path: str,
    current_user: models.User = Depends(get_current_user),
):
    from Repo_clone import get_repo_status

    status_info = get_repo_status(repo_id, current_user.id)

    if status_info.get("status") == "not_found":
        raise HTTPException(status_code=404)

    repo_clone_path = status_info.get("clone_path")

    if not repo_clone_path:
        raise HTTPException(status_code=500, detail="Missing clone path.")

    full_path = os.path.realpath(os.path.join(repo_clone_path, file_path))
    base_path = os.path.realpath(repo_clone_path)

    if not full_path.startswith(base_path):
        raise HTTPException(status_code=400)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404)

    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
        return {
            "repo_id": repo_id,
            "file_path": file_path,
            "code": f.read(),
        }


# -----------------------------
# CHANGE PASSWORD
# -----------------------------
@app.post("/api/change-password")
def change_password(
    request: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Wrong old password")

    if request.old_password == request.new_password:
        raise HTTPException(status_code=400, detail="Password reused")

    auth.update_user_password(db, current_user, request.new_password)

    return {"message": "Password updated"}


# -----------------------------
# ENTRYPOINT
# -----------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)