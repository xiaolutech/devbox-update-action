/**
 * Network retry mechanism with exponential backoff
 * Implements requirement 5.2 for handling network timeouts and connection errors
 */

import { NetworkError } from "../types";
import {
	ApiRequestConfig,
	calculateRetryDelay,
	getDefaultApiConfig,
} from "./api-config";
import { handleError, shouldRetryError } from "./error-handler";

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
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 10000,
	multiplier: 2,
	jitter: true,
};

/**
 * Retry mechanism class with exponential backoff
 */
export class RetryMechanism {
	private config: RetryConfig;

	constructor(config: Partial<RetryConfig> = {}) {
		this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
	}

	/**
	 * Execute an operation with retry logic
	 * @param operation - The async operation to retry
	 * @param context - Context description for logging
	 * @param customConfig - Optional custom retry configuration
	 * @returns Promise with retry result
	 */
	async executeWithRetry<T>(
		operation: () => Promise<T>,
		context: string = "operation",
		customConfig?: Partial<RetryConfig>,
	): Promise<T> {
		const config = customConfig
			? { ...this.config, ...customConfig }
			: this.config;
		const attempts: RetryAttempt[] = [];
		const startTime = Date.now();

		for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
			const attemptStart = Date.now();

			try {
				console.log(
					`🔄 Attempting ${context} (attempt ${attempt + 1}/${config.maxRetries + 1})`,
				);

				const result = await operation();

				// Success - log and return result
				const totalTime = Date.now() - startTime;
				console.log(
					`✅ ${context} succeeded after ${attempt + 1} attempt(s) in ${totalTime}ms`,
				);

				attempts.push({
					attempt: attempt + 1,
					delay: 0,
					timestamp: new Date().toISOString(),
				});

				return result;
			} catch (error) {
				const attemptTime = Date.now() - attemptStart;

				// Handle and classify the error
				const errorInfo = handleError(
					error,
					`${context} - attempt ${attempt + 1}`,
				);

				attempts.push({
					attempt: attempt + 1,
					delay: attemptTime,
					error: error instanceof Error ? error : new Error(String(error)),
					timestamp: new Date().toISOString(),
				});

				// Check if we should retry this error
				if (!shouldRetryError(error)) {
					console.log(
						`❌ ${context} failed with non-retryable error: ${errorInfo.message}`,
					);
					throw error;
				}

				// If this was the last attempt, throw the error
				if (attempt >= config.maxRetries) {
					const totalTime = Date.now() - startTime;
					console.log(
						`❌ ${context} failed after ${attempt + 1} attempts in ${totalTime}ms`,
					);
					throw error;
				}

				// Calculate delay for next attempt
				const delay = this.calculateDelay(attempt, config);

				console.log(
					`⏳ ${context} failed (attempt ${attempt + 1}), retrying in ${delay}ms...`,
				);
				console.log(`   Error: ${errorInfo.message}`);

				// Wait before next attempt
				await this.sleep(delay);
			}
		}

