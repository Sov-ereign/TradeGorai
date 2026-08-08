import uuid
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from database import db_instance
from zerodha_service import zerodha_service

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist"])

class WatchlistAddRequest(BaseModel):
    symbol: str
    name: str
    ltp: float
    change: float
    high: float
    low: float
    starred: bool = False
    exchange: str = "NSE"
    group_id: Optional[str] = "wl-1"

class CreateGroupRequest(BaseModel):
    name: str

class RenameGroupRequest(BaseModel):
    name: str

DEFAULT_FO_INSTRUMENTS = [
    {"symbol": "NIFTY50", "name": "Nifty 50 Index", "ltp": 24780.50, "change": 0.65, "high": 24850.00, "low": 24650.00, "starred": True, "exchange": "NSE"},
    {"symbol": "BANKNIFTY", "name": "Bank Nifty Index", "ltp": 51420.10, "change": 0.85, "high": 51600.00, "low": 51200.00, "starred": True, "exchange": "NSE"},
    {"symbol": "NIFTY 24AUG FUT", "name": "Nifty August Future", "ltp": 24810.00, "change": 0.68, "high": 24890.00, "low": 24680.00, "starred": False, "exchange": "NFO"},
    {"symbol": "BANKNIFTY 24AUG FUT", "name": "Bank Nifty August Future", "ltp": 51480.00, "change": 0.90, "high": 51680.00, "low": 51240.00, "starred": False, "exchange": "NFO"},
    {"symbol": "NIFTY 24800 CE", "name": "Nifty 24800 Call Option", "ltp": 185.40, "change": 12.50, "high": 210.00, "low": 140.00, "starred": False, "exchange": "NFO"},
    {"symbol": "NIFTY 24800 PE", "name": "Nifty 24800 Put Option", "ltp": 142.10, "change": -8.30, "high": 175.00, "low": 120.00, "starred": False, "exchange": "NFO"},
    {"symbol": "BANKNIFTY 51500 CE", "name": "Bank Nifty 51500 Call Option", "ltp": 340.50, "change": 18.20, "high": 390.00, "low": 280.00, "starred": False, "exchange": "NFO"},
    {"symbol": "BANKNIFTY 51000 PE", "name": "Bank Nifty 51000 Put Option", "ltp": 210.30, "change": -14.10, "high": 260.00, "low": 180.00, "starred": False, "exchange": "NFO"}
]

DEFAULT_BLUECHIP_INSTRUMENTS = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "ltp": 2980.50, "change": 1.45, "high": 3012.00, "low": 2940.10, "starred": True, "exchange": "NSE"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Limited", "ltp": 1045.20, "change": 2.85, "high": 1060.00, "low": 1020.00, "starred": True, "exchange": "NSE"},
    {"symbol": "INFY", "name": "Infosys Limited", "ltp": 1820.75, "change": -0.65, "high": 1845.00, "low": 1805.50, "starred": False, "exchange": "NSE"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Limited", "ltp": 1640.30, "change": 0.90, "high": 1658.00, "low": 1622.00, "starred": False, "exchange": "NSE"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "ltp": 4250.00, "change": -1.20, "high": 4310.00, "low": 4210.00, "starred": False, "exchange": "NSE"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Limited", "ltp": 1210.40, "change": 1.10, "high": 1225.00, "low": 1195.00, "starred": False, "exchange": "NSE"},
    {"symbol": "SBIN", "name": "State Bank of India", "ltp": 845.60, "change": 0.45, "high": 855.00, "low": 838.00, "starred": False, "exchange": "NSE"}
]

