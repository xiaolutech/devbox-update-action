/**
 * Network retry mechanism with exponential backoff
 * Implements requirement 5.2 for handling network timeouts and connection errors
 */
/**
 * Retry configuration options
 */
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    multiplier: number;
    jitter: boolean;
}
/**
 * Retry attempt information
 */
export interface RetryAttempt {
    attempt: number;
    delay: number;
    error?: Error;
    timestamp: string;
}
/**
 * Retry result information
 */
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: RetryAttempt[];
    totalTime: number;
}
/**
 * Retry mechanism class with exponential backoff
 */
export declare class RetryMechanism {
    private config;
    constructor(config?: Partial<RetryConfig>);
    /**
     * Execute an operation with retry logic
     * @param operation - The async operation to retry
     * @param context - Context description for logging
     * @param customConfig - Optional custom retry configuration
     * @returns Promise with retry result
     */
    executeWithRetry<T>(operation: () => Promise<T>, context?: string, customConfig?: Partial<RetryConfig>): Promise<T>;
    /**
     * Retry a network request with specific handling for common network errors
     * @param requestFn - Function that makes the network request
     * @param context - Context description for logging
     * @returns Promise with the request result
     */
    retryNetworkRequest<T>(requestFn: () => Promise<T>, context?: string): Promise<T>;
    /**
     * Retry a fetch request with built-in timeout and error handling
     * @param url - URL to fetch
     * @param options - Fetch options
     * @param context - Context description for logging
     * @returns Promise with the fetch response
     */
    retryFetch(url: string, options?: RequestInit, context?: string): Promise<Response>;
    /**
     * Calculate delay for next retry attempt using exponential backoff
     * @param attempt - Current attempt number (0-based)
     * @param config - Retry configuration
     * @returns Delay in milliseconds
     */
    private calculateDelay;
    /**
     * Sleep for specified milliseconds
     * @param ms - Milliseconds to sleep
     * @returns Promise that resolves after the delay
     */
    private sleep;
    /**
     * Check if an error is a network-related error
     * @param error - The error to check
     * @returns true if it's a network error
     */
    private isNetworkError;
    /**
     * Update retry configuration
     * @param newConfig - New configuration options
     */
    updateConfig(newConfig: Partial<RetryConfig>): void;
    /**
     * Get current retry configuration
     * @returns Current retry configuration
     */
    getConfig(): RetryConfig;
}
/**
 * Global retry mechanism instance
 */
export declare const retryMechanism: RetryMechanism;
/**
 * Convenience function to retry an operation with exponential backoff
 * @param operation - The async operation to retry
 * @param context - Context description for logging
 * @param config - Optional retry configuration
 * @returns Promise with the operation result
 */
export declare function retryWithBackoff<T>(operation: () => Promise<T>, context?: string, config?: Partial<RetryConfig>): Promise<T>;
/**
 * Convenience function to retry a network request
 * @param requestFn - Function that makes the network request
 * @param context - Context description for logging
 * @returns Promise with the request result
 */
export declare function retryNetworkRequest<T>(requestFn: () => Promise<T>, context?: string): Promise<T>;
/**
 * Convenience function to retry a fetch request
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param context - Context description for logging
 * @returns Promise with the fetch response
 */
export declare function retryFetch(url: string, options?: RequestInit, context?: string): Promise<Response>;
