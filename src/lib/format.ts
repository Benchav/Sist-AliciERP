/**
 * Format utilities for SIST-ALICI ERP
 * Handles currency conversion and display formatting
 */

/**
 * Convert display amount to cents (multiply by 100)
 */
export const amountToCents = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Format currency for display with symbol (values are already in C$)
 */
export const formatCurrency = (amount: number, currency: 'NIO' | 'USD' = 'NIO'): string => {
  const symbol = currency === 'NIO' ? 'C$' : '$';
  
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('es-NI', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date for API (ISO string)
 */
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString();
};

/**
 * Calculate total payment in NIO from mixed currencies
 */
export const calculateTotalPayment = (
  nioAmount: number,
  usdAmount: number,
  exchangeRate: number
): number => {
  return nioAmount + usdAmount * exchangeRate;
};

/**
 * Calculate change from payment
 */
export const calculateChange = (
  totalAmount: number,
  nioPayment: number,
  usdPayment: number,
  exchangeRate: number
): number => {
  const totalPayment = calculateTotalPayment(nioPayment, usdPayment, exchangeRate);
  const change = totalPayment - totalAmount;
  return change > 0 ? change : 0;
};
