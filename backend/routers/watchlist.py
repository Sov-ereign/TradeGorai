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

@router.get("", response_model=List[Dict[str, Any]])
async def get_watchlists():
    """Fetch all named watchlists (Holdings, Positions, Custom Watchlists)"""
    watchlists = list(db_instance.memory_watchlists)

    # If Zerodha is connected live, pull real account watchlists & holdings dynamically
    if not zerodha_service.is_mock_mode and zerodha_service.kite:
        try:
            live_groups = []
            
            # Group 1: Zerodha Holdings
            live_h = zerodha_service.get_live_holdings()
            if live_h:
                h_items = []
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
                live_groups.append({
                    "id": "wl-zerodha-holdings",
                    "name": "Zerodha Holdings",
                    "is_default": True,
                    "items": h_items
                })

            # Group 2: Zerodha Positions
            live_p = zerodha_service.get_live_positions()
            if live_p:
                p_items = []
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
                live_groups.append({
                    "id": "wl-zerodha-positions",
                    "name": "Live Positions",
                    "is_default": False,
                    "items": p_items
                })

            # Merge with user's custom created watchlists
            for custom_wl in watchlists:
                if not custom_wl["id"].startswith("wl-zerodha"):
                    live_groups.append(custom_wl)

            if live_groups:
                return live_groups
        except Exception as e:
            print(f"Zerodha live watchlist sync error: {e}")

    # Fallback to MongoDB / memory store
    if db_instance.is_connected and db_instance.db is not None:
        try:
            cursor = db_instance.db.watchlists.find({}, {"_id": 0})
            items = await cursor.to_list(length=20)
            if items:
                return items
        except Exception:
            pass

    return watchlists

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

    if db_instance.is_connected and db_instance.db is not None:
        try:
            await db_instance.db.watchlists.insert_one(new_group.copy())
        except Exception as e:
            print(f"MongoDB write error: {e}")

    return {"message": f"Watchlist group '{req.name}' created", "group": new_group}

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
    
    if not target_group and db_instance.memory_watchlists:
        target_group = db_instance.memory_watchlists[0]

    if target_group:
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
