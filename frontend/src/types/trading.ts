export interface Stock {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  high: number;
  low: number;
  starred: boolean;
  exchange?: string;
  depth?: {
    buy: { price: number; quantity: number; orders: number }[];
    sell: { price: number; quantity: number; orders: number }[];
  };
}

export interface Position {
  symbol: string;
  product: 'CNC' | 'MIS';
  qty: number;
  avg_price: number;
  current_price: number;
  target?: number;
  stop_loss?: number;
  trailing_stop_loss?: number;
  pnl: number;
  pnl_percent: number;
  unrealized_pnl: number;
  status: 'OPEN' | 'CLOSED';
}

export interface AlgoStrategy {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'RUNNING';
  win_rate: number;
  total_pnl: number;
  category?: string;
  description?: string;
  total_trades?: number;
  params: Record<string, any>;
  last_signal?: string;
  last_signal_time?: string;
}

export type ProductType = 'CNC' | 'MIS';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED' | 'OPEN' | 'COMPLETE' | 'AMO REQ' | 'TRIGGER PENDING';
export type ValidityType = 'DAY' | 'IOC';

export interface Order {
  id: string;
  time: string;
  symbol: string;
  exchange?: string;
  side: OrderSide;
  qty: number;
  price: number;
  product: ProductType;
  order_type: OrderType;
  target?: number;
  stop_loss?: number;
  trailing_stop_loss?: number;
  validity?: ValidityType;
  status: OrderStatus;
  notes?: string;
  est_val?: number;
  brokerage?: number;
  charges?: number;
  net_amount?: number;
}

export interface WatchlistGroup {
  id: string;
  name: string;
  is_default: boolean;
  items: Stock[];
}

export interface PortfolioMetrics {
  today_pnl: number;
  today_pnl_percent: number;
  overall_pnl: number;
  overall_pnl_percent: number;
  available_margin: number;
  used_margin: number;
  capital: number;
  total_investment: number;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'ORDER' | 'TRADE' | 'BROKER' | 'ERROR' | 'SYSTEM';
  message: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
}
