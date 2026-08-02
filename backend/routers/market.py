from fastapi import APIRouter
from typing import List, Dict, Any
from database import db_instance

router = APIRouter(prefix="/api/market", tags=["Market Data"])

ALL_STOCKS_CATALOG = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "ltp": 2980.50, "change": 1.45, "high": 3012.00, "low": 2940.10, "sector": "Energy"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Limited", "ltp": 1045.20, "change": 2.85, "high": 1060.00, "low": 1020.00, "sector": "Automobile"},
    {"symbol": "INFY", "name": "Infosys Limited", "ltp": 1820.75, "change": -0.65, "high": 1845.00, "low": 1805.50, "sector": "IT"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Limited", "ltp": 1640.30, "change": 0.90, "high": 1658.00, "low": 1622.00, "sector": "Banking"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "ltp": 4250.00, "change": -1.20, "high": 4310.00, "low": 4210.00, "sector": "IT"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Limited", "ltp": 1210.40, "change": 1.10, "high": 1225.00, "low": 1195.00, "sector": "Banking"},
    {"symbol": "SBIN", "name": "State Bank of India", "ltp": 845.60, "change": 0.45, "high": 855.00, "low": 838.00, "sector": "Banking"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "ltp": 1420.00, "change": 0.75, "high": 1435.00, "low": 1405.00, "sector": "Telecom"},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd", "ltp": 3610.20, "change": 1.80, "high": 3650.00, "low": 3580.00, "sector": "Infrastructure"},
    {"symbol": "NIFTY50", "name": "Nifty 50 Index", "ltp": 24780.50, "change": 0.65, "high": 24850.00, "low": 24650.00, "sector": "Index"},
    {"symbol": "BANKNIFTY", "name": "Bank Nifty Index", "ltp": 51420.10, "change": 0.85, "high": 51600.00, "low": 51200.00, "sector": "Index"}
]

@router.get("/stocks", response_model=List[Dict[str, Any]])
async def search_stocks(q: str = ""):
    if not q:
        return ALL_STOCKS_CATALOG
    query = q.lower()
    return [
        s for s in ALL_STOCKS_CATALOG
        if query in s["symbol"].lower() or query in s["name"].lower()
    ]

@router.get("/status")
async def get_market_status():
    return {
        "status": "OPEN",
        "exchange": "NSE",
        "market_hours": "09:15 - 15:30 IST",
        "indices": {
            "NIFTY50": {"value": 24780.50, "change": 160.20, "percent": 0.65},
            "BANKNIFTY": {"value": 51420.10, "change": 433.00, "percent": 0.85},
            "SENSEX": {"value": 81350.25, "change": 520.40, "percent": 0.64}
        }
    }