@router.get("", response_model=List[Dict[str, Any]])
async def get_watchlists():
    """Fetch 7 Zerodha Kite Watchlists synced with Holdings, Positions, F&O, and user additions"""
    watchlists = list(db_instance.memory_watchlists)

    # Pull live Zerodha holdings & positions if connected
    live_h = zerodha_service.get_live_holdings() if not zerodha_service.is_mock_mode else None
    live_p = zerodha_service.get_live_positions() if not zerodha_service.is_mock_mode else None

    # Construct Holdings items
    h_items = []
    if live_h:
        for item in live_h:
            h_items.append({
                "symbol": item["symbol"],
                "name": item["name"],
                "ltp": item["ltp"],
                "change": round((item["ltp"] - item["avg_price"]) / item["avg_price"] * 100, 2) if item["avg_price"] > 0 else 0.0,
                "high": round(item["ltp"] * 1.02, 2),
                "low": round(item["ltp"] * 0.98, 2),
                "starred": True,
                "exchange": item.get("exchange", "NSE")
            })

    # Construct Positions items
    p_items = []
    if live_p:
        for pos in live_p:
            if pos.get("status") == "OPEN":
                p_items.append({
                    "symbol": pos["symbol"],
                    "name": pos["symbol"],
                    "ltp": pos["current_price"],
                    "change": pos["pnl_percent"],
                    "high": round(pos["current_price"] * 1.02, 2),
                    "low": round(pos["current_price"] * 0.98, 2),
                    "starred": True,
                    "exchange": "NSE"
                })

    # Get custom added items from memory for each group ID
    def get_group_items(gid: str, fallback_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for g in watchlists:
            if g["id"] == gid and g.get("items"):
                # Merge custom items with fallback/synced items without duplicates
                merged = list(g["items"])
                existing = {s["symbol"] for s in merged}
                for f in fallback_items:
                    if f["symbol"] not in existing:
                        merged.append(f)
                        existing.add(f["symbol"])
                return merged
        return fallback_items

    # 7 Zerodha Kite Watchlist Tabs
    kite_watchlists = [
        {
            "id": "wl-1",
            "name": "Watchlist 1",
            "is_default": True,
            "items": get_group_items("wl-1", h_items if h_items else DEFAULT_BLUECHIP_INSTRUMENTS)
        },
        {
            "id": "wl-2",
            "name": "Watchlist 2",
            "is_default": False,
            "items": get_group_items("wl-2", p_items)
        },
        {
            "id": "wl-3",
            "name": "Watchlist 3 (F&O)",
            "is_default": False,
            "items": get_group_items("wl-3", DEFAULT_FO_INSTRUMENTS)
        },
        {
            "id": "wl-4",
            "name": "Watchlist 4",
            "is_default": False,
            "items": get_group_items("wl-4", [])
        },
        {
            "id": "wl-5",
            "name": "Watchlist 5",
            "is_default": False,
            "items": get_group_items("wl-5", [])
        },
        {
            "id": "wl-6",
            "name": "Watchlist 6",
            "is_default": False,
            "items": get_group_items("wl-6", [])
        },
        {
            "id": "wl-7",
            "name": "Watchlist 7",
            "is_default": False,
            "items": get_group_items("wl-7", [])
        }
    ]

    # Merge custom created groups if any exist
    for custom_wl in watchlists:
        if not any(k["id"] == custom_wl["id"] for k in kite_watchlists):
            kite_watchlists.append(custom_wl)

    return kite_watchlists

@router.post("/group", response_model=Dict[str, Any])
async def create_watchlist_group(req: CreateGroupRequest):
    new_id = f"wl-{uuid.uuid4().hex[:8]}"
    new_group = {
        "id": new_id,
        "name": req.name.strip(),
        "is_default": False,
        "items": []
    }
    db_instance.memory_watchlists.append(new_group)
    return {"message": f"Watchlist '{req.name}' created", "group": new_group}

@router.put("/group/{group_id}/rename", response_model=Dict[str, Any])
async def rename_watchlist_group(group_id: str, req: RenameGroupRequest):
    for group in db_instance.memory_watchlists:
        if group["id"] == group_id:
            group["name"] = req.name.strip()
            return {"message": f"Watchlist renamed to '{req.name}'", "group": group}
    raise HTTPException(status_code=404, detail="Watchlist group not found")

@router.delete("/group/{group_id}")
async def delete_watchlist_group(group_id: str):
    db_instance.memory_watchlists = [g for g in db_instance.memory_watchlists if g["id"] != group_id]
    return {"message": f"Watchlist group '{group_id}' deleted"}

@router.post("", response_model=Dict[str, Any])
async def add_to_watchlist(item: WatchlistAddRequest):
    new_stock = {
        "symbol": item.symbol,
        "name": item.name,
        "ltp": item.ltp,
        "change": item.change,
        "high": item.high,
        "low": item.low,
        "starred": item.starred,
        "exchange": item.exchange
    }
    
    target_group_id = item.group_id or "wl-1"
    target_group = None
    for g in db_instance.memory_watchlists:
        if g["id"] == target_group_id:
            target_group = g
            break
    
    if not target_group:
        target_group = {
            "id": target_group_id,
            "name": "Watchlist 1",
            "items": []
        }
        db_instance.memory_watchlists.append(target_group)

    # Check duplicate
    for s in target_group["items"]:
        if s["symbol"] == item.symbol:
            return {"message": f"{item.symbol} is already in {target_group['name']}", "item": s}
    target_group["items"].append(new_stock)

    return {"message": f"Added {item.symbol} to watchlist", "item": new_stock}

@router.delete("/{symbol}")
async def remove_from_watchlist(symbol: str, group_id: Optional[str] = None):
    symbol_upper = symbol.upper()
    for g in db_instance.memory_watchlists:
        if not group_id or g["id"] == group_id:
            g["items"] = [s for s in g["items"] if s["symbol"] != symbol_upper]

    return {"message": f"Removed {symbol_upper} from watchlist", "symbol": symbol_upper}

@router.put("/{symbol}/star")
async def toggle_star_stock(symbol: str):
    symbol_upper = symbol.upper()
    new_starred_state = False
    for g in db_instance.memory_watchlists:
        for stock in g["items"]:
            if stock["symbol"] == symbol_upper:
                stock["starred"] = not stock.get("starred", False)
                new_starred_state = stock["starred"]
                break

    return {"symbol": symbol_upper, "starred": new_starred_state}
