from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from database import db_instance
from zerodha_service import zerodha_service

router = APIRouter(prefix="/api/positions", tags=["Positions"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_positions():
    live_pos = zerodha_service.get_live_positions()
    if live_pos is not None:
        return live_pos

    if db_instance.is_connected and db_instance.db is not None:
        try:
            cursor = db_instance.db.positions.find({}, {"_id": 0})
            items = await cursor.to_list(length=100)
            if items:
                return items
        except Exception:
            pass
    return db_instance.memory_positions

@router.post("/exit/{symbol}")
async def exit_position(symbol: str, product: str = "CNC"):
    symbol_upper = symbol.upper()

    # If live Zerodha mode, place opposite market order directly on Zerodha
    if not zerodha_service.is_mock_mode and zerodha_service.kite:
        live_pos_list = zerodha_service.get_live_positions() or []
        target_pos = next((p for p in live_pos_list if p["symbol"] == symbol_upper), None)
        if target_pos and target_pos["qty"] != 0:
            side = "SELL" if target_pos["qty"] > 0 else "BUY"
            exit_order_res = zerodha_service.place_order({
                "symbol": symbol_upper,
                "side": side,
                "qty": abs(target_pos["qty"]),
                "product": product,
                "order_type": "MARKET"
            })
            return {"message": f"Exit order for {symbol_upper} submitted to Zerodha", "order": exit_order_res}

    exited_pos = None
    for pos in db_instance.memory_positions:
        if pos["symbol"] == symbol_upper and pos.get("product", "CNC") == product and pos["status"] == "OPEN":
            pos["status"] = "CLOSED"
            exited_pos = pos
            side = "SELL" if pos["qty"] > 0 else "BUY"
            exit_order = {
                "id": f"ORD-EXIT-{pos['symbol']}",
                "time": "NOW",
                "symbol": pos["symbol"],
                "side": side,
                "qty": pos["qty"],
                "price": pos["current_price"],
                "product": pos["product"],
                "order_type": "MARKET",
                "status": "EXECUTED"
            }
            db_instance.memory_orders.insert(0, exit_order)
            break

    if not exited_pos:
        raise HTTPException(status_code=404, detail="Open position not found")

    return {"message": f"Position in {symbol_upper} exited successfully", "position": exited_pos}

@router.post("/square-off-all")
async def square_off_all_positions():
    count = 0
    for pos in db_instance.memory_positions:
        if pos["status"] == "OPEN":
            pos["status"] = "CLOSED"
            count += 1

    return {"message": f"Squared off {count} open positions", "squared_count": count}
