/**
 * API configuration utilities for Devbox Search API
 */
/**
 * Configuration for API requests
 */
export interface ApiRequestConfig {
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    retryMultiplier: number;
    maxRetryDelay: number;
}
/**
 * Get the default API request configuration
 * @returns Default API configuration
 */
export declare function getDefaultApiConfig(): ApiRequestConfig;
/**
 * Construct a full URL for the resolve endpoint
 * @param packageName - Name of the package to resolve
 * @param version - Optional version (defaults to 'latest')
 * @returns Full URL for the resolve endpoint
 */
export declare function buildResolveUrl(packageName: string, version?: string): string;
/**
 * Construct a full URL for the package info endpoint
 * @param packageName - Name of the package to get info for
 * @returns Full URL for the package info endpoint
 */
export declare function buildPackageUrl(packageName: string): string;
/**
 * Calculate the next retry delay using exponential backoff
 * @param attempt - Current attempt number (0-based)
 * @param config - API configuration
 * @returns Delay in milliseconds for the next retry
 */
export declare function calculateRetryDelay(attempt: number, config?: ApiRequestConfig): number;
/**
 * Check if an error is retryable
 * @param error - The error to check
 * @returns true if the error should be retried
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Validate API endpoint configuration
 * @throws Error if configuration is invalid
 */
export declare function validateApiConfig(): void;
