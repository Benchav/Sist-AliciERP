/**
 * Format utilities for SIST-ALICI ERP
 * Handles currency conversion and display formatting
 */

/**
 * Convert cents to display amount (divide by 100)
 */
export const centsToAmount = (cents: number): number => {
  return cents / 100;
};

/**
 * Convert display amount to cents (multiply by 100)
 */
export const amountToCents = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Format currency for display with symbol
 */
export const formatCurrency = (cents: number, currency: 'NIO' | 'USD' = 'NIO'): string => {
  const amount = centsToAmount(cents);
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
  return amountToCents(nioAmount) + amountToCents(usdAmount * exchangeRate);
};

/**
 * Calculate change from payment
 */
export const calculateChange = (
  totalCents: number,
  nioPayment: number,
  usdPayment: number,
  exchangeRate: number
): number => {
  const totalPayment = calculateTotalPayment(nioPayment, usdPayment, exchangeRate);
  const change = totalPayment - totalCents;
  return change > 0 ? change : 0;
};
