from database import engine, Base
from models import User, Repository

def sync_database():
    print("Scanning models...")
    Base.metadata.create_all(bind=engine)
    print("Sync complete.")

if __name__ == "__main__":
    sync_database()