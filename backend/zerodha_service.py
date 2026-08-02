import logging
import random
import time
from typing import Dict, Any, List, Optional
from config import settings

logger = logging.getLogger("tradeforge.zerodha")

class ZerodhaService:
    def __init__(self):
        self.api_key = settings.KITE_API_KEY
        self.api_secret = settings.KITE_API_SECRET
        self.access_token = settings.KITE_ACCESS_TOKEN
        self.is_mock_mode = settings.KITE_MOCK_MODE or not (self.api_key and self.access_token)
        self.kite = None
        self.user_profile = {
            "user_name": "Pro Trader",
            "client_id": "ZF8921",
            "user_type": "individual",
            "email": "trader@tradeforge.ai"
        }
        self._init_client()

    def _init_client(self):
        if self.api_key and self.access_token:
            try:
                from kiteconnect import KiteConnect
                self.kite = KiteConnect(api_key=self.api_key)
                self.kite.set_access_token(self.access_token)
                
                # Test connection by fetching profile
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
                return {
                    "today_pnl": equity.get("utilised", {}).get("realised_m2m", 0.0),
                    "today_pnl_percent": 0.0,
                    "overall_pnl": equity.get("utilised", {}).get("realised_m2m", 0.0),
                    "overall_pnl_percent": 0.0,
                    "available_margin": equity.get("available", {}).get("live_balance", 0.0),
                    "used_margin": equity.get("utilised", {}).get("debits", 0.0),
                    "capital": equity.get("net", 0.0),
                    "total_investment": equity.get("available", {}).get("collateral", 0.0)
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

    def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        symbol = order_data.get("symbol")
        side = order_data.get("side", "BUY").upper()
        qty = int(order_data.get("qty", 1))
        product = order_data.get("product", "CNC").upper()
        order_type = order_data.get("order_type", "MARKET").upper()
        price = float(order_data.get("price", 0))
        target = float(order_data.get("target", 0)) if order_data.get("target") else None
        stop_loss = float(order_data.get("stop_loss", 0)) if order_data.get("stop_loss") else None

        # Calculate estimated charges based on Zerodha tariff
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
