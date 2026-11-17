from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import offers, profile, sources

app = FastAPI(
    title="FitMeIn API",
    version="0.1.0",
    description="Analyse d'offres, matching avec le profil, génération de CV ATS et connecteurs d'offres.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(offers.router)
app.include_router(sources.router)


@app.get("/health", tags=["système"])
def health() -> dict:
    return {"status": "ok"}
