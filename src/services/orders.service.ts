import { api } from '@/lib/api';
import type { CreateOrderDTO, CreateOrderDepositDTO, FinalizeOrderDTO, Order } from '@/types';

const ORDERS_PATH = '/sales/orders';

type OrdersResponse<T> = { data: T };

export const listOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<OrdersResponse<Order[]>>(ORDERS_PATH);
  return data.data;
};

export const createOrder = async (payload: CreateOrderDTO): Promise<Order> => {
  const { data } = await api.post<OrdersResponse<Order>>(ORDERS_PATH, payload);
  return data.data;
};

export const getOrderDetail = async (id: string): Promise<Order> => {
  const { data } = await api.get<OrdersResponse<Order>>(`${ORDERS_PATH}/${id}`);
  return data.data;
};

export const addDeposit = async (id: string, payload: CreateOrderDepositDTO): Promise<Order> => {
  const { data } = await api.post<OrdersResponse<Order>>(`${ORDERS_PATH}/${id}/deposits`, payload);
  return data.data;
};

export const finalizeOrder = async (id: string, payload: FinalizeOrderDTO): Promise<Order> => {
  const { data } = await api.post<OrdersResponse<Order>>(`${ORDERS_PATH}/${id}/finalize`, payload);
  return data.data;
};

export const ordersService = {
  listOrders,
  createOrder,
  getOrderDetail,
  addDeposit,
  finalizeOrder,
};
