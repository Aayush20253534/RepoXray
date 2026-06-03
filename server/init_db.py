from database import engine, Base
# You MUST import your models here so they register themselves with Base
from models import User, Repository 

print("Scanning models...")
# This looks at everything registered to 'Base' and creates them
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Sync complete.")