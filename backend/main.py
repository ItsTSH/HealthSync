print("Starting app...")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import recordRoutes, searchRoutes, transcriptionRoutes, authRoutes, processingRoutes

app = FastAPI(title="HealthSync API", version="v0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core processing routes (NEW: AI layer)
app.include_router(processingRoutes.router)

# Search routes (updated for Supabase + RAG)
app.include_router(searchRoutes.router)

# Transcription & extraction (unchanged)
app.include_router(transcriptionRoutes.router)

# Authentication (unchanged)
app.include_router(authRoutes.router)

# Legacy record routes (DEPRECATED - for backward compatibility only)
app.include_router(recordRoutes.router)

@app.get("/")
def health():
    return {"status": "healthy", "service": "HealthSync API", "version": "v0.2.0"}