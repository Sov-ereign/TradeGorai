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
    return zerodha_service.search_catalog(q)

@router.get("/status")
async def get_market_status():
    try:
        is_open = is_market_open_ist()
        live_indices = zerodha_service.get_live_index_quotes() if hasattr(zerodha_service, 'get_live_index_quotes') else {}
        return {
            "status": "OPEN" if is_open else "CLOSED",
            "exchange": "NSE / NFO / BSE",
            "market_hours": "09:15 - 15:30 IST",
            "message": "NSE Market Live" if is_open else "NSE Market Closed (Opens 09:15 IST)",
            "indices": live_indices
        }
    except Exception as e:
        return {
            "status": "CLOSED",
            "exchange": "NSE / NFO / BSE",
            "market_hours": "09:15 - 15:30 IST",
            "message": f"Market Status ({str(e)})",
            "indices": {}
        }
