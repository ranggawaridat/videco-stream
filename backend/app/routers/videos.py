from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import tempfile
from datetime import date
from .. import database, models, schemas, auth
from ..services.bunny import bunny
# from ..tasks import process_video

router = APIRouter(
    prefix="/videos",
    tags=["videos"]
)

@router.get("/", response_model=List[schemas.VideoResponse])
def get_videos(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    videos = db.query(models.Video).filter(models.Video.status == models.VideoStatus.COMPLETED).offset(skip).limit(limit).all()
    # Sign URLs for thumbnails
    for vid in videos:
        if vid.thumbnail_url:
            vid.thumbnail_url = bunny.generate_signed_url(vid.thumbnail_url, expire_hours=4)
    return videos

@router.get("/{video_id}", response_model=schemas.VideoResponse)
def get_video(video_id: int, db: Session = Depends(database.get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Generate signed URL for streaming
    if video.storage_path:
        video.hls_playlist_url = bunny.generate_signed_url(video.storage_path) # Assuming storage_path is the file path
    
    if video.thumbnail_url:
        video.thumbnail_url = bunny.generate_signed_url(video.thumbnail_url)
        
    return video

@router.post("/upload", response_model=schemas.VideoResponse)
async def upload_video(
    title: str,
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    # Security: Max File Size Limit (200MB)
    MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
    file_size = 0

    # FastAPI UploadFile is a SpooledTemporaryFile; try to determine size
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
    except Exception:
        file_size = None

    if file_size and file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 200MB.")

    # Save file temporarily
    import re
    orig_name = os.path.basename(file.filename or "")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", orig_name)[:200]
    file_ext = os.path.splitext(safe_name)[1] or ""

    # Use a spooled temporary file name with the original extension preserved
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
    temp_file_path = temp_file.name
    temp_file.close()
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail="Could not save uploaded file")

    # Try to get actual size from the saved file if earlier probe failed
    try:
        actual_size = os.path.getsize(temp_file_path)
    except Exception:
        actual_size = None

    # Create Database Entry
    new_video = models.Video(
        title=title,
        user_id=current_user.id,
        status=models.VideoStatus.PENDING,
        file_size=actual_size or file_size
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    # Upload to Bunny CDN
    try:
        from ..services.transcoder import transcoder
        
        # Use video ID as filename for security
        final_filename = f"{new_video.id}{file_ext}"

        # Generate Thumbnail (lightweight operation, kept for UI)
        thumb_filename = f"{new_video.id}_thumb.jpg"
        thumb_path = os.path.join(tempfile.gettempdir(), thumb_filename)
        
        # Try generate thumb, ignore if fails to not block upload
        try:
            transcoder.generate_thumbnail(temp_file_path, thumb_path)
            # Upload Thumb
            bunny_thumb_path = f"thumbnails/{thumb_filename}"
            if bunny.upload_file(thumb_path, bunny_thumb_path):
                new_video.thumbnail_url = bunny_thumb_path
        except Exception as e:
            print(f"Thumb Gen Error: {e}")

        # Upload Video directly without transcoding
        safe_storage_name = os.path.basename(final_filename)
        bunny_path = f"videos/{safe_storage_name}"

        if bunny.upload_file(temp_file_path, bunny_path):
            new_video.storage_path = bunny_path
            new_video.status = models.VideoStatus.COMPLETED
            db.commit()
            db.refresh(new_video)
        else:
            new_video.status = models.VideoStatus.FAILED
            db.commit()
            raise HTTPException(status_code=500, detail="Failed to upload video to storage")
            
        # Cleanup Generated Files
        if os.path.exists(thumb_path):
            os.remove(thumb_path)

    except Exception as e:
        new_video.status = models.VideoStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return new_video
