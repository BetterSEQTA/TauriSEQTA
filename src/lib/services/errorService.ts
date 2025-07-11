import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { get } from 'svelte/store';

export interface ErrorInfo {
  message: string;
  status?: number;
  stack?: string;
  url?: string;
  timestamp: string;
  userAgent?: string;
}

class ErrorService {
  private errorQueue: ErrorInfo[] = [];
  private isHandlingError = false;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        status: event.reason?.status || 500,
        stack: event.reason?.stack,
        url: get(page).url.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message || 'JavaScript Error',
        status: 500,
        stack: event.error?.stack,
        url: get(page).url.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    });

    // Handle fetch errors
    this.interceptFetchErrors();
  }

  private interceptFetchErrors() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Handle HTTP error status codes
        if (!response.ok) {
          const errorInfo: ErrorInfo = {
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            url: get(page).url.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          };

          // Don't redirect for 401/403 as they're handled by auth
          if (response.status !== 401 && response.status !== 403) {
            this.handleError(errorInfo);
          }
        }
        
        return response;
      } catch (error) {
        const errorInfo: ErrorInfo = {
          message: error instanceof Error ? error.message : 'Network Error',
          status: 500,
          stack: error instanceof Error ? error.stack : undefined,
          url: get(page).url.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        };
        
        this.handleError(errorInfo);
        throw error;
      }
    };
  }

  private handleError(errorInfo: ErrorInfo) {
    // Prevent infinite error loops
    if (this.isHandlingError) {
      console.error('Error while handling error:', errorInfo);
      return;
    }

    this.isHandlingError = true;

    // Log error for debugging
    console.error('Error caught by ErrorService:', errorInfo);

    // Add to error queue
    this.errorQueue.push(errorInfo);

    // Navigate to error page
    this.navigateToErrorPage(errorInfo);

    // Reset flag after a delay
    setTimeout(() => {
      this.isHandlingError = false;
    }, 1000);
  }

  private navigateToErrorPage(errorInfo: ErrorInfo) {
    // Don't redirect if already on error page
    if (get(page).url.pathname === '/error') {
      return;
    }

    // Create error object for SvelteKit error page
    const error = new Error(errorInfo.message);
    (error as any).status = errorInfo.status;
    (error as any).stack = errorInfo.stack;

    // Navigate to error page with error details
    goto(`/error?status=${errorInfo.status}&message=${encodeURIComponent(errorInfo.message)}`);
  }

  // Public method to manually handle errors
  public handleManualError(error: Error | string, status: number = 500) {
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message,
      status,
      stack: error instanceof Error ? error.stack : undefined,
      url: get(page).url.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    this.handleError(errorInfo);
  }

  // Get error queue for debugging
  public getErrorQueue(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  // Clear error queue
  public clearErrorQueue(): void {
    this.errorQueue = [];
  }

  // Report errors to external service (placeholder)
  public async reportError(errorInfo: ErrorInfo): Promise<void> {
    try {
      // You can implement error reporting to services like Sentry, LogRocket, etc.
      console.log('Reporting error to external service:', errorInfo);
      
      // Example: Send to your backend
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorInfo)
      // });
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }
}

// Create singleton instance
export const errorService = new ErrorService();

// Export utility functions
export function handleError(error: Error | string, status: number = 500) {
  errorService.handleManualError(error, status);
}

export function reportError(errorInfo: ErrorInfo) {
  return errorService.reportError(errorInfo);
} 