from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Mini Hotel API"
    app_env: str = "development"
    api_prefix: str = "/api"
    database_url: str = "mysql+pymysql://hotel_user:hotel_password@127.0.0.1:4000/hotel_manage"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
