from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import recordRoutes, searchRoutes, transcriptionRoutes

app = FastAPI(title="HealthSync API", versoin="v0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcriptionRoutes.router)
app.include_router(searchRoutes.router)
app.include_router(recordRoutes.router)

@app.get("/")
def health():
    return {"status": "healthy", "service": "HealthSync API"}