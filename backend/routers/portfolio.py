from fastapi import APIRouter
from typing import Dict, Any
from database import db_instance
from zerodha_service import zerodha_service

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

@router.get("", response_model=Dict[str, Any])
async def get_portfolio_summary():
    # Try fetching live Zerodha margins if connected
    live_margins = zerodha_service.get_live_margins()
    if live_margins:
        return live_margins

    # Fallback to calculated portfolio metrics
    open_positions = [p for p in db_instance.memory_positions if p["status"] == "OPEN"]
    today_pnl = sum(p.get("pnl", 0.0) for p in open_positions)
    
    metrics = db_instance.memory_portfolio.copy()
    metrics["today_pnl"] = round(today_pnl, 2)
    metrics["overall_pnl"] = round(45210.00 + today_pnl, 2)
    
    return metrics
