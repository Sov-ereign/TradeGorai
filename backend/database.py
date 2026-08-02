import logging
import asyncio
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger("tradeforge.db")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_connected: bool = False
    
    # In-memory storage fallback if MongoDB connection is unavailable
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
        },
        {
            "symbol": "ICICIBANK",
            "name": "ICICI Bank Limited",
            "ltp": 1210.40,
            "change": 1.10,
            "high": 1225.00,
            "low": 1195.00,
            "starred": True,
            "exchange": "NSE"
        },
        {
            "symbol": "SBIN",
            "name": "State Bank of India",
            "ltp": 845.60,
            "change": 0.45,
            "high": 855.00,
            "low": 838.00,
            "starred": False,
            "exchange": "NSE"
        }
    ]
    
    memory_orders: List[Dict[str, Any]] = [
        {
            "id": "ORD-109283",
            "time": "14:23:10",
            "symbol": "TATAMOTORS",
            "side": "BUY",
            "qty": 50,
            "price": 1040.00,
            "product": "CNC",
            "order_type": "LIMIT",
            "target": 1090.00,
            "stop_loss": 1010.00,
            "status": "PENDING",
            "exchange": "NSE"
        },
        {
            "id": "ORD-109282",
            "time": "11:15:04",
            "symbol": "RELIANCE",
            "side": "BUY",
            "qty": 20,
            "price": 2965.50,
            "product": "MIS",
            "order_type": "MARKET",
            "target": 3020.00,
            "stop_loss": 2930.00,
            "status": "EXECUTED",
            "exchange": "NSE"
        },
        {
            "id": "ORD-109280",
            "time": "09:45:22",
            "symbol": "INFY",
            "side": "SELL",
            "qty": 15,
            "price": 1835.00,
            "product": "CNC",
            "order_type": "LIMIT",
            "target": 1800.00,
            "stop_loss": 1855.00,
            "status": "CANCELLED",
            "exchange": "NSE"
        }
    ]

    memory_positions: List[Dict[str, Any]] = [
        {
            "symbol": "RELIANCE",
            "product": "MIS",
            "qty": 20,
            "avg_price": 2965.50,
            "current_price": 2980.50,
            "pnl": 300.00,
            "pnl_percent": 0.51,
            "unrealized_pnl": 300.00,
            "status": "OPEN"
        },
        {
            "symbol": "ICICIBANK",
            "product": "CNC",
            "qty": 100,
            "avg_price": 1190.00,
            "current_price": 1210.40,
            "pnl": 2040.00,
            "pnl_percent": 1.71,
            "unrealized_pnl": 2040.00,
            "status": "OPEN"
        }
    ]

    memory_portfolio: Dict[str, Any] = {
        "today_pnl": 2340.00,
        "today_pnl_percent": 1.18,
        "overall_pnl": 45210.00,
        "overall_pnl_percent": 9.42,
        "available_margin": 185420.50,
        "used_margin": 64580.00,
        "capital": 250000.00,
        "total_investment": 480000.00
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
