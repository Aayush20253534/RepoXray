import os
import stat
import time
import uuid
import subprocess
import threading
import shutil
from pathlib import Path
from typing import Dict
from database import SessionLocal
from models import Repository  # Importing the new unified table

# Import the X-ray function we created earlier
from repo_tree import run_repo_xray 

# Base directory where cloned repos will be stored
REPOS_BASE_DIR = os.path.join(os.path.dirname(__file__), "cloned_repos")

def ensure_base_directory():
    os.makedirs(REPOS_BASE_DIR, exist_ok=True)

def get_repo_clone_path(repo_id: str) -> Path:
    return Path(REPOS_BASE_DIR) / repo_id


def _handle_remove_readonly(func, path, exc_info):
    """shutil.rmtree callback to handle read-only files on Windows."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        raise exc_info[1]

def remove_git_metadata(clone_path: Path) -> None:
    """Remove .git metadata from a cloned repository for safety."""
    git_path = clone_path / ".git"

    if git_path.is_dir():
        # Retry a few times because antivirus/indexers can briefly lock files on Windows.
        last_error = None
        for _ in range(3):
            try:
                shutil.rmtree(git_path, onerror=_handle_remove_readonly)
                last_error = None
                break
            except PermissionError as err:
                last_error = err
                time.sleep(0.25)

        if last_error is not None and git_path.exists():
            raise last_error
    elif git_path.exists() or git_path.is_symlink():
        os.chmod(git_path, stat.S_IWRITE)
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

def start_clone_job(github_url: str, repo_id: str, owner_id: int) -> Dict[str, str]:
    """Creates the Repository record and spawns the background worker."""
    clone_path = str(get_repo_clone_path(repo_id))
    
    db = SessionLocal()
    try:
        repo_name = github_url.rstrip('/').split('/')[-1].replace('.git', '')
        
        new_repo = Repository(
            id=repo_id,
            owner_id=owner_id, # <--- Link to the user who requested it
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

    # The rest of this function remains exactly the same
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

def get_repo_status(repo_id: str, owner_id: int) -> Dict[str, str]:
    """Queries the Repository table for the current status, verifying ownership."""
    db = SessionLocal()
    try:
        # Check BOTH the repo_id and the owner_id so users can't snoop on other users' repos
        repo = db.query(Repository).filter(
            Repository.id == repo_id, 
            Repository.owner_id == owner_id
        ).first()
        
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
            "message": "Repository not found or unauthorized",
            "clone_path": ""
        }
    finally:
        db.close()

if __name__ == "__main__":
    # Test configuration
    test_github_url = "https://github.com/Aayush20253534/RepoXray.git"
    test_repo_id = str(uuid.uuid4())
    test_owner_id = 1  # Dummy owner ID for testing
    
    print(f"--- Starting Test for Repo Clone ---")
    print(f"Target URL: {test_github_url}")
    print(f"Repo ID: {test_repo_id}")
    print(f"Owner ID: {test_owner_id}\n")
    
    try:
        # Start the clone job
        job_info = start_clone_job(test_github_url, test_repo_id, test_owner_id)
        print(f"Job Initialized: {job_info}\n")
        
        # Poll status until success or error
        while True:
            status_info = get_repo_status(test_repo_id, test_owner_id)
            current_status = status_info.get("status")
            
            print(f"[{current_status.upper()}] {status_info.get('message')}")
            
            if current_status in ["success", "error", "not_found"]:
                break
                
            time.sleep(3) # Wait before checking again
            
        print("\n--- Test Complete ---")
        
    except Exception as e:
        print(f"\nTest failed with exception: {e}")
        print("Note: Ensure your database (SessionLocal, Repository) is fully initialized before running this test.")