import logging
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger("tradegorai.db")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_connected: bool = False
    
    # Real dynamic Watchlist (persisted in MongoDB Atlas or in-memory)
    memory_watchlist: List[Dict[str, Any]] = [
        {
            "symbol": "RELIANCE",
            "name": "Reliance Industries Ltd",
            "ltp": 2980.50,
            "change": 1.45,
            "high": 3012.00,
            "low": 2940.10,
            "starred": True,
            "exchange": "NSE"
        },
        {
            "symbol": "TATAMOTORS",
            "name": "Tata Motors Limited",
            "ltp": 1045.20,
            "change": 2.85,
            "high": 1060.00,
            "low": 1020.00,
            "starred": True,
            "exchange": "NSE"
        },
        {
            "symbol": "INFY",
            "name": "Infosys Limited",
            "ltp": 1820.75,
            "change": -0.65,
            "high": 1845.00,
            "low": 1805.50,
            "starred": True,
            "exchange": "NSE"
        },
        {
            "symbol": "HDFCBANK",
            "name": "HDFC Bank Limited",
            "ltp": 1640.30,
            "change": 0.90,
            "high": 1658.00,
            "low": 1622.00,
            "starred": False,
            "exchange": "NSE"
        },
        {
            "symbol": "TCS",
            "name": "Tata Consultancy Services",
            "ltp": 4250.00,
            "change": -1.20,
            "high": 4310.00,
            "low": 4210.00,
            "starred": False,
            "exchange": "NSE"
        }
    ]
    
    # Dynamic Orders list (starts clean)
    memory_orders: List[Dict[str, Any]] = []

    # Dynamic Positions list (starts clean, populated only by placed orders)
    memory_positions: List[Dict[str, Any]] = []

    # Dynamic Portfolio metrics
    memory_portfolio: Dict[str, Any] = {
        "today_pnl": 0.00,
        "today_pnl_percent": 0.00,
        "overall_pnl": 0.00,
        "overall_pnl_percent": 0.00,
        "available_margin": 100000.00,
        "used_margin": 0.00,
        "capital": 100000.00,
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
