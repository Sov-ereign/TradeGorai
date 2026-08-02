import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TradeGorai"
    API_V1_STR: str = "/api"
    
    # MongoDB Configuration (MongoDB Atlas URL or local fallback)
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb+srv://demo:demo@cluster0.mongodb.net/tradegorai?retryWrites=true&w=majority")
    DB_NAME: str = os.getenv("DB_NAME", "tradegorai")
    
    # Zerodha Kite API Configuration
    KITE_API_KEY: str = os.getenv("KITE_API_KEY", "")
    KITE_API_SECRET: str = os.getenv("KITE_API_SECRET", "")
    KITE_ACCESS_TOKEN: str = os.getenv("KITE_ACCESS_TOKEN", "")
    KITE_MOCK_MODE: bool = os.getenv("KITE_MOCK_MODE", "true").lower() == "true"

    class Config:
        case_sensitive = True

settings = Settings()
