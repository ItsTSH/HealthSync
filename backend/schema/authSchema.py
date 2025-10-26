from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class UserCreate(BaseModel):
    username: str
    email_id: EmailStr
    password: str

class UserLogin(BaseModel):
    email_id: EmailStr
    password: str

class UserResponse(BaseModel):
    uuid: UUID
    username: str
    email_id: EmailStr

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"