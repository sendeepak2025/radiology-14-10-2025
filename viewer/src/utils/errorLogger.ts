/**
 * Centralized Error Logging Utility
 * Provides consistent error logging across the application
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  studyId?: string;
  additionalInfo?: Record<string, any>;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorLog {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context?: ErrorContext;
  timestamp: string;
  userAgent: string;
  url: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private endpoint = '/api/errors/log';

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context
   */
  log(
    error: Error | string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext
  ): void {
    const errorLog: ErrorLog = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      severity,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const style = this.getConsoleStyle(severity);
      console.error(
        `%c[${severity.toUpperCase()}] ${errorLog.message}`,
        style,
        errorLog
      );
    }

    // Send to backend in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToBackend(errorLog);
    }

    // TODO: Integrate with Sentry
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     level: severity,
    //     extra: context,
    //   });
    // }
  }

  /**
   * Log API errors
   */
  logApiError(
    endpoint: string,
    status: number,
    message: string,
    context?: ErrorContext
  ): void {
    this.log(
      `API Error: ${endpoint} (${status}) - ${message}`,
      status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      {
        ...context,
        action: 'api_call',
        additionalInfo: { endpoint, status },
      }
    );
  }

  /**
   * Log user action errors
   */
  logUserActionError(
    action: string,
    error: Error | string,
    context?: ErrorContext
  ): void {
    this.log(error, ErrorSeverity.LOW, {
      ...context,
      action,
    });
  }

  /**
   * Log critical errors that require immediate attention
   */
  logCritical(error: Error | string, context?: ErrorContext): void {
    this.log(error, ErrorSeverity.CRITICAL, context);
  }

  /**
   * Send error to backend endpoint
   */
  private async sendToBackend(errorLog: ErrorLog): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorLog),
      });
    } catch (err) {
      // Silently fail to avoid recursive errors
      console.error('Failed to send error log to backend:', err);
    }
  }

  /**
   * Get console styling based on severity
   */
  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      [ErrorSeverity.LOW]: 'color: #FFA726; font-weight: bold;',
      [ErrorSeverity.MEDIUM]: 'color: #FF7043; font-weight: bold;',
      [ErrorSeverity.HIGH]: 'color: #F44336; font-weight: bold;',
      [ErrorSeverity.CRITICAL]:
        'color: #fff; background-color: #D32F2F; font-weight: bold; padding: 2px 4px;',
    };
    return styles[severity];
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Convenience functions
export const logError = (error: Error | string, context?: ErrorContext) => {
  errorLogger.log(error, ErrorSeverity.MEDIUM, context);
};

export const logApiError = (
  endpoint: string,
  status: number,
  message: string,
  context?: ErrorContext
) => {
  errorLogger.logApiError(endpoint, status, message, context);
};

export const logCritical = (error: Error | string, context?: ErrorContext) => {
  errorLogger.logCritical(error, context);
};

export const logUserAction = (
  action: string,
  error: Error | string,
  context?: ErrorContext
) => {
  errorLogger.logUserActionError(action, error, context);
};
