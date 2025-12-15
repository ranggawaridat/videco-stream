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
    # Security: Anti-Abuse Measures

    # 1. Max File Size Limit (200MB)
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

    # 2. Spam Protection (Cooldown: 1 minute between uploads)
    last_video = db.query(models.Video).filter(
        models.Video.user_id == current_user.id
    ).order_by(models.Video.created_at.desc()).first()

    if last_video and last_video.created_at:
        from datetime import datetime, timedelta, timezone
        if datetime.now(timezone.utc) - last_video.created_at < timedelta(minutes=1):
            raise HTTPException(status_code=429, detail="You are uploading too fast. Please wait a minute before uploading again.")

    # 3. Save file temporarily
    # Create temp file
    # Sanitize original filename and extension
    import re
    orig_name = os.path.basename(file.filename or "")
    # Replace any unsafe characters
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

    # 4. Create Database Entry
    new_video = models.Video(
        title=title,
        user_id=current_user.id,
        status=models.VideoStatus.PENDING,
        file_size=actual_size or file_size
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    # 4. Upload to Bunny (Direct)
    # 4. Upload to Bunny (Direct)
    # 3. Process & Upload (Direct with Auto-Convert)
    try:
        from ..services.transcoder import transcoder
        
        # Determine strict file to upload
        file_to_upload_path = temp_file_path
        # Use a safer stored filename (by id). Avoid using raw client filenames for storage paths.
        final_filename = f"{new_video.id}{file_ext}"
        
        # If NOT MP4, Convert it synchronously (So it can be played)
        file_ext_lower = file_ext.lower()
        if file_ext_lower != ".mp4":
            converted_filename = f"{new_video.id}.mp4"
            converted_path = os.path.join(tempfile.gettempdir(), converted_filename)
            try:
                # Convert
                transcoder.transcode_to_mp4(temp_file_path, converted_path)
                # Swap file to upload
                file_to_upload_path = converted_path
                final_filename = f"{new_video.id}.mp4"
            except Exception as e:
                print(f"Conversion Failed: {e}")
                # Fallback to original (will store but might not play)
                pass

        # A. Probe Metadata (from the file we are about to upload)
        meta = transcoder.get_video_metadata(file_to_upload_path)
        # If probing fails or no video stream is found, reject the upload as invalid
        if not meta or not meta.get("duration"):
            new_video.status = models.VideoStatus.FAILED
            db.commit()
            # cleanup and return error
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid video or could not be processed.")

        new_video.duration = int(meta["duration"])
        new_video.resolution = meta["resolution"]

        # B. Generate Thumbnail
        thumb_filename = f"{new_video.id}_thumb.jpg"
        thumb_path = os.path.join(tempfile.gettempdir(), thumb_filename)
        
        # Try generate thumb, ignore if fails to not block upload
        try:
            transcoder.generate_thumbnail(file_to_upload_path, thumb_path)
            # Upload Thumb
            bunny_thumb_path = f"thumbnails/{thumb_filename}"
            if bunny.upload_file(thumb_path, bunny_thumb_path):
                new_video.thumbnail_url = bunny_thumb_path
        except Exception as e:
            print(f"Thumb Gen Error: {e}")

        # C. Upload Video
        # Use sanitized storage path (no user-controlled path segments)
        safe_storage_name = os.path.basename(final_filename)
        bunny_path = f"videos/{safe_storage_name}"

        if bunny.upload_file(file_to_upload_path, bunny_path):
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
        if file_to_upload_path != temp_file_path and os.path.exists(file_to_upload_path):
            os.remove(file_to_upload_path)

    except Exception as e:
        new_video.status = models.VideoStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return new_video
