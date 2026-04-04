from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    name = Column(String)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True)
    hashed_password = Column(String)
    
    # Establishes a 1-to-Many relationship: One user can have many repositories
    repositories = relationship("Repository", back_populates="owner")

class Repository(Base):
    __tablename__ = "repositories"

    # Uses the UUID string generated in main.py
    id = Column(String, primary_key=True, index=True) 
    
    # Foreign key linking back to the User table (Nullable for now if your API doesn't require auth yet)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    
    # Repository Details
    github_url = Column(String, index=True)
    repo_name = Column(String, nullable=True)
    
    # Cloning Job Tracking (Consolidated into this table)
    status = Column(String, default="queued") # 'queued', 'running', 'success', 'error'
    message = Column(Text)
    clone_path = Column(String)

    # Establishes the reverse relationship back to the User
    owner = relationship("User", back_populates="repositories")