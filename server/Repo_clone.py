import os
import subprocess
import threading
import shutil
from pathlib import Path
from typing import Dict
from database import SessionLocal
from models import Repository  # Importing the new unified table

# Import the X-ray function we created earlier
from RepoXray import run_repo_xray 

# Base directory where cloned repos will be stored
REPOS_BASE_DIR = os.path.join(os.path.dirname(__file__), "cloned_repos")

def ensure_base_directory():
    os.makedirs(REPOS_BASE_DIR, exist_ok=True)

def get_repo_clone_path(repo_id: str) -> Path:
    return Path(REPOS_BASE_DIR) / repo_id

def remove_git_metadata(clone_path: Path) -> None:
    """Remove .git metadata from a cloned repository for safety."""
    git_path = clone_path / ".git"

    if git_path.is_dir():
        shutil.rmtree(git_path)
    elif git_path.exists() or git_path.is_symlink():
        git_path.unlink()

def update_job_status(repo_id: str, status: str, message: str, clone_path: str = "") -> None:
    """Thread-safe database update for the Repository status."""
    db = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if repo:
            repo.status = status
            repo.message = message
            if clone_path:
                repo.clone_path = clone_path
            db.commit()
    except Exception as e:
        print(f"[DB ERROR] Failed to update status for {repo_id}: {e}")
        db.rollback()
    finally:
        db.close()

def clone_repository(github_url: str, repo_id: str) -> None:
    """Clones a repository, cleans it, runs the X-ray, and updates the table at each step."""
    ensure_base_directory()
    clone_path = get_repo_clone_path(repo_id)
    clone_path_str = str(clone_path)

    if clone_path.exists():
        shutil.rmtree(clone_path)

    update_job_status(repo_id, "running", "Clone started", clone_path_str)
    print(f"[CLONE] Starting clone of {github_url} to {clone_path}")

    # Validate GitHub URL format
    if not github_url.startswith(("https://github.com/", "git@github.com:")):
        update_job_status(repo_id, "error", "Invalid GitHub URL format", clone_path_str)
        return

    try:
        # Clone the repository
        result = subprocess.run(
            ["git", "clone", "--depth", "1", github_url, clone_path_str], # Kept --depth 1 for speed
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode == 0:
            print(f"[CLONE] Successfully cloned {github_url}")
            
            # 1. Clean up .git metadata
            try:
                remove_git_metadata(clone_path)
            except Exception as cleanup_error:
                print(f"[CLONE] Failed to remove .git metadata for {repo_id}: {cleanup_error}")
                update_job_status(repo_id, "error", f"Repository cloned, but .git cleanup failed: {cleanup_error}", clone_path_str)
                return

            # 2. Run Repo X-Ray
            try:
                update_job_status(repo_id, "analyzing", "Clone successful. Running Codebase X-Ray...", clone_path_str)
                print(f"[X-RAY] Starting analysis for {repo_id}")
                
                # Triggers the parsing and saves JSON to Repo_Codes_data
                run_repo_xray(repo_id, clone_path_str, output_dir="./Repo_Codes_data")
                
                # 3. Mark as completely successful
                update_job_status(repo_id, "success", "Repository cloned, cleaned, and analyzed successfully.", clone_path_str)
                print(f"[SUCCESS] Pipeline complete for {repo_id}")
                
            except Exception as xray_error:
                print(f"[X-RAY ERROR] Analysis failed for {repo_id}: {xray_error}")
                update_job_status(repo_id, "error", f"Clone succeeded, but X-Ray analysis failed: {xray_error}", clone_path_str)

        else:
            print(f"[CLONE] Error cloning {github_url}: {result.stderr}")
            update_job_status(repo_id, "error", result.stderr.strip() or "Git clone failed", clone_path_str)
            
    except subprocess.TimeoutExpired:
        print(f"[CLONE] Timeout while cloning {github_url}")
        update_job_status(repo_id, "error", "Clone operation timed out (5 minutes exceeded)", clone_path_str)
    except Exception as e:
        print(f"[CLONE] Exception while cloning {github_url}: {str(e)}")
        update_job_status(repo_id, "error", f"Exception occurred: {str(e)}", clone_path_str)

def start_clone_job(github_url: str, repo_id: str) -> Dict[str, str]:
    """Creates the Repository record and spawns the background worker."""
    clone_path = str(get_repo_clone_path(repo_id))
    
    # 1. Create the unified Repository record
    db = SessionLocal()
    try:
        # We can extract a rough repo_name from the URL
        repo_name = github_url.rstrip('/').split('/')[-1].replace('.git', '')
        
        new_repo = Repository(
            id=repo_id,
            github_url=github_url,
            repo_name=repo_name,
            status="queued",
            message="Clone job queued",
            clone_path=clone_path
        )
        db.add(new_repo)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

    # 2. Start the background thread
    worker = threading.Thread(
        target=clone_repository,
        args=(github_url, repo_id),
        daemon=True,
    )
    worker.start()

    return {
        "repo_id": repo_id,
        "status": "queued",
        "clone_path": clone_path,
        "message": "Clone job started",
    }

def get_repo_status(repo_id: str) -> Dict[str, str]:
    """Queries the Repository table for the current status."""
    db = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if repo:
            return {
                "repo_id": repo.id,
                "repo_name": repo.repo_name,
                "status": repo.status,
                "message": repo.message,
                "clone_path": repo.clone_path
            }
        return {
            "repo_id": repo_id,
            "status": "not_found",
            "message": "Repository not found in database",
            "clone_path": ""
        }
    finally:
        db.close()