/**
 * API configuration utilities for Devbox Search API
 */

import { DEVBOX_API } from "../constants";

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
export function getDefaultApiConfig(): ApiRequestConfig {
	return {
		timeout: DEVBOX_API.TIMEOUT,
		maxRetries: DEVBOX_API.MAX_RETRIES,
		retryDelay: DEVBOX_API.RETRY_DELAY,
		retryMultiplier: DEVBOX_API.RETRY_MULTIPLIER,
		maxRetryDelay: DEVBOX_API.MAX_RETRY_DELAY,
	};
}

/**
 * Construct a full URL for the resolve endpoint
 * @param packageName - Name of the package to resolve
 * @param version - Optional version (defaults to 'latest')
 * @returns Full URL for the resolve endpoint
 */
export function buildResolveUrl(
	packageName: string,
	version: string = "latest",
): string {
	const baseUrl = DEVBOX_API.BASE_URL;
	const endpoint = DEVBOX_API.ENDPOINTS.RESOLVE;
	const params = new URLSearchParams({
		name: packageName,
		version: version,
	});

	return `${baseUrl}${endpoint}?${params.toString()}`;
}

/**
 * Construct a full URL for the package info endpoint
 * @param packageName - Name of the package to get info for
 * @returns Full URL for the package info endpoint
 */
export function buildPackageUrl(packageName: string): string {
	const baseUrl = DEVBOX_API.BASE_URL;
	const endpoint = DEVBOX_API.ENDPOINTS.PACKAGE;
	const params = new URLSearchParams({
		name: packageName,
	});

	return `${baseUrl}${endpoint}?${params.toString()}`;
}

/**
 * Calculate the next retry delay using exponential backoff
 * @param attempt - Current attempt number (0-based)
 * @param config - API configuration
 * @returns Delay in milliseconds for the next retry
 */
export function calculateRetryDelay(
	attempt: number,
	config: ApiRequestConfig = getDefaultApiConfig(),
): number {
	const delay = config.retryDelay * config.retryMultiplier ** attempt;
	return Math.min(delay, config.maxRetryDelay);
}

/**
 * Check if an error is retryable
 * @param error - The error to check
 * @returns true if the error should be retried
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		// Network errors are typically retryable
		if (
			error.name === "NetworkError" ||
			error.message.includes("ECONNRESET") ||
			error.message.includes("ETIMEDOUT") ||
			error.message.includes("ENOTFOUND")
		) {
			return true;
		}
	}

	// HTTP status codes that are retryable
	if (typeof error === "object" && error !== null && "status" in error) {
		const status = (error as { status: number }).status;
		return status >= 500 || status === 429; // Server errors and rate limiting
	}

	return false;
}

/**
 * Validate API endpoint configuration
 * @throws Error if configuration is invalid
 */
export function validateApiConfig(): void {
	if (!DEVBOX_API.BASE_URL) {
		throw new Error("DEVBOX_API.BASE_URL is not configured");
	}

	if (!DEVBOX_API.ENDPOINTS.RESOLVE) {
		throw new Error("DEVBOX_API.ENDPOINTS.RESOLVE is not configured");
	}

	if (!DEVBOX_API.ENDPOINTS.PACKAGE) {
		throw new Error("DEVBOX_API.ENDPOINTS.PACKAGE is not configured");
	}

	if (DEVBOX_API.TIMEOUT <= 0) {
		throw new Error("DEVBOX_API.TIMEOUT must be positive");
	}

	if (DEVBOX_API.MAX_RETRIES < 0) {
		throw new Error("DEVBOX_API.MAX_RETRIES must be non-negative");
	}

	try {
		new URL(DEVBOX_API.BASE_URL);
	} catch {
		throw new Error("DEVBOX_API.BASE_URL is not a valid URL");
	}
}
