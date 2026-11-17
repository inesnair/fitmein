from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str

    # Anthropic
    anthropic_api_key: str
    model_extraction: str = "claude-haiku-5-5"   # extraction / matching: rapide et peu coûteux
    model_writing: str = "claude-sonnet-5-5"     # rédaction du CV

    # France Travail (https://francetravail.io) — optionnel
    france_travail_client_id: str | None = None
    france_travail_client_secret: str | None = None

    # Matching
    match_threshold: int = 70      # >= : "Match"
    study_threshold: int = 50      # >= : "À étudier", < : "Pas de match"

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
