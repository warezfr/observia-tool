from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Observia"
    debug: bool = False
    database_url: str = "sqlite+aiosqlite:///./observia.db"
    secret_key: str = "change-me-in-production"
    cors_origins: list[str] = ["http://localhost:3000"]
    mcp_connection_timeout: int = 30
    mcp_max_retries: int = 3


settings = Settings()
