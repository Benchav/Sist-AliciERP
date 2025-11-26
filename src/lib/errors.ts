import { isAxiosError, type AxiosError } from 'axios';

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

const FALLBACK_MESSAGE = 'Ocurrió un error inesperado';

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string = FALLBACK_MESSAGE
): string => {
  if (isAxiosError<ApiErrorPayload>(error)) {
    return (
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      fallbackMessage
    );
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  if (typeof error === 'string') {
    return error || fallbackMessage;
  }

  return fallbackMessage;
};

export const getApiErrorStatus = (error: unknown): number | undefined => {
  if (isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
};

export const castAxiosError = <T = ApiErrorPayload>(
  error: unknown
): AxiosError<T> | null => {
  if (isAxiosError<T>(error)) {
    return error;
  }
  return null;
};
