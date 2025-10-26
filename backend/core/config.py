import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
ENCRYPTION_KEY = os.getenv("FERNET_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7