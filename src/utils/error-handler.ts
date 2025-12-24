/**
 * Centralized error handling and classification system
 * Implements requirements 4.5 and 5.5 for clear error reporting and diagnostic logging
 */

import {
	DevboxError,
	GitHubError,
	NetworkError,
	ValidationError,
} from "../types";

/**
 * Error severity levels for classification
 */
export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
	NETWORK = "network",
	VALIDATION = "validation",
	FILE_SYSTEM = "file_system",
	GITHUB_API = "github_api",
	DEVBOX_COMMAND = "devbox_command",
	CONFIGURATION = "configuration",
	UNKNOWN = "unknown",
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
export class ErrorHandler {
	private config: ErrorHandlerConfig;

	constructor(config: Partial<ErrorHandlerConfig> = {}) {
		this.config = {
			logLevel: "error",
			includeStackTrace: true,
			maxContextSize: 1000,
			...config,
		};
	}

	/**
	 * Handle an error with proper classification and reporting
	 * @param error - The error to handle
	 * @param context - Additional context information
	 * @returns Structured error information
	 */
	handleError(error: unknown, context: string = ""): ErrorInfo {
		const errorInfo = this.classifyError(error, context);
		this.logError(errorInfo);
		return errorInfo;
	}

	/**
	 * Classify an error into category, severity, and other metadata
	 * @param error - The error to classify
	 * @param context - Additional context information
	 * @returns Structured error information
	 */
	private classifyError(error: unknown, context: string): ErrorInfo {
		const timestamp = new Date().toISOString();
		let category = ErrorCategory.UNKNOWN;
		let severity = ErrorSeverity.MEDIUM;
		let message = "An unknown error occurred";
		let code = "UNKNOWN_ERROR";
		let errorContext: Record<string, unknown> = { context };
		let retryable = false;
		let suggestions: string[] = [];

		if (error instanceof DevboxError) {
			code = error.code;
			message = error.message;
			errorContext = { ...errorContext, ...error.context };

			if (error instanceof NetworkError) {
				category = ErrorCategory.NETWORK;
				severity = ErrorSeverity.MEDIUM;
				retryable = true;
				suggestions = [
					"Check your internet connection",
					"Verify the Devbox Search API is accessible",
					"The operation will be retried automatically",
				];
			} else if (error instanceof ValidationError) {
				category = ErrorCategory.VALIDATION;
				severity = ErrorSeverity.HIGH;
				retryable = false;
				suggestions = [
					"Check the devbox.json file syntax",
					"Verify package names are valid",
					"Ensure all required fields are present",
				];
			} else if (error instanceof GitHubError) {
				category = ErrorCategory.GITHUB_API;
				severity = ErrorSeverity.HIGH;
				retryable = this.isGitHubErrorRetryable(error);
				suggestions = [
					"Check GitHub token permissions",
					"Verify repository access rights",
					"Check GitHub API rate limits",
				];
			}
		} else if (error instanceof Error) {
			message = error.message;
			code = error.name || "ERROR";

			// Classify based on error message patterns
			if (this.isNetworkError(error)) {
				category = ErrorCategory.NETWORK;
				severity = ErrorSeverity.MEDIUM;
				retryable = true;
				suggestions = [
					"Check network connectivity",
					"Verify DNS resolution",
					"The operation will be retried automatically",
				];
			} else if (this.isFileSystemError(error)) {
				category = ErrorCategory.FILE_SYSTEM;
				severity = ErrorSeverity.HIGH;
				retryable = false;
				suggestions = [
					"Check file permissions",
					"Verify file paths exist",
					"Ensure sufficient disk space",
				];
			} else if (this.isDevboxCommandError(error)) {
				category = ErrorCategory.DEVBOX_COMMAND;
				severity = ErrorSeverity.HIGH;
				retryable = false;
				suggestions = [
					"Verify devbox is installed and accessible",
					"Check devbox.json syntax",
					"Ensure all packages are valid",
				];
			} else if (this.isConfigurationError(error)) {
				category = ErrorCategory.CONFIGURATION;
				severity = ErrorSeverity.CRITICAL;
				retryable = false;
				suggestions = [
					"Check action configuration",
					"Verify required environment variables",
					"Review action.yml inputs",
				];
			}

			// Include stack trace if configured
			if (this.config.includeStackTrace && error.stack) {
				errorContext.stack = error.stack;
			}
		} else {
			// Handle non-Error objects
			message = String(error);
			errorContext.rawError = error;
		}

		// Truncate context if it's too large
		errorContext = this.truncateContext(errorContext);

		return {
			category,
			severity,
			message,
			code,
			context: errorContext,
			timestamp,
			retryable,
			suggestions,
		};
	}