		// This should never be reached, but TypeScript requires it
		throw new Error(`Unexpected end of retry loop for ${context}`);
	}

	/**
	 * Retry a network request with specific handling for common network errors
	 * @param requestFn - Function that makes the network request
	 * @param context - Context description for logging
	 * @returns Promise with the request result
	 */
	async retryNetworkRequest<T>(
		requestFn: () => Promise<T>,
		context: string = "network request",
	): Promise<T> {
		const apiConfig = getDefaultApiConfig();

		return this.executeWithRetry(requestFn, context, {
			maxRetries: apiConfig.maxRetries,
			baseDelay: apiConfig.retryDelay,
			maxDelay: apiConfig.maxRetryDelay,
			multiplier: apiConfig.retryMultiplier,
		});
	}

	/**
	 * Retry a fetch request with built-in timeout and error handling
	 * @param url - URL to fetch
	 * @param options - Fetch options
	 * @param context - Context description for logging
	 * @returns Promise with the fetch response
	 */
	async retryFetch(
		url: string,
		options: RequestInit = {},
		context: string = "fetch request",
	): Promise<Response> {
		const apiConfig = getDefaultApiConfig();

		return this.retryNetworkRequest(async () => {
			// Create AbortController for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

			try {
				const response = await fetch(url, {
					...options,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				// Check for HTTP errors
				if (!response.ok) {
					const errorMessage = `HTTP ${response.status}: ${response.statusText}`;

					// Classify HTTP errors
					if (response.status >= 500 || response.status === 429) {
						// Server errors and rate limiting are retryable
						throw new NetworkError(errorMessage, {
							status: response.status,
							statusText: response.statusText,
							url,
						});
					} else {
						// Client errors are not retryable
						throw new Error(errorMessage);
					}
				}

				return response;
			} catch (error) {
				clearTimeout(timeoutId);

				// Handle AbortError (timeout)
				if (error instanceof Error && error.name === "AbortError") {
					throw new NetworkError(
						`Request timeout after ${apiConfig.timeout}ms`,
						{ url },
					);
				}

				// Handle other fetch errors
				if (error instanceof Error) {
					// Wrap network-related errors in NetworkError for proper classification
					if (this.isNetworkError(error)) {
						throw new NetworkError(error.message, {
							url,
							originalError: error.message,
						});
					}
				}

				throw error;
			}
		}, context);
	}

	/**
	 * Calculate delay for next retry attempt using exponential backoff
	 * @param attempt - Current attempt number (0-based)
	 * @param config - Retry configuration
	 * @returns Delay in milliseconds
	 */
	private calculateDelay(attempt: number, config: RetryConfig): number {
		// Calculate exponential backoff delay
		let delay = config.baseDelay * config.multiplier ** attempt;

		// Apply maximum delay limit
		delay = Math.min(delay, config.maxDelay);

		// Add jitter to prevent thundering herd
		if (config.jitter) {
			const jitterAmount = delay * 0.1; // 10% jitter
			const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
			delay = Math.max(0, delay + jitter);
		}

		return Math.round(delay);
	}

	/**
	 * Sleep for specified milliseconds
	 * @param ms - Milliseconds to sleep
	 * @returns Promise that resolves after the delay
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Check if an error is a network-related error
	 * @param error - The error to check
	 * @returns true if it's a network error
	 */
	private isNetworkError(error: Error): boolean {
		const networkPatterns = [
			/ECONNRESET/,
			/ETIMEDOUT/,
			/ENOTFOUND/,
			/ECONNREFUSED/,
			/fetch.*failed/i,
			/network.*error/i,
			/connection.*error/i,
			/dns.*error/i,
		];

		return networkPatterns.some((pattern) => pattern.test(error.message));
	}

	/**
	 * Update retry configuration
	 * @param newConfig - New configuration options
	 */
	updateConfig(newConfig: Partial<RetryConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Get current retry configuration
	 * @returns Current retry configuration
	 */
	getConfig(): RetryConfig {
		return { ...this.config };
	}
}

/**
 * Global retry mechanism instance
 */
export const retryMechanism = new RetryMechanism();

/**
 * Convenience function to retry an operation with exponential backoff
 * @param operation - The async operation to retry
 * @param context - Context description for logging
 * @param config - Optional retry configuration
 * @returns Promise with the operation result
 */
export async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	context: string = "operation",
	config?: Partial<RetryConfig>,
): Promise<T> {
	return retryMechanism.executeWithRetry(operation, context, config);
}

/**
 * Convenience function to retry a network request
 * @param requestFn - Function that makes the network request
 * @param context - Context description for logging
 * @returns Promise with the request result
 */
export async function retryNetworkRequest<T>(
	requestFn: () => Promise<T>,
	context: string = "network request",
): Promise<T> {
	return retryMechanism.retryNetworkRequest(requestFn, context);
}

/**
 * Convenience function to retry a fetch request
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param context - Context description for logging
 * @returns Promise with the fetch response
 */
export async function retryFetch(
	url: string,
	options: RequestInit = {},
	context: string = "fetch request",
): Promise<Response> {
	return retryMechanism.retryFetch(url, options, context);
}
