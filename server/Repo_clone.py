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
from models import Repository  

# Import the X-ray functions
from repo_tree import run_repo_xray 
from dependency_graph import build_dependency_graph  # <-- ADDED NEW PASS 2 FUNCTION
import concurrent.futures
from Summary import run_summary_generation  # <-- ADD THIS IMPORT

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
    """Clones a repository, cleans it, runs the two-pass X-ray, and updates the table at each step."""
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
            ["git", "clone", "--depth", "1", github_url, clone_path_str],
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

            try:
                # 2. Run Repo X-Ray (PASS 1: Groq extracts nodes)
                update_job_status(repo_id, "analyzing_tree", "Clone successful. Extracting files and generating directory tree...", clone_path_str)
                print(f"[X-RAY] Starting Pass 1 for {repo_id}")
                
                run_repo_xray(repo_id, clone_path_str, output_dir="./Repo_Codes_data")
                
                # ---> CRITICAL UPDATE: Signal frontend that the flat Tree is ready! <---
                update_job_status(repo_id, "tree_ready", "Directory tree complete! Generating dependencies and summary...", clone_path_str)
                
                # 3. Map Dependencies & Generate Summary SIMULTANEOUSLY
                print(f"[PIPELINE] Starting Pass 2 and Summary generation concurrently for {repo_id}...")
                
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    # Submit both jobs to the thread pool
                    future_graph = executor.submit(build_dependency_graph, repo_id, data_dir="./Repo_Codes_data")
                    future_summary = executor.submit(run_summary_generation, repo_id, data_dir="./Repo_Codes_data")
                    
                    # Wait for both to complete. If either raises an exception, it will be caught here.
                    future_graph.result()
                    future_summary.result()
                
                # 4. Mark as completely successful
                update_job_status(repo_id, "success", "Repository completely analyzed, mapped, and summarized.", clone_path_str)
                print(f"[SUCCESS] Pipeline complete for {repo_id}")
                
            except Exception as pipeline_error:
                print(f"[PIPELINE ERROR] Analysis failed for {repo_id}: {pipeline_error}")
                update_job_status(repo_id, "error", f"Clone succeeded, but AI analysis failed: {pipeline_error}", clone_path_str)

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
            owner_id=owner_id, 
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
    import time # Needed for the test block
    
    test_github_url = "https://github.com/octocat/Hello-World.git"
    test_repo_id = str(uuid.uuid4())
    test_owner_id = 1  
    
    print(f"--- Starting Test for Repo Clone ---")
    
    try:
        job_info = start_clone_job(test_github_url, test_repo_id, test_owner_id)
        
        while True:
            status_info = get_repo_status(test_repo_id, test_owner_id)
            current_status = status_info.get("status")
            print(f"[{current_status.upper()}] {status_info.get('message')}")
            
            if current_status in ["success", "error", "not_found"]:
                break
                
            time.sleep(3)
            
    except Exception as e:
        print(f"\nTest failed with exception: {e}")