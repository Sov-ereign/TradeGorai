from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
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

@router.get("", response_model=List[Dict[str, Any]])
async def get_watchlist():
    # If Zerodha is connected live, pull user's live holdings & active instruments
    if not zerodha_service.is_mock_mode and zerodha_service.kite:
        try:
            live_h = zerodha_service.get_live_holdings()
            if live_h:
                sync_list = []
                for item in live_h:
                    sync_list.append({
                        "symbol": item["symbol"],
                        "name": item["name"],
                        "ltp": item["ltp"],
                        "change": round((item["ltp"] - item["avg_price"]) / item["avg_price"] * 100, 2) if item["avg_price"] > 0 else 0.0,
                        "high": round(item["ltp"] * 1.02, 2),
                        "low": round(item["ltp"] * 0.98, 2),
                        "starred": True,
                        "exchange": item.get("exchange", "NSE")
                    })
                if sync_list:
                    return sync_list
        except Exception:
            pass

    if db_instance.is_connected and db_instance.db is not None:
        try:
            cursor = db_instance.db.watchlist.find({}, {"_id": 0})
            items = await cursor.to_list(length=100)
            if items:
                return items
        except Exception:
            pass

    return db_instance.memory_watchlist

@router.post("", response_model=Dict[str, Any])
async def add_to_watchlist(item: WatchlistAddRequest):
    new_stock = item.model_dump()
    
    # Check if stock already exists in memory
    for stock in db_instance.memory_watchlist:
        if stock["symbol"] == item.symbol:
            return {"message": f"{item.symbol} is already in watchlist", "item": stock}

    db_instance.memory_watchlist.append(new_stock)
    
    if db_instance.is_connected and db_instance.db is not None:
        try:
            await db_instance.db.watchlist.update_one(
                {"symbol": item.symbol},
                {"$set": new_stock},
                upsert=True
            )
        except Exception as e:
            print(f"MongoDB write error: {e}")

    return {"message": f"Added {item.symbol} to watchlist", "item": new_stock}

@router.delete("/{symbol}")
async def remove_from_watchlist(symbol: str):
    symbol_upper = symbol.upper()
    db_instance.memory_watchlist = [s for s in db_instance.memory_watchlist if s["symbol"] != symbol_upper]

    if db_instance.is_connected and db_instance.db is not None:
        try:
            await db_instance.db.watchlist.delete_one({"symbol": symbol_upper})
        except Exception as e:
            print(f"MongoDB delete error: {e}")

    return {"message": f"Removed {symbol_upper} from watchlist", "symbol": symbol_upper}

@router.put("/{symbol}/star")
async def toggle_star_stock(symbol: str):
    symbol_upper = symbol.upper()
    new_starred_state = False
    for stock in db_instance.memory_watchlist:
        if stock["symbol"] == symbol_upper:
            stock["starred"] = not stock.get("starred", False)
            new_starred_state = stock["starred"]
            break

    if db_instance.is_connected and db_instance.db is not None:
        try:
            await db_instance.db.watchlist.update_one(
                {"symbol": symbol_upper},
                {"$set": {"starred": new_starred_state}}
            )
        except Exception as e:
            print(f"MongoDB star update error: {e}")

    return {"symbol": symbol_upper, "starred": new_starred_state}
