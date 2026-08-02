export type TickCallback = (ticks: Record<string, any>) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<TickCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectInterval: any = null;

  public connect(url: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/ticks') {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('⚡ Connected to TradeGorai WebSockets Tick Stream');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'TICK_UPDATE' && payload.ticks) {
            this.listeners.forEach((callback) => callback(payload.ticks));
          }
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
}

export const wsClient = new WebSocketClient();
