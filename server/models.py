from sqlalchemy import Column, Integer, String, JSON
from database import Base

class UserRepo(Base):
    __tablename__ = "user_repos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    name = Column(String)
    username = Column(String)
    hashed_password = Column(String)
    repo_name = Column(String)
    status = Column(String)  
