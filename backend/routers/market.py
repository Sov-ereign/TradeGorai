from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from zerodha_service import zerodha_service

router = APIRouter(prefix="/api/market", tags=["Market Data"])

def is_market_open_ist() -> bool:
    """Check if Indian Stock Market (NSE/BSE) is currently open in IST (Mon-Fri 09:15 - 15:30 IST)"""
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist_tz)
    
    if now_ist.weekday() >= 5:
        return False
        
    start_time = now_ist.replace(hour=9, minute=15, second=0, microsecond=0)
    end_time = now_ist.replace(hour=15, minute=30, second=0, microsecond=0)
    return start_time <= now_ist <= end_time

@router.get("/stocks", response_model=List[Dict[str, Any]])
async def search_stocks(q: str = ""):
    # Live Search across all 90,000+ Zerodha Exchange Instruments (NSE, BSE, NFO)
    return zerodha_service.search_catalog(q)

@router.get("/status")
async def get_market_status():
    is_open = is_market_open_ist()
    return {
        "status": "OPEN" if is_open else "CLOSED",
        "exchange": "NSE / NFO / BSE",
        "market_hours": "09:15 - 15:30 IST",
        "message": "NSE Market Live" if is_open else "NSE Market Closed (Opens 09:15 IST)",
        "indices": {
            "NIFTY50": {"value": 24780.50, "change": 160.20, "percent": 0.65},
            "BANKNIFTY": {"value": 51420.10, "change": 433.00, "percent": 0.85},
            "SENSEX": {"value": 81350.25, "change": 520.40, "percent": 0.64}
        }
    }
