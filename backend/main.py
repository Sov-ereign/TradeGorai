import asyncio
import os
import json
import random
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

from config import settings
from database import connect_to_mongo, close_mongo_connection, db_instance
from zerodha_service import zerodha_service

from routers import watchlist, orders, positions, portfolio, market, strategy
from routers.market import is_market_open_ist

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tradegorai.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    asyncio.create_task(asyncio.to_thread(zerodha_service.load_instruments_catalog))
    tick_task = asyncio.create_task(broadcast_live_ticks())
    yield
    tick_task.cancel()
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for TradeGorai Platform integrated with Zerodha Kite Connect API",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    "https://trade-gorai.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def cors_handler_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    if request.method == "OPTIONS":
        response = Response(status_code=204)
        response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"Unhandled server error: {exc}")
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(exc)}
        )

    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"

    return response

# Register REST Routers with /api prefix
app.include_router(watchlist.router)
app.include_router(orders.router)
app.include_router(positions.router)
app.include_router(portfolio.router)
app.include_router(market.router)
app.include_router(strategy.router)

# Also register root-level aliases for direct requests without /api prefix
@app.get("/watchlist")
async def get_watchlist_root():
    return await watchlist.get_watchlists()

@app.get("/orders")
async def get_orders_root(status: Optional[str] = None):
    return await orders.get_orders(status)

@app.post("/orders")
async def place_order_root(order_req: orders.OrderCreateRequest):
    return await orders.place_order(order_req)

@app.delete("/orders/clear")
async def clear_orders_root():
    return await orders.clear_order_history()

@app.get("/positions")
async def get_positions_root():
    return await positions.get_positions()

@app.get("/portfolio")
async def get_portfolio_root():
    return await portfolio.get_portfolio_summary()

@app.get("/market/status")
async def get_market_status_root():
    return await market.get_market_status()

@app.get("/market/stocks")
async def search_stocks_root(q: str = ""):
    return await market.search_stocks(q)

class ZerodhaCredentialsRequest(BaseModel):
    api_key: str
    api_secret: str
    access_token: Optional[str] = None

@app.get("/api/zerodha/status")
@app.get("/zerodha/status")
async def zerodha_status():
    return zerodha_service.get_status()

@app.post("/api/zerodha/credentials")
@app.post("/zerodha/credentials")
async def save_zerodha_credentials(req: ZerodhaCredentialsRequest):
    zerodha_service.set_credentials(req.api_key, req.api_secret, req.access_token)
    return {
        "message": "Zerodha credentials saved successfully",
        "status": zerodha_service.get_status()
    }

@app.get("/api/zerodha/callback")
@app.get("/zerodha/callback")
async def zerodha_oauth_callback(request: Request, request_token: str = Query(...)):
    """Zerodha OAuth Redirect Handler after user logs in via Kite Connect"""
    try:
        res = zerodha_service.generate_session(request_token)
        token = res.get("access_token", "")
        name = res.get("profile", {}).get("user_name", "Zerodha Trader")
        client_id = res.get("profile", {}).get("user_id", "")
        
        frontend_url = os.getenv("FRONTEND_URL", "https://trade-gorai.vercel.app")
        origin_header = request.headers.get("origin") or request.headers.get("referer")
        if origin_header and ("vercel.app" in origin_header or "localhost" in origin_header):
            frontend_url = origin_header.split("?")[0].rstrip("/")

        redirect_target = f"{frontend_url}?zerodha=connected&token={token}&user_name={name}&client_id={client_id}"
        return RedirectResponse(url=redirect_target)
    except Exception as e:
        logger.error(f"Zerodha OAuth Callback Error: {e}")
        frontend_url = os.getenv("FRONTEND_URL", "https://trade-gorai.vercel.app")
        return RedirectResponse(url=f"{frontend_url}?zerodha=error&msg={str(e)}")

@app.post("/api/zerodha/postback")
@app.post("/zerodha/postback")
async def zerodha_postback_webhook(request: Request):
    """Zerodha Postback Webhook Handler"""
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            payload = await request.json()
        else:
            form_data = await request.form()
            payload = dict(form_data)

        logger.info(f"Received Zerodha Postback Payload: {payload}")

        order_id = payload.get("order_id")
        status = str(payload.get("status", "")).upper()

        for ord_item in db_instance.memory_orders:
            if ord_item["id"] == str(order_id):
                ord_item["status"] = "EXECUTED" if status == "COMPLETE" else status
                break

        return {"status": "success", "received_order_id": order_id}
    except Exception as e:
        logger.error(f"Zerodha Postback Error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/zerodha/login-url")
