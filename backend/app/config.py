"""Environment-driven configuration (no secrets are hard-coded)."""
from __future__ import annotations

import os


class Config:
    HOST = os.environ.get("FLASK_HOST", "127.0.0.1")
    PORT = int(os.environ.get("FLASK_PORT", "5000"))
    DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"
    # Comma separated list of allowed browser origins. Vite dev server by default.
    CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()]
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024
