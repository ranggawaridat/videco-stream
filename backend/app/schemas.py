from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None

from pydantic import BaseModel, EmailStr, Field

# ...

class UserCreate(UserBase):
    password: str = Field(..., max_length=70, description="Password must be less than 70 characters")

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None

class VideoCreate(VideoBase):
    pass

class VideoResponse(VideoBase):
    id: int
    status: str
    thumbnail_url: Optional[str]
    hls_playlist_url: Optional[str]
    duration: Optional[int]
    resolution: Optional[str]
    view_count: Optional[int] = 0
    created_at: datetime
    
    class Config:
        from_attributes = True
