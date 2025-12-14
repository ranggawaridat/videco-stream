import subprocess
import os
import json

class TranscoderService:
    @staticmethod
    def get_video_metadata(file_path: str):
        """
        Returns dict with duration, resolution, etc.
        """
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            data = json.loads(result.stdout)
            
            video_stream = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
            duration = float(data["format"]["duration"])
            
            width = video_stream["width"] if video_stream else 0
            height = video_stream["height"] if video_stream else 0
            
            return {
                "duration": duration,
                "width": width,
                "height": height,
                "resolution": f"{width}x{height}"
            }
        except Exception as e:
            print(f"Error probing video: {e}")
            return None

    @staticmethod
    def generate_thumbnail(file_path: str, output_path: str, time_offset: str = "00:00:01"):
        # Seek first (faster) and write a single image frame.
        # Use explicit image2 format and frames:v for compatibility.
        cmd = [
            "ffmpeg",
            "-ss", time_offset,
            "-i", file_path,
            "-frames:v", "1",
            "-q:v", "2",  # good quality JPEG
            "-f", "image2",
            "-y",
            output_path
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            # Log ffmpeg stderr for debugging and re-raise
            print(f"ffmpeg thumbnail error: {e.stderr}")
            raise

    @staticmethod
    def transcode_to_mp4(file_path: str, output_path: str):
        """
        Transcodes to 720p H.264
        """
        cmd = [
            "ffmpeg",
            "-i", file_path,
            "-vf", "scale=-2:720", # Scale height to 720, keep aspect ratio
            "-c:v", "libx264",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-y",
            output_path
        ]
        subprocess.run(cmd, check=True)

transcoder = TranscoderService()
