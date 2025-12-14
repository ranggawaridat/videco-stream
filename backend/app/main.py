from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, videos
import time
from sqlalchemy.exc import OperationalError


# Create tables on startup, with retries while DB is initializing
def create_tables_with_retry(retries: int = 12, delay: float = 1.0):
    for attempt in range(1, retries + 1):
        try:
            # Try to connect briefly to ensure DB is ready
            with engine.connect():
                Base.metadata.create_all(bind=engine)
                return
        except OperationalError:
            if attempt == retries:
                raise
            time.sleep(delay)



app = FastAPI(title="Videc Streaming API")


@app.on_event("startup")
def on_startup():
    # Ensure DB tables exist; wait for DB if necessary
    create_tables_with_retry()

# Allow all origins for simplicity (or configure specific domains in env)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(videos.router)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    # Prevent site from being embedded in iframes (Anti-Clickjacking)
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    # Prevent MIME sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Control referrer information
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.get("/")
def read_root():
    return {"message": "Videc API is running"}
