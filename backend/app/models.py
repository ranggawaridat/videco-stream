from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class VideoStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.USER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    videos = relationship("Video", back_populates="owner")
    quotas = relationship("UploadQuota", back_populates="user")

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Processing Status
    status = Column(String, default=VideoStatus.PENDING)
    
    # Bunny.net details
    storage_path = Column(String, nullable=True) # ID or path in bunny
    hls_playlist_url = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    
    # Metadata
    duration = Column(Integer, nullable=True) # in seconds
    resolution = Column(String, nullable=True) # e.g. "720p"
    file_size = Column(Integer, nullable=True) # in bytes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="videos")

class UploadQuota(Base):
    """Tracks daily upload count per user"""
    __tablename__ = "upload_quotas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=func.current_date())
    count = Column(Integer, default=0)

    user = relationship("User", back_populates="quotas")