	/**
	 * Log error information with appropriate level
	 * @param errorInfo - Structured error information
	 */
	private logError(errorInfo: ErrorInfo): void {
		const logMessage = this.formatErrorMessage(errorInfo);

		switch (errorInfo.severity) {
			case ErrorSeverity.CRITICAL:
				console.error("🚨 CRITICAL ERROR:", logMessage);
				break;
			case ErrorSeverity.HIGH:
				console.error("❌ ERROR:", logMessage);
				break;
			case ErrorSeverity.MEDIUM:
				console.warn("⚠️  WARNING:", logMessage);
				break;
			case ErrorSeverity.LOW:
				if (this.config.logLevel === "debug") {
					console.info("ℹ️  INFO:", logMessage);
				}
				break;
		}

		// Log suggestions if available
		if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
			console.log("💡 Suggestions:");
			errorInfo.suggestions.forEach((suggestion) => {
				console.log(`   • ${suggestion}`);
			});
		}
	}

	/**
	 * Format error message for logging
	 * @param errorInfo - Structured error information
	 * @returns Formatted error message
	 */
	private formatErrorMessage(errorInfo: ErrorInfo): string {
		const parts = [
			`[${errorInfo.category.toUpperCase()}]`,
			`${errorInfo.code}:`,
			errorInfo.message,
		];

		if (errorInfo.context.context) {
			parts.push(`(Context: ${errorInfo.context.context})`);
		}

		if (errorInfo.retryable) {
			parts.push("(Retryable)");
		}

		return parts.join(" ");
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
		];

		return networkPatterns.some((pattern) => pattern.test(error.message));
	}

	/**
	 * Check if an error is a file system error
	 * @param error - The error to check
	 * @returns true if it's a file system error
	 */
	private isFileSystemError(error: Error): boolean {
		const fsPatterns = [
			/ENOENT/,
			/EACCES/,
			/EPERM/,
			/ENOSPC/,
			/no such file/i,
			/permission denied/i,
			/access denied/i,
		];

		return fsPatterns.some((pattern) => pattern.test(error.message));
	}

	/**
	 * Check if an error is a devbox command error
	 * @param error - The error to check
	 * @returns true if it's a devbox command error
	 */
	private isDevboxCommandError(error: Error): boolean {
		const devboxPatterns = [
			/devbox.*not found/i,
			/devbox.*failed/i,
			/command not found.*devbox/i,
			/invalid package/i,
			/package.*not found/i,
		];

		return devboxPatterns.some((pattern) => pattern.test(error.message));
	}

	/**
	 * Check if an error is a configuration error
	 * @param error - The error to check
	 * @returns true if it's a configuration error
	 */
	private isConfigurationError(error: Error): boolean {
		const configPatterns = [
			/missing.*token/i,
			/invalid.*configuration/i,
			/required.*parameter/i,
			/environment.*variable/i,
		];

		return configPatterns.some((pattern) => pattern.test(error.message));
	}

	/**
	 * Check if a GitHub error is retryable
	 * @param error - The GitHub error to check
	 * @returns true if the error should be retried
	 */
	private isGitHubErrorRetryable(error: GitHubError): boolean {
		// Rate limiting and server errors are retryable
		const retryablePatterns = [
			/rate limit/i,
			/server error/i,
			/service unavailable/i,
			/timeout/i,
		];

		return retryablePatterns.some((pattern) => pattern.test(error.message));
	}

	/**
	 * Truncate context object if it exceeds maximum size
	 * @param context - Context object to truncate
	 * @returns Truncated context object
	 */
	private truncateContext(
		context: Record<string, unknown>,
	): Record<string, unknown> {
		const serialized = JSON.stringify(context);

		if (serialized.length <= this.config.maxContextSize) {
			return context;
		}

		// Truncate and add indicator
		return {
			...context,
			_truncated: true,
			_originalSize: serialized.length,
			_truncatedAt: this.config.maxContextSize,
		};
	}

	/**
	 * Create a user-friendly error message for GitHub Action outputs
	 * @param errorInfo - Structured error information
	 * @returns User-friendly error message
	 */
	createUserFriendlyMessage(errorInfo: ErrorInfo): string {
		const parts = [`${errorInfo.message}`];

		if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
			parts.push("\n\nSuggestions:");
			errorInfo.suggestions.forEach((suggestion) => {
				parts.push(`• ${suggestion}`);
			});
		}

		if (errorInfo.retryable) {
			parts.push(
				"\n\nThis error may be temporary and will be retried automatically.",
			);
		}

		return parts.join("\n");
	}

	/**
	 * Check if an error should be retried based on classification
	 * @param error - The error to check
	 * @returns true if the error should be retried
	 */
	shouldRetry(error: unknown): boolean {
		const errorInfo = this.classifyError(error, "");
		return errorInfo.retryable;
	}
}

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();

/**
 * Convenience function to handle errors
 * @param error - The error to handle
 * @param context - Additional context information
 * @returns Structured error information
 */
export function handleError(error: unknown, context: string = ""): ErrorInfo {
	return errorHandler.handleError(error, context);
}

/**
 * Convenience function to check if an error should be retried
 * @param error - The error to check
 * @returns true if the error should be retried
 */
export function shouldRetryError(error: unknown): boolean {
	return errorHandler.shouldRetry(error);
}
