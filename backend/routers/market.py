from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from zerodha_service import zerodha_service

router = APIRouter(prefix="/api/market", tags=["Market Data"])

COMPREHENSIVE_INSTRUMENTS = [
    # Top Equity Stocks
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "ltp": 2980.50, "change": 1.45, "high": 3012.00, "low": 2940.10, "sector": "Energy", "type": "EQ"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Limited", "ltp": 1045.20, "change": 2.85, "high": 1060.00, "low": 1020.00, "sector": "Automobile", "type": "EQ"},
    {"symbol": "INFY", "name": "Infosys Limited", "ltp": 1820.75, "change": -0.65, "high": 1845.00, "low": 1805.50, "sector": "IT", "type": "EQ"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Limited", "ltp": 1640.30, "change": 0.90, "high": 1658.00, "low": 1622.00, "sector": "Banking", "type": "EQ"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "ltp": 4250.00, "change": -1.20, "high": 4310.00, "low": 4210.00, "sector": "IT", "type": "EQ"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Limited", "ltp": 1210.40, "change": 1.10, "high": 1225.00, "low": 1195.00, "sector": "Banking", "type": "EQ"},
    {"symbol": "SBIN", "name": "State Bank of India", "ltp": 845.60, "change": 0.45, "high": 855.00, "low": 838.00, "sector": "Banking", "type": "EQ"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "ltp": 1420.00, "change": 0.75, "high": 1435.00, "low": 1405.00, "sector": "Telecom", "type": "EQ"},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd", "ltp": 3610.20, "change": 1.80, "high": 3650.00, "low": 3580.00, "sector": "Infrastructure", "type": "EQ"},

    # Major Indices
    {"symbol": "NIFTY50", "name": "Nifty 50 Index", "ltp": 24780.50, "change": 0.65, "high": 24850.00, "low": 24650.00, "sector": "Index", "type": "INDICES"},
    {"symbol": "BANKNIFTY", "name": "Bank Nifty Index", "ltp": 51420.10, "change": 0.85, "high": 51600.00, "low": 51200.00, "sector": "Index", "type": "INDICES"},

    # F&O: Index Futures
    {"symbol": "NIFTY 24AUG FUT", "name": "Nifty 50 August Monthly Future", "ltp": 24810.00, "change": 0.68, "high": 24890.00, "low": 24680.00, "sector": "Derivatives", "type": "FUT"},
    {"symbol": "BANKNIFTY 24AUG FUT", "name": "Bank Nifty August Monthly Future", "ltp": 51480.00, "change": 0.90, "high": 51680.00, "low": 51240.00, "sector": "Derivatives", "type": "FUT"},

    # F&O: Index Options (Calls CE & Puts PE)
    {"symbol": "NIFTY 24800 CE", "name": "Nifty 24800 Call Option (Monthly)", "ltp": 185.40, "change": 12.50, "high": 210.00, "low": 140.00, "sector": "Derivatives", "type": "OPT"},
    {"symbol": "NIFTY 24800 PE", "name": "Nifty 24800 Put Option (Monthly)", "ltp": 142.10, "change": -8.30, "high": 175.00, "low": 120.00, "sector": "Derivatives", "type": "OPT"},
    {"symbol": "BANKNIFTY 51500 CE", "name": "Bank Nifty 51500 Call Option", "ltp": 340.50, "change": 18.20, "high": 390.00, "low": 280.00, "sector": "Derivatives", "type": "OPT"},
    {"symbol": "BANKNIFTY 51000 PE", "name": "Bank Nifty 51000 Put Option", "ltp": 210.30, "change": -14.10, "high": 260.00, "low": 180.00, "sector": "Derivatives", "type": "OPT"},

    # F&O: Stock Derivatives
    {"symbol": "RELIANCE 24AUG FUT", "name": "Reliance August Future", "ltp": 2988.00, "change": 1.50, "high": 3020.00, "low": 2945.00, "sector": "Derivatives", "type": "FUT"},
    {"symbol": "TATAMOTORS 24AUG FUT", "name": "Tata Motors August Future", "ltp": 1048.50, "change": 2.90, "high": 1064.00, "low": 1022.00, "sector": "Derivatives", "type": "FUT"}
]

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
    # If Zerodha is connected live, try searching Zerodha instruments
    if not zerodha_service.is_mock_mode and zerodha_service.kite:
        try:
            live_quotes = zerodha_service.search_instruments(q)
            if live_quotes:
                return live_quotes
        except Exception:
            pass

    if not q:
        return COMPREHENSIVE_INSTRUMENTS

    query = q.lower()
    return [
        s for s in COMPREHENSIVE_INSTRUMENTS
        if query in s["symbol"].lower() or query in s["name"].lower() or query in s.get("type", "").lower()
    ]

@router.get("/status")
async def get_market_status():
    is_open = is_market_open_ist()
    return {
        "status": "OPEN" if is_open else "CLOSED",
        "exchange": "NSE / NFO",
        "market_hours": "09:15 - 15:30 IST",
        "message": "NSE Market Live" if is_open else "NSE Market Closed (Opens 09:15 IST)",
        "indices": {
            "NIFTY50": {"value": 24780.50, "change": 160.20, "percent": 0.65},
            "BANKNIFTY": {"value": 51420.10, "change": 433.00, "percent": 0.85},
            "SENSEX": {"value": 81350.25, "change": 520.40, "percent": 0.64}
        }
    }
