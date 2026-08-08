from fastapi import APIRouter
from typing import Dict, Any
from database import db_instance
from zerodha_service import zerodha_service

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

@router.get("", response_model=Dict[str, Any])
async def get_portfolio_summary():
    try:
        live_margins = zerodha_service.get_live_margins() if hasattr(zerodha_service, 'get_live_margins') else None
        if live_margins:
            return live_margins

        open_positions = [p for p in db_instance.memory_positions if isinstance(p, dict) and p.get("status") == "OPEN"]
        today_pnl = sum(p.get("pnl", 0.0) for p in open_positions)
        used_margin = sum((p.get("avg_price", 0.0) * p.get("qty", 0)) for p in open_positions)

        return {
            "today_pnl": round(today_pnl, 2),
            "today_pnl_percent": 0.00,
            "overall_pnl": round(today_pnl, 2),
            "overall_pnl_percent": 0.00,
            "available_margin": 100000.00,
            "used_margin": round(used_margin, 2),
            "capital": 100000.00,
            "total_investment": round(used_margin, 2)
        }
    except Exception as e:
        return {
            "today_pnl": 0.00,
            "today_pnl_percent": 0.00,
            "overall_pnl": 0.00,
            "overall_pnl_percent": 0.00,
            "available_margin": 100000.00,
            "used_margin": 0.00,
            "capital": 100000.00,
            "total_investment": 0.00
        }
