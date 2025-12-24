/**
 * Centralized error handling and classification system
 * Implements requirements 4.5 and 5.5 for clear error reporting and diagnostic logging
 */
/**
 * Error severity levels for classification
 */
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
/**
 * Error categories for classification
 */
export declare enum ErrorCategory {
    NETWORK = "network",
    VALIDATION = "validation",
    FILE_SYSTEM = "file_system",
    GITHUB_API = "github_api",
    DEVBOX_COMMAND = "devbox_command",
    CONFIGURATION = "configuration",
    UNKNOWN = "unknown"
}
/**
 * Structured error information for reporting
 */
export interface ErrorInfo {
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
    code: string;
    context: Record<string, unknown>;
    timestamp: string;
    retryable: boolean;
    suggestions?: string[];
}
/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
    logLevel: "debug" | "info" | "warn" | "error";
    includeStackTrace: boolean;
    maxContextSize: number;
}
/**
 * Centralized error handler class
 */
export declare class ErrorHandler {
    private config;
    constructor(config?: Partial<ErrorHandlerConfig>);
    /**
     * Handle an error with proper classification and reporting
     * @param error - The error to handle
     * @param context - Additional context information
     * @returns Structured error information
     */
    handleError(error: unknown, context?: string): ErrorInfo;
    /**
     * Classify an error into category, severity, and other metadata
     * @param error - The error to classify
     * @param context - Additional context information
     * @returns Structured error information
     */
    private classifyError;
    /**
     * Log error information with appropriate level
     * @param errorInfo - Structured error information
     */
    private logError;
    /**
     * Format error message for logging
     * @param errorInfo - Structured error information
     * @returns Formatted error message
     */
    private formatErrorMessage;
    /**
     * Check if an error is a network-related error
     * @param error - The error to check
     * @returns true if it's a network error
     */
    private isNetworkError;
    /**
     * Check if an error is a file system error
     * @param error - The error to check
     * @returns true if it's a file system error
     */
    private isFileSystemError;
    /**
     * Check if an error is a devbox command error
     * @param error - The error to check
     * @returns true if it's a devbox command error
     */
    private isDevboxCommandError;
    /**
     * Check if an error is a configuration error
     * @param error - The error to check
     * @returns true if it's a configuration error
     */
    private isConfigurationError;
    /**
     * Check if a GitHub error is retryable
     * @param error - The GitHub error to check
     * @returns true if the error should be retried
     */
    private isGitHubErrorRetryable;
    /**
     * Truncate context object if it exceeds maximum size
     * @param context - Context object to truncate
     * @returns Truncated context object
     */
    private truncateContext;
    /**
     * Create a user-friendly error message for GitHub Action outputs
     * @param errorInfo - Structured error information
     * @returns User-friendly error message
     */
    createUserFriendlyMessage(errorInfo: ErrorInfo): string;
    /**
     * Check if an error should be retried based on classification
     * @param error - The error to check
     * @returns true if the error should be retried
     */
    shouldRetry(error: unknown): boolean;
}
/**
 * Global error handler instance
 */
export declare const errorHandler: ErrorHandler;
/**
 * Convenience function to handle errors
 * @param error - The error to handle
 * @param context - Additional context information
 * @returns Structured error information
 */
export declare function handleError(error: unknown, context?: string): ErrorInfo;
/**
 * Convenience function to check if an error should be retried
 * @param error - The error to check
 * @returns true if the error should be retried
 */
export declare function shouldRetryError(error: unknown): boolean;
