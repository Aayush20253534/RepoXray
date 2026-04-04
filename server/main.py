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
from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import auth
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
        # Decode the JWT token
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Fetch the user from the database
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
    # Require the user to be logged in:
    current_user: models.User = Depends(get_current_user) 
):
    url = str(request.github_url).strip()
    
    if "github.com" not in url:
        raise HTTPException(status_code=400, detail="Only GitHub URLs are supported.")
    
    repo_id = str(uuid.uuid4())
    
    try:
        # Pass the logged-in user's integer ID to link the database record
        start_clone_job(url, repo_id, current_user.id) 
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to initialize clone job in database.")
    
    return {
        "status": "queued",
        "repo_id": repo_id,
        "status_endpoint": f"/api/status/{repo_id}",
        "tree_endpoint": f"/api/tree/{repo_id}"
    }

@app.get("/api/status/{repo_id}")
async def check_repo_status(
    repo_id: str,
    # Require the user to be logged in:
    current_user: models.User = Depends(get_current_user)
):
    # Pass the user ID to ensure they only check their own repos
    status = get_repo_status(repo_id, current_user.id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized")
    return status

@app.get("/api/tree/{repo_id}")
async def get_repo_tree(
    repo_id: str,
    # Protect this route too:
    current_user: models.User = Depends(get_current_user)
):
    # First, verify this user actually owns this repo
    status = get_repo_status(repo_id, current_user.id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Repository not found or unauthorized.")
    
    if status.get("status") != "success":
        raise HTTPException(
            status_code=400, 
            detail=f"Data not ready. Current status: {status.get('status')}"
        )

    file_path = os.path.join("Repo_Codes_data", f"{repo_id}.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=500, 
            detail="Database says success, but the JSON file is missing from the server."
        )
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree_data = json.load(f)
        return tree_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading tree data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

