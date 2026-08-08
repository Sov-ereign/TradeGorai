import logging
import time
from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from zerodha_service import zerodha_service
from database import db_instance

logger = logging.getLogger("tradegorai.strategy")
router = APIRouter(prefix="/api/strategy", tags=["Algo Strategy Studio"])

class WebhookSignalPayload(BaseModel):
    secret: Optional[str] = ""
    symbol: str
    action: str # BUY or SELL
    qty: Optional[int] = 1
    product: Optional[str] = "MIS"
    order_type: Optional[str] = "MARKET"
    price: Optional[float] = 0.0
    target: Optional[float] = None
    stop_loss: Optional[float] = None

class ToggleStrategyRequest(BaseModel):
    status: Optional[str] = None

MEMORY_STRATEGIES: List[Dict[str, Any]] = [
    {
        "id": "strat-ema-cross",
        "name": "⚡ 9 & 21 EMA Crossover Scalper",
        "description": "Intraday trend-following strategy for NIFTY / BANKNIFTY Options. Triggers long entry when 9 EMA crosses 21 EMA upwards.",
        "category": "Scalping",
        "status": "RUNNING",
        "timeframe": "5m",
        "instrument": "NIFTY / BANKNIFTY",
        "win_rate": 68.4,
        "total_trades": 42,
        "total_pnl": 14250.00,
        "params": {
            "fast_ema": 9,
            "slow_ema": 21,
            "target_pct": 2.5,
            "sl_pct": 1.2
        },
        "last_signal": "BUY NIFTY 24800 CE @ ₹185.40",
        "last_signal_time": "11:15:00"
    },
    {
        "id": "strat-supertrend",
        "name": "🎯 Supertrend (7, 3) Momentum Algos",
        "description": "Automatic breakout entry & trailing stop-loss strategy. Triggers long/short when price breaks Supertrend 7, 3 bandwidth.",
        "category": "Momentum",
        "status": "PAUSED",
        "timeframe": "15m",
        "instrument": "BANKNIFTY",
        "win_rate": 72.1,
        "total_trades": 28,
        "total_pnl": 22100.00,
        "params": {
            "period": 7,
            "multiplier": 3,
            "hidden_target": 350.0,
            "hidden_sl": 180.0
        },
        "last_signal": "BUY BANKNIFTY 51500 CE @ ₹340.50",
        "last_signal_time": "10:45:00"
    },
    {
        "id": "strat-straddle",
        "name": "🛡️ Delta Neutral Short Straddle",
        "description": "Non-directional option selling income engine. Sells At-The-Money Call & Put options on expiry days with 30% combined SL.",
        "category": "Options",
        "status": "PAUSED",
        "timeframe": "15m",
        "instrument": "NIFTY 50",
        "win_rate": 81.5,
        "total_trades": 31,
        "total_pnl": 38400.00,
        "params": {
            "combined_sl_pct": 30.0,
            "entry_time": "09:20",
            "exit_time": "15:15"
        },
        "last_signal": "SELL NIFTY 24800 CE & PE @ ₹320.00",
        "last_signal_time": "09:20:00"
    },
    {
        "id": "strat-tradingview",
        "name": "🌐 TradingView Webhook Automation Bridge",
        "description": "Listens to live HTTP webhooks from TradingView alerts or Python scripts and executes Zerodha orders instantly with hidden SL/Target.",
        "category": "Webhook",
        "status": "RUNNING",
        "timeframe": "Any",
        "instrument": "All Instruments (53,800+)",
        "win_rate": 85.0,
        "total_trades": 19,
        "total_pnl": 9400.00,
        "params": {
            "webhook_url": "https://tradegorai-backend.onrender.com/api/strategy/webhook",
            "secret": "TG_SECRET_ALGO_99"
        },
        "last_signal": "WEBHOOK RECV: BUY RELIANCE 24AUG FUT",
        "last_signal_time": "11:28:45"
    }
]

@router.get("", response_model=List[Dict[str, Any]])
async def get_strategies():
    """Fetch all quantitative strategies & webhook configurations"""
    return MEMORY_STRATEGIES

@router.post("/{strategy_id}/toggle", response_model=Dict[str, Any])
async def toggle_strategy(strategy_id: str, req: Optional[ToggleStrategyRequest] = None):
    for strat in MEMORY_STRATEGIES:
        if strat["id"] == strategy_id:
            if req and req.status:
                strat["status"] = req.status.upper()
            else:
                strat["status"] = "RUNNING" if strat["status"] != "RUNNING" else "PAUSED"
            
            logger.info(f"Strategy {strategy_id} changed to {strat['status']}")
            return {"message": f"Strategy '{strat['name']}' status set to {strat['status']}", "strategy": strat}

    raise HTTPException(status_code=404, detail="Strategy not found")

@router.post("/webhook")
async def tradingview_webhook_listener(payload: WebhookSignalPayload):
    """
    Automated Webhook Listener Endpoint for TradingView Alerts & External Algos.
    Fires real orders directly into Zerodha with 100% hidden Target & Stop Loss!
    """
    try:
        logger.info(f"🤖 RECEIVED ALGO WEBHOOK SIGNAL: {payload}")
        symbol = payload.symbol.upper().strip()
        side = payload.action.upper().strip()
        qty = payload.qty or 1
        product = payload.product or "MIS"
        order_type = payload.order_type or "MARKET"
        price = payload.price or 0.0

        # Execute Zerodha Order
        placed = zerodha_service.place_order({
            "symbol": symbol,
            "side": side,
            "qty": qty,
            "product": product,
            "order_type": order_type,
            "price": price,
            "target": payload.target,
            "stop_loss": payload.stop_loss
        })

        placed["target"] = payload.target
        placed["stop_loss"] = payload.stop_loss

        # Store executed order & position
        db_instance.memory_orders.insert(0, placed)
        if placed["status"] == "EXECUTED":
            from routers.orders import _update_position_from_executed_order
            _update_position_from_executed_order(placed)

        # Update Webhook Strategy Log
        for strat in MEMORY_STRATEGIES:
            if strat["id"] == "strat-tradingview":
                strat["last_signal"] = f"WEBHOOK: {side} {qty} {symbol} @ ₹{price if price > 0 else 'MARKET'}"
                strat["last_signal_time"] = time.strftime("%H:%M:%S")
                strat["total_trades"] += 1
                break

        return {
            "status": "success",
            "message": f"🤖 Webhook Algo Signal Executed: {side} {qty} {symbol}",
            "order_id": placed["id"]
        }
    except Exception as e:
        logger.error(f"Error processing Webhook Signal: {e}")
        return {"status": "error", "message": str(e)}
