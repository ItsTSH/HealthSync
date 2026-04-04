from elevenlabs.client import ElevenLabs
import google.genai as genai
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from cryptography.fernet import Fernet
from .config import *

# Initialize clients
elevenClient = ElevenLabs(api_key = ELEVENLABS_API_KEY)
geminiClient = genai.Client(api_key = GEMINI_API_KEY)

# Load embedding model
print("Loading embedding model...")
embeddingModel = SentenceTransformer(EMBEDDING_MODEL)
print("Model loaded")

# Initialize ChromaDB
print("Initializing Chroma collection...")  
chromaClient = chromadb.PersistentClient(
    path  = CHROMA_PERSIST_DIR,
    settings = Settings(anonymized_telemetry = False)
)

collection = chromaClient.get_or_create_collection(
    name = "patient_records",
    metadata = {"hnsw:space": "cosine"}
)
print("Collection initialized")

fernet = Fernet(ENCRYPTION_KEY.encode())