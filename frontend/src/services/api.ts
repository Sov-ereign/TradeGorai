import axios from 'axios';
import type { Stock, Order, Position, PortfolioMetrics } from '../types/trading';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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

export const getWatchlist = async (): Promise<Stock[]> => {
  const res = await api.get('/watchlist');
  return res.data;
};

export const addToWatchlist = async (stock: Stock) => {
  const res = await api.post('/watchlist', stock);
  return res.data;
};

export const removeFromWatchlist = async (symbol: string) => {
  const res = await api.delete(`/watchlist/${symbol}`);
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
