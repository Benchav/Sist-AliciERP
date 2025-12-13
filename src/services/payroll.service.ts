import { api } from '@/lib/api';
import type { CreatePayrollDTO, PayrollEntry, UpdatePayrollDTO } from '@/types';

const PAYROLL_PATH = '/payroll';

type ApiEnvelope<T> = { data: T };

const unwrap = <T>(payload: ApiEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};

export const listPayroll = async (): Promise<PayrollEntry[]> => {
  const { data } = await api.get<ApiEnvelope<PayrollEntry[]> | PayrollEntry[]>(PAYROLL_PATH);
  return unwrap(data);
};

export const createPayroll = async (payload: CreatePayrollDTO): Promise<PayrollEntry> => {
  const { data } = await api.post<ApiEnvelope<PayrollEntry> | PayrollEntry>(PAYROLL_PATH, payload);
  return unwrap(data);
};

export const updatePayroll = async (id: string, payload: UpdatePayrollDTO): Promise<PayrollEntry> => {
  const { data } = await api.put<ApiEnvelope<PayrollEntry> | PayrollEntry>(`${PAYROLL_PATH}/${id}`, payload);
  return unwrap(data);
};

export const deletePayroll = async (id: string): Promise<void> => {
  await api.delete(`${PAYROLL_PATH}/${id}`);
};

export const payrollService = {
  listPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
};
