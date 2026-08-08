import logging
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger("tradegorai.db")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_connected: bool = False
    
    # Dynamic Watchlist (starts completely clean, populated by user or Zerodha sync)
    memory_watchlist: List[Dict[str, Any]] = []
    
    # Dynamic Orders list (starts clean)
    memory_orders: List[Dict[str, Any]] = []

    # Dynamic Positions list (starts clean, populated only by placed orders/Zerodha)
    memory_positions: List[Dict[str, Any]] = []

    # Dynamic Portfolio metrics
    memory_portfolio: Dict[str, Any] = {
        "today_pnl": 0.00,
        "today_pnl_percent": 0.00,
        "overall_pnl": 0.00,
        "overall_pnl_percent": 0.00,
        "available_margin": 0.00,
        "used_margin": 0.00,
        "capital": 0.00,
        "total_investment": 0.00
    }

db_instance = Database()

async def connect_to_mongo():
    try:
        db_instance.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=2000
        )
        # Test connection
        await db_instance.client.admin.command('ping')
        db_instance.db = db_instance.client[settings.DB_NAME]
        db_instance.is_connected = True
        logger.info("Successfully connected to MongoDB Atlas!")
    except Exception as e:
        logger.warning(f"MongoDB connection skipped or failed: {str(e)}. Using fallback memory store.")
        db_instance.is_connected = False

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        logger.info("Closed MongoDB client connection.")
