export type TickCallback = (payload: Record<string, any>) => void;

function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  if (apiBase.startsWith('https://')) {
    return apiBase.replace('https://', 'wss://') + '/ws/ticks';
  } else if (apiBase.startsWith('http://')) {
    return apiBase.replace('http://', 'ws://') + '/ws/ticks';
  }
  return 'ws://localhost:8000/ws/ticks';
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<TickCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectInterval: any = null;

  public connect(customUrl?: string) {
    const url = customUrl || getWsUrl();

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log(`⚡ Connected to TradeGorai WebSockets Tick Stream (${url})`);
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Broadcast full payload to all listeners
          this.listeners.forEach((callback) => callback(payload));
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.warn('WebSocket connection lost. Retrying in 3 seconds...');
        this.scheduleReconnect(url);
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.error('Failed to initialize WebSocket:', e);
      this.scheduleReconnect(url);
    }
  }

  private scheduleReconnect(url: string) {
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        this.connect(url);
      }, 3000);
    }
  }

  public subscribe(callback: TickCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus() {
    return this.isConnected;
  }

  public disconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const wsClient = new WebSocketClient();
