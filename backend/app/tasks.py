import os
import shutil
import tempfile
from .celery_worker import celery_app
from .database import SessionLocal
from .models import Video, VideoStatus
from .services.bunny import bunny
from .services.transcoder import transcoder

@celery_app.task(bind=True)
def process_video(self, video_id: int, file_path: str):
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    
    if not video:
        return # Should not happen

    try:
        video.status = VideoStatus.PROCESSING
        db.commit()

        # 1. Probe Metadata
        metadata = transcoder.get_video_metadata(file_path)
        if metadata:
            video.duration = int(metadata["duration"])
            video.resolution = metadata["resolution"]
        
        # 2. Generate Thumbnail
        thumb_filename = f"{video_id}_thumb.jpg"
        thumb_path = os.path.join(tempfile.gettempdir(), thumb_filename)
        transcoder.generate_thumbnail(file_path, thumb_path)
        
        # 3. Transcode (or just upload raw if already compatible, but let's transcode to safe MP4)
        output_filename = f"{video_id}_720p.mp4"
        output_path = os.path.join(tempfile.gettempdir(), output_filename)
        transcoder.transcode_to_mp4(file_path, output_path)
        
        # 4. Upload to Bunny
        # Upload Thumbnail
        bunny_thumb_path = f"thumbnails/{thumb_filename}"
        if bunny.upload_file(thumb_path, bunny_thumb_path):
            video.thumbnail_url = bunny_thumb_path # Store relative path for signing later or full URL if public
        
        # Upload Video
        bunny_video_path = f"videos/{output_filename}"
        if bunny.upload_file(output_path, bunny_video_path):
            video.storage_path = bunny_video_path
            video.status = VideoStatus.COMPLETED
        else:
            video.status = VideoStatus.FAILED

        db.commit()
    
    except Exception as e:
        print(f"Error processing video {video_id}: {e}")
        video.status = VideoStatus.FAILED
        db.commit()
    
    finally:
        # Cleanup local files
        if os.path.exists(file_path):
            os.remove(file_path)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        db.close()
