import asyncio
import os
import json
import random
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

from config import settings
from database import connect_to_mongo, close_mongo_connection, db_instance
from zerodha_service import zerodha_service

from routers import watchlist, orders, positions, portfolio, market

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tradegorai.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB & load instrument catalog
    await connect_to_mongo()
    asyncio.create_task(asyncio.to_thread(zerodha_service.load_instruments_catalog))
    # Start background tick broadcaster
    tick_task = asyncio.create_task(broadcast_live_ticks())
    yield
    # Shutdown: Close connections
    tick_task.cancel()
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for TradeGorai Platform integrated with Zerodha Kite Connect API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers with /api prefix
app.include_router(watchlist.router)
app.include_router(orders.router)
app.include_router(positions.router)
app.include_router(portfolio.router)
app.include_router(market.router)

# Also register root-level aliases for direct requests without /api prefix
@app.get("/watchlist")
async def get_watchlist_root():
    return await watchlist.get_watchlist()

@app.get("/orders")
async def get_orders_root(status: Optional[str] = None):
    return await orders.get_orders(status)

@app.get("/positions")
async def get_positions_root():
    return await positions.get_positions()

@app.get("/portfolio")
async def get_portfolio_root():
    return await portfolio.get_portfolio_summary()

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
    """
    Zerodha Postback Webhook Handler.
    Zerodha sends order execution updates to this endpoint whenever an order status changes on exchange.
    """
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
        symbol = payload.get("tradingsymbol")
        side = payload.get("transaction_type")
        qty = payload.get("quantity")
        price = payload.get("average_price") or payload.get("price")

        for ord_item in db_instance.memory_orders:
            if ord_item["id"] == str(order_id):
                ord_item["status"] = "EXECUTED" if status == "COMPLETE" else status
                break

        event_payload = {
            "type": "ORDER_POSTBACK",
            "order_id": order_id,
            "status": status,
            "symbol": symbol,
            "side": side,
            "qty": qty,
            "price": price,
            "message": f"Postback: Order {order_id} ({symbol}) changed to {status}"
        }
        await ws_manager.broadcast(event_payload)

        return {"status": "success", "message": "Postback received and processed"}
    except Exception as e:
        logger.error(f"Error processing Zerodha Postback: {e}")
        return {"status": "error", "message": str(e)}

# WebSocket Manager for Live Market Ticks & Notifications
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected.")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

@app.websocket("/ws/ticks")
async def websocket_ticks_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received WS payload from client: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

async def broadcast_live_ticks():
    """Background task streaming market ticks to connected clients."""
    while True:
        try:
            await asyncio.sleep(1.5)
            if not ws_manager.active_connections:
                continue

            # Check if market is open in IST
            market_open = market.is_market_open_ist()

            ticks = {}
            for item in db_instance.memory_watchlist:
                symbol = item["symbol"]
                current_ltp = item["ltp"]

                # Only simulate price movement if market is open or in explicit simulation
                if market_open:
                    delta = round(random.uniform(-0.003, 0.003) * current_ltp, 2)
                    new_ltp = round(max(10.0, current_ltp + delta), 2)
                else:
                    new_ltp = current_ltp # Static price at night/market closed

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

            for pos in db_instance.memory_positions:
                if pos["status"] == "OPEN" and pos["symbol"] in ticks:
                    current_ltp = ticks[pos["symbol"]]["ltp"]
                    pos["current_price"] = current_ltp
                    diff = current_ltp - pos["avg_price"]
                    pos["pnl"] = round(diff * pos["qty"], 2)
                    pos["unrealized_pnl"] = pos["pnl"]
                    pos["pnl_percent"] = round((diff / pos["avg_price"]) * 100, 2)

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
            logger.error(f"Error in tick broadcast loop: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
