import os
import json
import logging
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger("tradegorai.db")

STORAGE_FILE = os.path.join(os.path.dirname(__file__), ".tradegorai_storage.json")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_connected: bool = False
    
    # Persistent Multi-Watchlist system
    memory_watchlists: List[Dict[str, Any]] = [
        {
            "id": "wl-1",
            "name": "Watchlist 1",
            "is_default": True,
            "items": []
        },
        {
            "id": "wl-2",
            "name": "Watchlist 2",
            "is_default": False,
            "items": []
        },
        {
            "id": "wl-3",
            "name": "Watchlist 3",
            "is_default": False,
            "items": []
        },
        {
            "id": "wl-4",
            "name": "Watchlist 4",
            "is_default": False,
            "items": []
        },
        {
            "id": "wl-5",
            "name": "Watchlist 5",
            "is_default": False,
            "items": []
        },
        {
            "id": "wl-6",
            "name": "Watchlist 6",
            "is_default": False,
            "items": []
        },
        {
            "id": "wl-7",
            "name": "Watchlist 7",
            "is_default": False,
            "items": []
        }
    ]
    
    memory_watchlist: List[Dict[str, Any]] = []
    memory_orders: List[Dict[str, Any]] = []
    memory_positions: List[Dict[str, Any]] = []

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

    def __init__(self):
        self.load_storage_from_disk()

    def load_storage_from_disk(self):
        """Restore all watchlists, orders, and positions from disk cache"""
        if os.path.exists(STORAGE_FILE):
            try:
                with open(STORAGE_FILE, "r") as f:
                    data = json.load(f)
                    if data.get("watchlists"):
                        self.memory_watchlists = data["watchlists"]
                    if data.get("orders"):
                        self.memory_orders = data["orders"]
                    if data.get("positions"):
                        self.memory_positions = data["positions"]
                    logger.info("Successfully restored watchlists and state from disk cache.")
            except Exception as e:
                logger.error(f"Failed loading disk storage file: {e}")

    def save_storage_to_disk(self):
        """Persist all watchlists, orders, and positions to disk cache"""
        try:
            with open(STORAGE_FILE, "w") as f:
                json.dump({
                    "watchlists": self.memory_watchlists,
                    "orders": self.memory_orders,
                    "positions": self.memory_positions
                }, f)
        except Exception as e:
            logger.error(f"Failed saving disk storage file: {e}")

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

        # Sync MongoDB watchlists if available
        try:
            mongo_wl = await db_instance.db.watchlists.find().to_list(100)
            if mongo_wl:
                db_instance.memory_watchlists = mongo_wl
                db_instance.save_storage_to_disk()
                logger.info("Synced watchlists from MongoDB Atlas.")
        except Exception as err:
            logger.warning(f"MongoDB watchlists sync note: {err}")

    except Exception as e:
        logger.warning(f"MongoDB connection skipped or failed: {str(e)}. Using persistent disk store.")
        db_instance.is_connected = False

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        logger.info("Closed MongoDB client connection.")
