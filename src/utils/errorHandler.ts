import { errorService } from '../lib/services/errorService';

/**
 * Wraps an async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage?: string,
  status: number = 500
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
    errorService.handleManualError(message, status);
    return null;
  }
}

/**
 * Wraps a synchronous function with error handling
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  errorMessage?: string,
  status: number = 500
): T | null {
  try {
    return fn();
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
    errorService.handleManualError(message, status);
    return null;
  }
}

/**
 * Creates a safe async function that handles errors
 */
export function createSafeAsyncFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorMessage?: string,
  status: number = 500
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
      errorService.handleManualError(message, status);
      return null;
    }
  };
}

/**
 * Creates a safe synchronous function that handles errors
 */
export function createSafeSyncFunction<T extends any[], R>(
  fn: (...args: T) => R,
  errorMessage?: string,
  status: number = 500
) {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
      errorService.handleManualError(message, status);
      return null;
    }
  };
}

/**
 * Handles fetch errors specifically
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  errorMessage?: string
): Promise<Response | null> {
  try {
    const response = await fetch(input, init);
    
    if (!response.ok) {
      const message = errorMessage || `HTTP ${response.status}: ${response.statusText}`;
      errorService.handleManualError(message, response.status);
      return null;
    }
    
    return response;
  } catch (error) {
    const message = errorMessage || 'Network error occurred';
    errorService.handleManualError(message, 500);
    return null;
  }
}

/**
 * Handles Tauri invoke errors specifically
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, any>,
  errorMessage?: string
): Promise<T | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(command, args);
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : 'Tauri command failed');
    errorService.handleManualError(message, 500);
    return null;
  }
}

/**
 * Logs an error without redirecting to error page
 */
export function logError(error: Error | string, context?: string) {
  const message = typeof error === 'string' ? error : error.message;
  console.error(`[${context || 'App'}] Error:`, message);
  
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Shows a user-friendly error message
 */
export function showUserError(message: string, title: string = 'Error') {
  // You can implement this to show toast notifications or modals
  console.error(`[${title}] ${message}`);
  
  // Example: Show a toast notification
  // toast.error(message, { title });
} 