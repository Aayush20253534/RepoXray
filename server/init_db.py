from database import engine, Base
from models import UserRepo

Base.metadata.create_all(bind=engine)