@app.get("/zerodha/login-url")
async def get_zerodha_login_url(api_key: Optional[str] = None):
    """Get Zerodha Kite Login URL for OAuth Authentication"""
    if api_key:
        zerodha_service.api_key = api_key
        zerodha_service._init_kite()
    
    if not zerodha_service.kite:
        raise HTTPException(status_code=400, detail="Zerodha API Key not set. Please save API credentials first.")
    
    return {
        "login_url": zerodha_service.kite.login_url(),
        "api_key": zerodha_service.api_key
    }

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting WebSocket message: {e}")
                self.disconnect(connection)

ws_manager = ConnectionManager()

@app.websocket("/ws/ticks")
async def websocket_ticks_endpoint(websocket: WebSocket):
    """Real-time WebSocket tick streaming endpoint"""
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)

async def broadcast_live_ticks():
    """Background Task: Broadcast Live Prices for active watchlists & open positions (Strict IST Market Hours Only)"""
    while True:
        try:
            await asyncio.sleep(1.0)
            
            market_open = is_market_open_ist()
            ticks = {}
            
            for wl in db_instance.memory_watchlists:
                for item in wl.get("items", []):
                    symbol = item["symbol"]
                    current_ltp = item["ltp"]

                    # Only simulate ticks during active NSE market hours (Mon-Fri 09:15 - 15:30 IST)
                    # On weekends (Saturdays & Sundays) or off-market hours, prices remain 100% frozen at last market close!
                    if market_open:
                        delta = round(random.uniform(-0.003, 0.003) * current_ltp, 2)
                        new_ltp = round(max(10.0, current_ltp + delta), 2)
                    else:
                        new_ltp = current_ltp

                    item["ltp"] = new_ltp
                    item["high"] = max(item["high"], new_ltp)
                    item["low"] = min(item["low"], new_ltp)
                    
                    ticks[symbol] = {
                        "symbol": symbol,
                        "ltp": new_ltp,
                        "change": item["change"],
                        "high": item["high"],
                        "low": item["low"],
                        "market_open": market_open,
                        "timestamp": asyncio.get_event_loop().time()
                    }

            for pos in list(db_instance.memory_positions):
                if pos.get("status") == "OPEN":
                    sym = pos["symbol"]
                    current_ltp = ticks.get(sym, {}).get("ltp", pos.get("current_price", pos["avg_price"]))
                    pos["current_price"] = current_ltp
                    diff = current_ltp - pos["avg_price"]
                    pos["pnl"] = round(diff * pos["qty"], 2)
                    pos["unrealized_pnl"] = pos["pnl"]
                    pos["pnl_percent"] = round((diff / pos["avg_price"]) * 100, 2)

                    target = pos.get("target")
                    stop_loss = pos.get("stop_loss")

                    if target and current_ltp >= target:
                        logger.info(f"🎯 VIRTUAL TARGET HIT for {sym} @ {current_ltp} (Target: {target}). Triggering Zerodha Market Exit!")
                        pos["status"] = "CLOSED"
                        
                        try:
                            zerodha_service.place_order({
                                "symbol": sym,
                                "side": "SELL",
                                "qty": pos["qty"],
                                "product": pos["product"],
                                "order_type": "MARKET"
                            })
                        except Exception as ze:
                            logger.error(f"Error placing Zerodha Target exit order: {ze}")

                        await ws_manager.broadcast({
                            "type": "VIRTUAL_TRIGGER",
                            "trigger_type": "TARGET",
                            "symbol": sym,
                            "price": current_ltp,
                            "message": f"🎯 Hidden Target Hit! Executed {sym} SELL order at ₹{current_ltp} on Zerodha."
                        })

                    elif stop_loss and current_ltp <= stop_loss:
                        logger.info(f"🛡️ VIRTUAL STOP LOSS HIT for {sym} @ {current_ltp} (SL: {stop_loss}). Triggering Zerodha Market Exit!")
                        pos["status"] = "CLOSED"

                        try:
                            zerodha_service.place_order({
                                "symbol": sym,
                                "side": "SELL",
                                "qty": pos["qty"],
                                "product": pos["product"],
                                "order_type": "MARKET"
                            })
                        except Exception as ze:
                            logger.error(f"Error placing Zerodha SL exit order: {ze}")

                        await ws_manager.broadcast({
                            "type": "VIRTUAL_TRIGGER",
                            "trigger_type": "STOP_LOSS",
                            "symbol": sym,
                            "price": current_ltp,
                            "message": f"🛡️ Hidden Stop Loss Hit! Executed {sym} SELL order at ₹{current_ltp} on Zerodha."
                        })

            if ws_manager.active_connections and ticks:
                tick_payload = {
                    "type": "TICK_UPDATE",
                    "ticks": ticks,
                    "market_open": market_open,
                    "server_time": asyncio.get_event_loop().time()
                }
                await ws_manager.broadcast(tick_payload)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in tick & trigger broadcast loop: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
