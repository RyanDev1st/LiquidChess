"""DriveService - Google Drive Integration for Meme Distribution.

Provides cached access to Google Drive folders for auto-meme functionality.
Implements a 6-hour cache policy to minimize API calls.

Pattern: Singleton with TTL Cache
"""

from __future__ import annotations

import asyncio
import io
import os
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from src.utils.logger import get_logger

logger = get_logger(__name__)

# Cache TTL in seconds (6 hours)
CACHE_TTL_SECONDS = 6 * 60 * 60


@dataclass
class DriveFile:
    """Represents a file from Google Drive."""
    id: str
    name: str
    mime_type: str
    size: Optional[int] = None
    web_view_link: Optional[str] = None
    thumbnail_link: Optional[str] = None


@dataclass
class CachedFileList:
    """Cached list of files with expiry timestamp."""
    files: List[DriveFile]
    fetched_at: datetime = field(default_factory=datetime.now)
    
    @property
    def is_expired(self) -> bool:
        """Check if cache has expired."""
        return datetime.now() > self.fetched_at + timedelta(seconds=CACHE_TTL_SECONDS)
    
    @property
    def age_minutes(self) -> int:
        """Get cache age in minutes."""
        return int((datetime.now() - self.fetched_at).total_seconds() / 60)


class DriveService:
    """Singleton service for Google Drive integration.
    
    Responsibilities:
    - Authenticate with Google Drive API
    - Cache file lists for 6 hours (CRITICAL for rate limiting)
    - Provide random file selection from folders
    - Download files as BytesIO for Discord upload
    
    The service is designed to be injected into Cogs.
    """
    
    _instance: Optional[DriveService] = None
    
    def __new__(cls) -> DriveService:
        """Ensure singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self) -> None:
        """Initialize the drive service (only once due to singleton)."""
        if self._initialized:
            return
        
        self._service: Any = None  # Google Drive API service
        self._cache: Dict[str, CachedFileList] = {}  # folder_id -> CachedFileList
        self._credentials_path: Optional[str] = None
        self._mock_mode: bool = True
        self._initialized = True
        
        logger.info("DriveService initialized in MOCK mode")
    
    async def authenticate(self, credentials_path: str) -> bool:
        """Authenticate with Google Drive API.
        
        Args:
            credentials_path: Path to service account JSON file
            
        Returns:
            True if authentication successful
        """
        self._credentials_path = credentials_path
        
        if not os.path.exists(credentials_path):
            logger.error(f"Credentials file not found: {credentials_path}")
            return False
        
        try:
            # Lazy import to avoid dependency issues if not using Drive
            from googleapiclient.discovery import build
            from google.oauth2 import service_account
            
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
            
            self._service = build('drive', 'v3', credentials=credentials)
            self._mock_mode = False
            
            logger.info("Google Drive authentication successful")
            return True
            
        except ImportError:
            logger.warning(
                "google-api-python-client not installed. "
                "Run: pip install google-api-python-client google-auth"
            )
            return False
        except Exception as e:
            logger.error(f"Drive authentication failed: {e}")
            return False
    
    async def list_files(
        self, 
        folder_id: str,
        force_refresh: bool = False
    ) -> List[DriveFile]:
        """List files in a Google Drive folder with caching.
        
        Args:
            folder_id: Google Drive folder ID
            force_refresh: Bypass cache and fetch fresh data
            
        Returns:
            List of DriveFile objects
        """
        # Check cache first
        if not force_refresh and folder_id in self._cache:
            cached = self._cache[folder_id]
            if not cached.is_expired:
                logger.debug(
                    f"Cache hit for folder {folder_id[:8]}... "
                    f"(age: {cached.age_minutes}m)"
                )
                return cached.files
            else:
                logger.info(f"Cache expired for folder {folder_id[:8]}...")
        
        # Fetch from API
        if self._mock_mode:
            files = self._get_mock_files(folder_id)
        else:
            files = await self._fetch_files_from_api(folder_id)
        
        # Update cache
        self._cache[folder_id] = CachedFileList(files=files)
        logger.info(
            f"Cached {len(files)} files from folder {folder_id[:8]}... "
            f"(TTL: {CACHE_TTL_SECONDS // 3600}h)"
        )
        
        return files
    
    async def get_random_file(self, folder_id: str) -> Optional[DriveFile]:
        """Get a random file from a folder.
        
        Args:
            folder_id: Google Drive folder ID
            
        Returns:
            Random DriveFile or None if folder empty
        """
        files = await self.list_files(folder_id)
        
        if not files:
            logger.warning(f"No files in folder {folder_id[:8]}...")
            return None
        
        selected = random.choice(files)
        logger.debug(f"Random selection: {selected.name}")
        return selected
    
    async def download_file(self, file_id: str) -> Optional[io.BytesIO]:
        """Download a file as BytesIO for Discord upload.
        
        Args:
            file_id: Google Drive file ID
            
        Returns:
            BytesIO object containing file data, or None on failure
        """
        if self._mock_mode:
            logger.warning("Download not available in mock mode")
            return None
        
        try:
            # Use media download for efficiency
            from googleapiclient.http import MediaIoBaseDownload
            
            request = self._service.files().get_media(fileId=file_id)
            buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(buffer, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            buffer.seek(0)
            logger.debug(f"Downloaded file {file_id[:8]}... ({buffer.getbuffer().nbytes} bytes)")
            return buffer
            
        except Exception as e:
            logger.error(f"Download failed for {file_id}: {e}")
            return None
    
    async def get_random_file_as_bytes(
        self, 
        folder_id: str
    ) -> tuple[Optional[io.BytesIO], Optional[str]]:
        """Get a random file from folder and download it.
        
        Convenience method combining get_random_file and download_file.
        
        Args:
            folder_id: Google Drive folder ID
            
        Returns:
            Tuple of (BytesIO data, filename) or (None, None)
        """
        file = await self.get_random_file(folder_id)
        if not file:
            return None, None
        
        data = await self.download_file(file.id)
        return data, file.name
    
    def clear_cache(self, folder_id: Optional[str] = None) -> int:
        """Clear the file cache.
        
        Args:
            folder_id: Specific folder to clear, or None for all
            
        Returns:
            Number of cache entries cleared
        """
        if folder_id:
            if folder_id in self._cache:
                del self._cache[folder_id]
                logger.info(f"Cache cleared for folder {folder_id[:8]}...")
                return 1
            return 0
        else:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"All cache cleared ({count} entries)")
            return count
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics.
        
        Returns:
            Dict with cache stats
        """
        stats = {
            "total_folders": len(self._cache),
            "total_files": sum(len(c.files) for c in self._cache.values()),
            "folders": {}
        }
        
        for folder_id, cached in self._cache.items():
            stats["folders"][folder_id[:8] + "..."] = {
                "file_count": len(cached.files),
                "age_minutes": cached.age_minutes,
                "expired": cached.is_expired
            }
        
        return stats
    
    # ─────────────────────────────────────────────────────────────────
    # Private Helpers
    # ─────────────────────────────────────────────────────────────────
    
    async def _fetch_files_from_api(self, folder_id: str) -> List[DriveFile]:
        """Fetch files from Google Drive API."""
        try:
            # Query for files in folder
            query = f"'{folder_id}' in parents and trashed = false"
            
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                lambda: self._service.files().list(
                    q=query,
                    pageSize=1000,
                    fields="files(id, name, mimeType, size, webViewLink, thumbnailLink)"
                ).execute()
            )
            
            files = []
            for item in results.get('files', []):
                files.append(DriveFile(
                    id=item['id'],
                    name=item['name'],
                    mime_type=item['mimeType'],
                    size=item.get('size'),
                    web_view_link=item.get('webViewLink'),
                    thumbnail_link=item.get('thumbnailLink')
                ))
            
            return files
            
        except Exception as e:
            logger.error(f"Failed to fetch files from Drive: {e}")
            return []
    
    def _get_mock_files(self, folder_id: str) -> List[DriveFile]:
        """Return mock files for testing."""
        mock_memes = [
            "chess_meme_001.jpg",
            "blunder_face.png",
            "stockfish_vs_human.gif",
            "en_passant_rage.jpg",
            "queen_sacrifice_energy.png",
            "botez_gambit.jpg",
            "bullet_chess_chaos.gif",
            "rook_endgame_pain.png"
        ]
        
        return [
            DriveFile(
                id=f"mock_{i}_{folder_id[:4]}",
                name=name,
                mime_type="image/jpeg" if name.endswith(".jpg") else "image/png",
                size=random.randint(50000, 500000)
            )
            for i, name in enumerate(mock_memes)
        ]
