export interface Stock {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  high: number;
  low: number;
  starred?: boolean;
  exchange?: string;
  sector?: string;
}

export type ProductType = 'CNC' | 'MIS';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';
export type ValidityType = 'DAY' | 'IOC';

export interface Order {
  id: string;
  time: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  price: number;
  product: ProductType;
  order_type: OrderType;
  target?: number;
  stop_loss?: number;
  trailing_stop_loss?: number;
  validity?: ValidityType;
  notes?: string;
  status: OrderStatus;
  est_val?: number;
  brokerage?: number;
  charges?: number;
  net_amount?: number;
}

export interface Position {
  symbol: string;
  product: ProductType;
  qty: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_percent: number;
  unrealized_pnl: number;
  status: 'OPEN' | 'CLOSED';
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
