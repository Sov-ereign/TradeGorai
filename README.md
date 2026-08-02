# TradeGorai - AI-Powered Algorithmic & Manual Trading Platform

**TradeGorai** is a modern, high-density dark-themed web trading terminal integrated with **Zerodha Kite Connect API**, live **WebSockets** tick updates, and **MongoDB Atlas** backend data persistence.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Lucide Icons, Axios, WebSockets.
- **Backend**: FastAPI (Python 3.11/3.14), Uvicorn, Gunicorn, Async Motor (MongoDB Driver), PyMongo, Zerodha `kiteconnect` SDK.
- **Database**: MongoDB Atlas (`MONGODB_URI`) with in-memory fallback.
- **Real-Time Data**: FastAPI WebSockets broadcasting live tick data.

---

## 🚀 Deployment Instructions

### 1. Backend Deployment (Render / Railway)

1. Connect your GitHub repository `https://github.com/Sov-ereign/TradeGorai` to **Render** ([render.com](https://render.com)).
2. Create a new **Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add Environment Variables on Render:
   - `MONGODB_URI`: Your MongoDB Atlas URI
   - `KITE_API_KEY`: Your Zerodha Kite API Key
   - `KITE_API_SECRET`: Your Zerodha Kite API Secret
   - `KITE_MOCK_MODE`: `false` (for live trading) or `true` (sandbox mode)
4. Save & Deploy. Render will generate your backend URL e.g.:
   `https://tradegorai-backend.onrender.com`

---

### 2. Frontend Deployment (Vercel)

1. Import your GitHub repository `https://github.com/Sov-ereign/TradeGorai` into **Vercel** ([vercel.com](https://vercel.com)).
2. Set Root Directory to `frontend`.
3. Add Environment Variables on Vercel:
   - `VITE_API_BASE_URL`: `https://tradegorai-backend.onrender.com/api`
   - `VITE_WS_URL`: `wss://tradegorai-backend.onrender.com/ws/ticks`
4. Click **Deploy**. Vercel will generate your live URL e.g.:
   `https://tradegorai.vercel.app`

---

### 3. Zerodha App Settings ([kite.trade](https://kite.trade))

Update your app configuration on Zerodha Developer Portal:
- **Redirect URL**: `https://tradegorai-backend.onrender.com/api/zerodha/callback`
- **Postback URL**: `https://tradegorai-backend.onrender.com/api/zerodha/postback`
