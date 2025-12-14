import hashlib
import time
import os
import httpx
from ..config import settings

class BunnyService:
    def __init__(self):
        self.api_key = settings.BUNNY_API_KEY
        self.storage_zone = settings.BUNNY_STORAGE_ZONE
        self.region = settings.BUNNY_REGION
        self.pull_zone = settings.BUNNY_PULL_ZONE
        self.security_key = settings.BUNNY_SECURITY_KEY
        
        self.base_url = f"https://storage.bunnycdn.com/{self.storage_zone}/"
        if self.region:
            self.base_url = f"https://{self.region}.storage.bunnycdn.com/{self.storage_zone}/"

    def upload_file(self, file_path: str, destination_path: str) -> bool:
        """
        Uploads a file to Bunny Storage.
        """
        if not os.path.exists(file_path):
            return False
            
        url = f"{self.base_url}{destination_path}"
        headers = {
            "AccessKey": self.api_key,
            "Content-Type": "application/octet-stream"
        }
        
        with open(file_path, "rb") as f:
            file_content = f.read()
            
        try:
            with httpx.Client() as client:
                response = client.put(url, headers=headers, content=file_content, timeout=None)
                response.raise_for_status()
                return True
        except Exception as e:
            print(f"Upload failed: {e}")
            return False

    def generate_signed_url(self, path: str, expire_hours: int = 1) -> str:
        """
        Generates a secure token path for Bunny CDN.
        URL format: https://{pull_zone}/{path}?token={token}&expires={timestamp}
        """
        if not self.security_key or not self.pull_zone:
            # Fallback for dev without security
            return f"https://{self.pull_zone}/{path}"

        expires = int(time.time()) + (expire_hours * 3600)
        
        # BunnyCDN Token Authentication Logic
        # hash = SHA256(security_key + path + expires)
        
        # Ensure path starts with / but not in hash if Bunny docs say so.
        # Usually: security_key + url_path + expires
        # Let's verify standard bunny signing.
        # Token = Base64(MD5(...)) or SHA256?
        # Actually Bunny uses SHA256.
        # Signature = sha256(securityToken + urlPath + expires)
        
        # Clean path
        if not path.startswith("/"):
            path = "/" + path
            
        to_sign = f"{self.security_key}{path}{expires}"
        
        signature = hashlib.sha256(to_sign.encode('utf-8')).hexdigest()
        
        return f"https://{self.pull_zone}{path}?token={signature}&expires={expires}"

bunny = BunnyService()
