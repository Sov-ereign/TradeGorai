import axios from 'axios';
import type { Stock, Order, Position, PortfolioMetrics, WatchlistGroup, AlgoStrategy } from '../types/trading';

// Normalize VITE_API_BASE_URL to always include /api path
let rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').trim();

if (rawBase.endsWith('/')) {
  rawBase = rawBase.slice(0, -1);
}

if (!rawBase.endsWith('/api')) {
  rawBase = `${rawBase}/api`;
}

export const API_BASE_URL = rawBase;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getZerodhaStatus = async () => {
  const res = await api.get('/zerodha/status');
  return res.data;
};

export const saveZerodhaCredentials = async (apiKey: string, apiSecret: string, accessToken?: string) => {
  const res = await api.post('/zerodha/credentials', {
    api_key: apiKey,
    api_secret: apiSecret,
    access_token: accessToken,
  });
  return res.data;
};

export const getMarketStatus = async () => {
  const res = await api.get('/market/status');
  return res.data;
};

export const searchStocks = async (query: string): Promise<Stock[]> => {
  const res = await api.get('/market/stocks', { params: { q: query } });
  return res.data;
};

export const getWatchlists = async (): Promise<WatchlistGroup[]> => {
  const res = await api.get('/watchlist');
  return res.data;
};

export const getWatchlist = async (): Promise<Stock[]> => {
  const groups: WatchlistGroup[] = await getWatchlists();
  if (groups.length > 0) {
    return groups[0].items;
  }
  return [];
};

export const createWatchlistGroup = async (name: string) => {
  const res = await api.post('/watchlist/group', { name });
  return res.data;
};

export const renameWatchlistGroup = async (groupId: string, name: string) => {
  const res = await api.put(`/watchlist/group/${groupId}/rename`, { name });
  return res.data;
};

export const deleteWatchlistGroup = async (groupId: string) => {
  const res = await api.delete(`/watchlist/group/${groupId}`);
  return res.data;
};

export const addToWatchlist = async (stock: Stock, groupId?: string) => {
  const res = await api.post('/watchlist', { ...stock, group_id: groupId });
  return res.data;
};

export const removeFromWatchlist = async (symbol: string, groupId?: string) => {
  const res = await api.delete(`/watchlist/${symbol}`, { params: { group_id: groupId } });
  return res.data;
};

export const toggleStarStock = async (symbol: string) => {
  const res = await api.put(`/watchlist/${symbol}/star`);
  return res.data;
};

export const getOrders = async (status?: string): Promise<Order[]> => {
  const res = await api.get('/orders', { params: { status } });
  return res.data;
};

export const placeOrder = async (orderData: Partial<Order>) => {
  const res = await api.post('/orders', orderData);
  return res.data;
};

export const modifyOrder = async (orderId: string, updateData: Partial<Order>) => {
  const res = await api.put(`/orders/${orderId}`, updateData);
  return res.data;
};

export const cancelOrder = async (orderId: string) => {
  const res = await api.delete(`/orders/${orderId}`);
  return res.data;
};

export const getPositions = async (): Promise<Position[]> => {
  const res = await api.get('/positions');
  return res.data;
};

export const exitPosition = async (symbol: string, product: string = 'CNC') => {
  const res = await api.post(`/positions/exit/${symbol}`, null, { params: { product } });
  return res.data;
};

export const squareOffAllPositions = async () => {
  const res = await api.post('/positions/square-off-all');
  return res.data;
};

export const getPortfolioSummary = async (): Promise<PortfolioMetrics> => {
  const res = await api.get('/portfolio');
  return res.data;
};

export const getStrategies = async (): Promise<AlgoStrategy[]> => {
  const res = await api.get('/strategy');
  return res.data;
};

export const toggleStrategy = async (strategyId: string, status?: string) => {
  const res = await api.post(`/strategy/${strategyId}/toggle`, { status });
  return res.data;
};
