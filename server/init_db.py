from database import engine, Base
from models import User, Repository # Corrected imports

Base.metadata.create_all(bind=engine)