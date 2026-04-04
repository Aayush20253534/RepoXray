from pydantic import BaseModel, EmailStr, Field


class IngestRequest(BaseModel):
    github_url: str 

class UserCreate(BaseModel):
    name: str
    username: str
    # email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)

class UserLogin(BaseModel):
    username_or_email: str
    password: str

# Optional: Add a schema for the response to hide the hashed password
class UserOut(BaseModel):
    id: int
    user_id: str
    username: str
    # email: EmailStr

    class Config:
        from_attributes = True