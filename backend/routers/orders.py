import random
import time
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from database import db_instance
from zerodha_service import zerodha_service

router = APIRouter(prefix="/api/orders", tags=["Orders"])

class OrderCreateRequest(BaseModel):
    symbol: str
    side: str
    qty: int
    product: str
    order_type: str
    exchange: Optional[str] = "NSE"
    price: Optional[float] = 0.0
    target: Optional[float] = None
    stop_loss: Optional[float] = None
    trailing_stop_loss: Optional[float] = None
    validity: Optional[str] = "DAY"
    notes: Optional[str] = ""

class OrderUpdateRequest(BaseModel):
    price: Optional[float] = None
    qty: Optional[int] = None
    target: Optional[float] = None
    stop_loss: Optional[float] = None

@router.get("", response_model=List[Dict[str, Any]])
async def get_orders(status: Optional[str] = None):
    all_orders = list(db_instance.memory_orders)
    try:
        live_ord = zerodha_service.get_live_orders()
        if live_ord:
            existing_ids = {o["id"] for o in all_orders}
            for lo in live_ord:
                if lo["id"] not in existing_ids:
                    all_orders.append(lo)
    except Exception as e:
        print(f"Error fetching live orders: {e}")

    if status:
        return [o for o in all_orders if o.get("status", "").upper() == status.upper()]
    return all_orders

@router.post("", response_model=Dict[str, Any])
async def place_order(order_req: OrderCreateRequest):
    order_dict = order_req.model_dump()
    placed_order = zerodha_service.place_order(order_dict)

    # Attach virtual target & stop_loss fields
    placed_order["target"] = order_dict.get("target")
    placed_order["stop_loss"] = order_dict.get("stop_loss")

    # Save order to memory & disk storage
    db_instance.memory_orders.insert(0, placed_order)
    db_instance.save_storage_to_disk()

    # POSITIONS ARE CREATED ONLY WHEN AN ORDER IS TRULY EXECUTED / FILLED!
    # PENDING, OPEN, or AMO REQ orders MUST NOT create positions until filled.
    if placed_order.get("status") in ["EXECUTED", "COMPLETE"]:
        _update_position_from_executed_order(placed_order)

    if db_instance.is_connected and db_instance.db is not None:
        try:
            await db_instance.db.orders.insert_one(placed_order.copy())
        except Exception as e:
            print(f"MongoDB order insert error: {e}")

    return {
        "message": f"Order {placed_order['id']} placed successfully",
        "order": placed_order
    }

@router.delete("/clear")
async def clear_order_history():
    """Clear local order history and reset positions"""
    db_instance.memory_orders = []
    db_instance.memory_positions = []
    db_instance.save_storage_to_disk()
    return {"message": "Order history and positions cleared successfully"}

@router.put("/{order_id}", response_model=Dict[str, Any])
async def modify_order(order_id: str, update_req: OrderUpdateRequest):
    found_order = None
    for order in db_instance.memory_orders:
        if order["id"] == order_id:
            if update_req.price is not None:
                order["price"] = update_req.price
            if update_req.qty is not None:
                order["qty"] = update_req.qty
            if update_req.target is not None:
                order["target"] = update_req.target
            if update_req.stop_loss is not None:
                order["stop_loss"] = update_req.stop_loss
            found_order = order
            break

    if not found_order:
        raise HTTPException(status_code=404, detail="Order not found")

    db_instance.save_storage_to_disk()
    return {"message": f"Order {order_id} modified successfully", "order": found_order}

@router.delete("/{order_id}", response_model=Dict[str, Any])
async def cancel_order(order_id: str):
    cancelled_order = None
    for order in db_instance.memory_orders:
        if order["id"] == order_id:
            order["status"] = "CANCELLED"
            cancelled_order = order
            break

    if not cancelled_order:
        raise HTTPException(status_code=404, detail="Order not found")

    db_instance.save_storage_to_disk()
    return {"message": f"Order {order_id} cancelled", "order": cancelled_order}

def _update_position_from_executed_order(order: Dict[str, Any]):
    symbol = order["symbol"]
    side = order["side"]
    qty = order["qty"]
    price = order["price"] if order["price"] > 0 else 1000.0
    product = order["product"]
    target = order.get("target")
    stop_loss = order.get("stop_loss")

    existing_pos = None
    for pos in db_instance.memory_positions:
        if pos.get("symbol") == symbol and pos.get("product") == product and pos.get("status") == "OPEN":
            existing_pos = pos
            break

    if existing_pos:
        if side == "BUY":
            total_qty = existing_pos["qty"] + qty
            avg_price = ((existing_pos["qty"] * existing_pos["avg_price"]) + (qty * price)) / total_qty
            existing_pos["qty"] = total_qty
            existing_pos["avg_price"] = round(avg_price, 2)
            if target:
                existing_pos["target"] = target
            if stop_loss:
                existing_pos["stop_loss"] = stop_loss
        else: # SELL
            new_qty = existing_pos["qty"] - qty
            if new_qty <= 0:
                existing_pos["status"] = "CLOSED"
                existing_pos["qty"] = 0
            else:
                existing_pos["qty"] = new_qty
    else:
        if side == "BUY":
            db_instance.memory_positions.append({
                "symbol": symbol,
                "product": product,
                "qty": qty,
                "avg_price": price,
                "current_price": price,
                "target": target,
                "stop_loss": stop_loss,
                "pnl": 0.0,
                "pnl_percent": 0.0,
                "unrealized_pnl": 0.0,
                "status": "OPEN"
            })

    db_instance.save_storage_to_disk()
