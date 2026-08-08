import logging
import json
import os
import random
import time
import urllib.request
import csv
import io
from typing import Dict, Any, List, Optional
from config import settings

logger = logging.getLogger("tradegorai.zerodha")
SESSION_FILE = os.path.join(os.path.dirname(__file__), ".zerodha_session.json")
INSTRUMENTS_CACHE_FILE = os.path.join(os.path.dirname(__file__), ".zerodha_instruments.json")

class ZerodhaService:
    def __init__(self):
        self.api_key = settings.KITE_API_KEY
        self.api_secret = settings.KITE_API_SECRET
        self.access_token = settings.KITE_ACCESS_TOKEN
        self.is_mock_mode = settings.KITE_MOCK_MODE or not (self.api_key and self.access_token)
        self.kite = None
        self.user_profile = {
            "user_name": "Not Connected",
            "client_id": "Connect Zerodha API",
            "user_type": "guest",
            "email": ""
        }
        self.instruments_catalog: List[Dict[str, Any]] = []
        self._load_session_file()
        self._init_client()

    def load_instruments_catalog(self):
        """Load or download live Zerodha exchange instruments CSV (~90k symbols)"""
        try:
            if os.path.exists(INSTRUMENTS_CACHE_FILE) and (time.time() - os.path.getmtime(INSTRUMENTS_CACHE_FILE) < 86400):
                with open(INSTRUMENTS_CACHE_FILE, "r") as f:
                    self.instruments_catalog = json.load(f)
                logger.info(f"Loaded {len(self.instruments_catalog)} instruments from disk cache.")
                return

            logger.info("Downloading live Zerodha instruments catalog...")
            req = urllib.request.Request("https://api.kite.trade/instruments", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                content = resp.read().decode('utf-8')
                reader = csv.DictReader(io.StringIO(content))
                parsed = []
                for row in reader:
                    exch = row.get("exchange", "")
                    if exch in ("NSE", "NFO", "BSE"):
                        parsed.append({
                            "symbol": row.get("tradingsymbol", ""),
                            "name": row.get("name", row.get("tradingsymbol", "")),
                            "exchange": exch,
                            "type": row.get("instrument_type", "EQ"),
                            "expiry": row.get("expiry", ""),
                            "strike": float(row.get("strike", 0.0) or 0.0),
                            "ltp": float(row.get("last_price", 0.0) or 0.0),
                            "change": 0.0,
                            "high": float(row.get("last_price", 0.0) or 0.0),
                            "low": float(row.get("last_price", 0.0) or 0.0),
                        })
                self.instruments_catalog = parsed
                with open(INSTRUMENTS_CACHE_FILE, "w") as f:
                    json.dump(parsed[:15000], f) # Cache top 15k instruments for fast lookup
                logger.info(f"Successfully loaded {len(self.instruments_catalog)} live instruments.")
        except Exception as e:
            logger.warning(f"Could not load live Zerodha instruments CSV: {e}")

    def search_catalog(self, query: str) -> List[Dict[str, Any]]:
        if not self.instruments_catalog:
            self.load_instruments_catalog()
        
        if not query:
            return self.instruments_catalog[:30]

        q = query.upper().strip()
        matched = []
        for inst in self.instruments_catalog:
            if q in inst["symbol"] or q in inst["name"].upper():
                matched.append(inst)
                if len(matched) >= 40:
                    break
        
        # If live Zerodha connection is active, fetch exact real-time quote for matched symbols
        if not self.is_mock_mode and self.kite and matched:
            try:
                symbols_to_quote = [f"{item['exchange']}:{item['symbol']}" for item in matched[:10]]
                quotes = self.kite.quote(symbols_to_quote)
                for item in matched:
                    q_key = f"{item['exchange']}:{item['symbol']}"
                    if q_key in quotes:
                        q_data = quotes[q_key]
                        item["ltp"] = q_data.get("last_price", item["ltp"])
                        item["change"] = q_data.get("net_change", 0.0)
                        oh = q_data.get("ohlc", {})
                        item["high"] = oh.get("high", item["ltp"])
                        item["low"] = oh.get("low", item["ltp"])
            except Exception as e:
                logger.warning(f"Error fetching live Zerodha quote for search: {e}")

        return matched

    def get_live_index_quotes(self) -> Optional[Dict[str, Any]]:
        if not self.is_mock_mode and self.kite:
            try:
                quotes = self.kite.quote(["NSE:NIFTY 50", "NSE:NIFTY BANK", "BSE:SENSEX"])
                nifty = quotes.get("NSE:NIFTY 50", {})
                bank = quotes.get("NSE:NIFTY BANK", {})
                sensex = quotes.get("BSE:SENSEX", {})

                def fmt(data):
                    val = data.get("last_price", 0.0)
                    chg = data.get("net_change", 0.0)
                    close = data.get("ohlc", {}).get("close", val)
                    pct = (chg / close * 100) if close > 0 else 0.0
                    return {"value": val, "change": round(chg, 2), "percent": round(pct, 2)}

                return {
                    "NIFTY50": fmt(nifty),
                    "BANKNIFTY": fmt(bank),
                    "SENSEX": fmt(sensex)
                }
            except Exception as e:
                logger.error(f"Error fetching index quotes from Zerodha: {e}")
        return None

    def _load_session_file(self):
        if os.path.exists(SESSION_FILE):
            try:
                with open(SESSION_FILE, "r") as f:
                    data = json.load(f)
                    if data.get("api_key"):
                        self.api_key = data["api_key"]
                    if data.get("api_secret"):
                        self.api_secret = data["api_secret"]
                    if data.get("access_token"):
                        self.access_token = data["access_token"]
                    if data.get("user_name"):
                        self.user_profile["user_name"] = data["user_name"]
                    if data.get("client_id"):
                        self.user_profile["client_id"] = data["client_id"]
                    logger.info("Loaded persisted Zerodha session from disk.")
            except Exception as e:
                logger.warning(f"Failed loading session file: {e}")

    def _save_session_file(self):
        try:
            with open(SESSION_FILE, "w") as f:
                json.dump({
                    "api_key": self.api_key,
                    "api_secret": self.api_secret,
                    "access_token": self.access_token,
                    "user_name": self.user_profile["user_name"],
                    "client_id": self.user_profile["client_id"]
                }, f, indent=2)
            logger.info("Saved Zerodha session to disk.")
        except Exception as e:
            logger.warning(f"Failed saving session file: {e}")

    def _init_client(self):
        if self.api_key and self.access_token:
            try:
                from kiteconnect import KiteConnect
                self.kite = KiteConnect(api_key=self.api_key)
                self.kite.set_access_token(self.access_token)
                
                try:
                    profile = self.kite.profile()
                    self.user_profile["user_name"] = profile.get("user_name", "Zerodha Trader")
                    self.user_profile["client_id"] = profile.get("user_id", "KITE_LIVE")
                    self.user_profile["email"] = profile.get("email", "")
                    self.is_mock_mode = False
                    logger.info(f"Connected to LIVE Zerodha Kite API for client {self.user_profile['client_id']}")
                except Exception as pe:
                    logger.warning(f"Kite Access Token invalid or expired ({pe}). Session login required.")
                    self.is_mock_mode = True
            except Exception as e:
                logger.error(f"Failed to initialize KiteConnect SDK: {e}. Operating in MOCK mode.")
                self.is_mock_mode = True
        else:
            self.is_mock_mode = True
            logger.info("Zerodha Service operating in MOCK / SANDBOX Mode.")

    def set_credentials(self, api_key: str, api_secret: str, access_token: Optional[str] = None):
        self.api_key = api_key.strip()
        self.api_secret = api_secret.strip()
        if access_token:
            self.access_token = access_token.strip()
        self._save_session_file()
        self._init_client()

    def get_login_url(self) -> str:
        if not self.api_key:
            return ""
        return f"https://kite.zerodha.com/connect/login?v=3&api_key={self.api_key}"

    def generate_session(self, request_token: str) -> Dict[str, Any]:
        if not self.api_key or not self.api_secret:
            raise ValueError("KITE_API_KEY and KITE_API_SECRET must be configured before generating session.")
        try:
            from kiteconnect import KiteConnect
            kite_conn = KiteConnect(api_key=self.api_key)
            session_data = kite_conn.generate_session(request_token, api_secret=self.api_secret)
            self.access_token = session_data["access_token"]
            self.kite = kite_conn
            self.kite.set_access_token(self.access_token)
            self.is_mock_mode = False
            
            profile = self.kite.profile()
            self.user_profile["user_name"] = profile.get("user_name", "Zerodha Trader")
            self.user_profile["client_id"] = profile.get("user_id", "KITE_LIVE")
            self.user_profile["email"] = profile.get("email", "")
            
            self._save_session_file()
            logger.info(f"Successfully generated Zerodha Session token for user {self.user_profile['client_id']}")
            return {
                "success": True,
                "access_token": self.access_token,
                "profile": profile
            }
        except Exception as e:
            logger.error(f"Zerodha session generation failed: {e}")
            raise RuntimeError(f"Zerodha OAuth authentication failed: {str(e)}")

    def get_status(self) -> Dict[str, Any]:
        return {
            "connected": not self.is_mock_mode and self.kite is not None,
            "mock_mode": self.is_mock_mode,
            "api_key": f"{self.api_key[:4]}****" if self.api_key else "NOT_CONFIGURED",
            "api_secret_configured": bool(self.api_secret),
            "access_token_configured": bool(self.access_token),
            "user_name": self.user_profile["user_name"],
            "broker": "Zerodha Broking Ltd.",
            "client_id": self.user_profile["client_id"],
            "login_url": self.get_login_url()
        }

    def get_live_margins(self) -> Optional[Dict[str, Any]]:
        if not self.is_mock_mode and self.kite:
            try:
                margins = self.kite.margins()
                equity = margins.get("equity", {})
                utilised = equity.get("utilised", {})
                available = equity.get("available", {})
                return {
                    "today_pnl": float(utilised.get("realised_m2m", 0.0)),
                    "today_pnl_percent": 0.0,
                    "overall_pnl": float(utilised.get("realised_m2m", 0.0)),
                    "overall_pnl_percent": 0.0,
                    "available_margin": float(available.get("live_balance", 0.0)),
                    "used_margin": float(utilised.get("debits", 0.0)),
                    "capital": float(equity.get("net", 0.0)),
                    "total_investment": float(available.get("collateral", 0.0))
                }
            except Exception as e:
                logger.error(f"Error fetching live margins from Zerodha: {e}")
        return None

    def get_live_positions(self) -> Optional[List[Dict[str, Any]]]:
        if not self.is_mock_mode and self.kite:
            try:
                raw_pos = self.kite.positions()
                net_pos = raw_pos.get("net", [])
                formatted = []
                for p in net_pos:
                    pnl = float(p.get("pnl", 0.0))
                    buy_price = float(p.get("buy_price", 0.0))
                    ltp = float(p.get("last_price", 0.0))
                    qty = int(p.get("quantity", 0))
                    pnl_pct = ((ltp - buy_price) / buy_price * 100) if buy_price > 0 else 0.0

                    formatted.append({
                        "symbol": p.get("tradingsymbol"),
                        "product": p.get("product"),
                        "qty": qty,
                        "avg_price": buy_price,
                        "current_price": ltp,
                        "pnl": pnl,
                        "pnl_percent": round(pnl_pct, 2),
                        "unrealized_pnl": float(p.get("unrealised", pnl)),
                        "status": "OPEN" if qty != 0 else "CLOSED"
                    })
                return formatted
            except Exception as e:
                logger.error(f"Error fetching live positions from Zerodha: {e}")
        return None

    def get_live_orders(self) -> Optional[List[Dict[str, Any]]]:
        if not self.is_mock_mode and self.kite:
            try:
                orders = self.kite.orders()
                formatted = []
                for o in orders:
                    formatted.append({
                        "id": str(o.get("order_id")),
                        "time": str(o.get("order_timestamp", ""))[11:19] if o.get("order_timestamp") else "",
                        "symbol": o.get("tradingsymbol"),
                        "side": o.get("transaction_type"),
                        "qty": int(o.get("quantity", 0)),
                        "price": float(o.get("price", 0.0)),
                        "product": o.get("product"),
                        "order_type": o.get("order_type"),
                        "target": None,
                        "stop_loss": None,
                        "status": o.get("status", "PENDING").upper(),
                        "exchange": o.get("exchange", "NSE")
                    })
                return formatted
            except Exception as e:
                logger.error(f"Error fetching live orders from Zerodha: {e}")
        return None

    def get_live_holdings(self) -> Optional[List[Dict[str, Any]]]:
        if not self.is_mock_mode and self.kite:
            try:
                holdings = self.kite.holdings()
                formatted = []
                for h in holdings:
                    formatted.append({
                        "symbol": h.get("tradingsymbol"),
                        "name": h.get("tradingsymbol"),
                        "qty": h.get("quantity", 0),
                        "avg_price": float(h.get("average_price", 0.0)),
                        "ltp": float(h.get("last_price", 0.0)),
                        "pnl": float(h.get("pnl", 0.0)),
                        "exchange": h.get("exchange", "NSE")
                    })
                return formatted
            except Exception as e:
                logger.error(f"Error fetching live holdings from Zerodha: {e}")
        return None

    def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        symbol = order_data.get("symbol")
        side = order_data.get("side", "BUY").upper()
        qty = int(order_data.get("qty", 1))
        product = order_data.get("product", "CNC").upper()
        order_type = order_data.get("order_type", "MARKET").upper()
        price = float(order_data.get("price", 0))
        target = float(order_data.get("target", 0)) if order_data.get("target") else None
        stop_loss = float(order_data.get("stop_loss", 0)) if order_data.get("stop_loss") else None

        est_val = price * qty if price > 0 else 1000.0 * qty
        brokerage = 0.0 if product == "CNC" else min(20.0, est_val * 0.0003)
        stt = est_val * 0.001 if side == "SELL" else (est_val * 0.001 if product == "CNC" else 0.0)
        etc = est_val * 0.0000345
        gst = (brokerage + etc) * 0.18
        sebi = est_val * 0.000001
        total_charges = round(brokerage + stt + etc + gst + sebi, 2)
        net_amount = round(est_val + total_charges if side == "BUY" else est_val - total_charges, 2)

        order_id = f"ORD-{random.randint(100000, 999999)}"
        time_str = time.strftime("%H:%M:%S")

        status = "EXECUTED" if order_type == "MARKET" else "PENDING"

        result_order = {
            "id": order_id,
            "time": time_str,
            "symbol": symbol,
            "side": side,
            "qty": qty,
            "price": price,
            "product": product,
            "order_type": order_type,
            "target": target,
            "stop_loss": stop_loss,
            "status": status,
            "est_val": est_val,
            "brokerage": brokerage,
            "charges": total_charges,
            "net_amount": net_amount,
            "validity": order_data.get("validity", "DAY"),
            "notes": order_data.get("notes", "")
        }

        if not self.is_mock_mode and self.kite:
            try:
                kite_order_type = self.kite.ORDER_TYPE_MARKET if order_type == "MARKET" else self.kite.ORDER_TYPE_LIMIT
                kite_transaction_type = self.kite.TRANSACTION_TYPE_BUY if side == "BUY" else self.kite.TRANSACTION_TYPE_SELL
                kite_product = self.kite.PRODUCT_CNC if product == "CNC" else self.kite.PRODUCT_MIS
                
                real_id = self.kite.place_order(
                    variety=self.kite.VARIETY_REGULAR,
                    exchange=self.kite.EXCHANGE_NSE,
                    tradingsymbol=symbol,
                    transaction_type=kite_transaction_type,
                    quantity=qty,
                    product=kite_product,
                    order_type=kite_order_type,
                    price=price if order_type == "LIMIT" else None,
                    validity=order_data.get("validity", "DAY")
                )
                result_order["id"] = str(real_id)
                result_order["status"] = "PENDING"
                logger.info(f"LIVE Order successfully sent to Zerodha Exchange! Order ID: {real_id}")
            except Exception as e:
                logger.error(f"Kite API live order placement error: {e}")
                raise RuntimeError(f"Zerodha Order Placement Error: {str(e)}")

        return result_order

zerodha_service = ZerodhaService()
