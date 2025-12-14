from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Bunny.net
    BUNNY_API_KEY: Optional[str] = None
    BUNNY_STORAGE_ZONE: Optional[str] = None
    BUNNY_REGION: Optional[str] = None
    BUNNY_PULL_ZONE: Optional[str] = None
    BUNNY_SECURITY_KEY: Optional[str] = None

    # Security
    CORS_ORIGINS: list[str] = [
        "https://videco-stream.online",
        "http://localhost:3000", # Keep localhost for development
    ]
    DOCS_ENABLED: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
