/**
 * Tests for error handler component
 */

import { GitHubError, NetworkError, ValidationError } from "../../src/types";
import {
	ErrorCategory,
	ErrorHandler,
	ErrorSeverity,
	handleError,
	shouldRetryError,
} from "../../src/utils/error-handler";

describe("ErrorHandler", () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		errorHandler = new ErrorHandler();
		// Mock console methods to avoid noise in tests
		jest.spyOn(console, "error").mockImplementation();
		jest.spyOn(console, "warn").mockImplementation();
		jest.spyOn(console, "info").mockImplementation();
		jest.spyOn(console, "log").mockImplementation();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("handleError", () => {
		it("should classify NetworkError correctly", () => {
			const error = new NetworkError("Connection failed", {
				url: "https://example.com",
			});
			const result = errorHandler.handleError(error, "test context");

			expect(result.category).toBe(ErrorCategory.NETWORK);
			expect(result.severity).toBe(ErrorSeverity.MEDIUM);
			expect(result.retryable).toBe(true);
			expect(result.code).toBe("NETWORK_ERROR");
			expect(result.message).toBe("Connection failed");
			expect(result.suggestions).toContain("Check your internet connection");
		});

		it("should classify ValidationError correctly", () => {
			const error = new ValidationError("Invalid JSON syntax");
			const result = errorHandler.handleError(error, "validation context");

			expect(result.category).toBe(ErrorCategory.VALIDATION);
			expect(result.severity).toBe(ErrorSeverity.HIGH);
			expect(result.retryable).toBe(false);
			expect(result.code).toBe("VALIDATION_ERROR");
			expect(result.suggestions).toContain("Check the devbox.json file syntax");
		});

		it("should classify GitHubError correctly", () => {
			const error = new GitHubError("API rate limit exceeded");
			const result = errorHandler.handleError(error, "github context");

			expect(result.category).toBe(ErrorCategory.GITHUB_API);
			expect(result.severity).toBe(ErrorSeverity.HIGH);
			expect(result.code).toBe("GITHUB_ERROR");
			expect(result.suggestions).toContain("Check GitHub token permissions");
		});

		it("should classify network errors from Error messages", () => {
			const error = new Error("ECONNRESET: Connection reset by peer");
			const result = errorHandler.handleError(error);

			expect(result.category).toBe(ErrorCategory.NETWORK);
			expect(result.retryable).toBe(true);
		});

		it("should classify file system errors from Error messages", () => {
			const error = new Error("ENOENT: no such file or directory");
			const result = errorHandler.handleError(error);

			expect(result.category).toBe(ErrorCategory.FILE_SYSTEM);
			expect(result.retryable).toBe(false);
		});

		it("should classify devbox command errors from Error messages", () => {
			const error = new Error("devbox: command not found");
			const result = errorHandler.handleError(error);

			expect(result.category).toBe(ErrorCategory.DEVBOX_COMMAND);
			expect(result.retryable).toBe(false);
		});

		it("should classify configuration errors from Error messages", () => {
			const error = new Error("Missing required token");
			const result = errorHandler.handleError(error);

			expect(result.category).toBe(ErrorCategory.CONFIGURATION);
			expect(result.severity).toBe(ErrorSeverity.CRITICAL);
			expect(result.retryable).toBe(false);
		});

		it("should handle unknown errors", () => {
			const error = new Error("Some unknown error");
			const result = errorHandler.handleError(error);

			expect(result.category).toBe(ErrorCategory.UNKNOWN);
			expect(result.severity).toBe(ErrorSeverity.MEDIUM);
		});

		it("should handle non-Error objects", () => {
			const error = "String error";
			const result = errorHandler.handleError(error);

			expect(result.message).toBe("String error");
			expect(result.category).toBe(ErrorCategory.UNKNOWN);
		});

		it("should truncate large context objects", () => {
			const error = new Error("Test error");
			// Create a large context by adding it to the error
			const largeData = "x".repeat(2000);

			const handler = new ErrorHandler({ maxContextSize: 100 });
			const result = handler.handleError(error, largeData);

			expect(result.context._truncated).toBe(true);
			expect(result.context._originalSize).toBeGreaterThan(100);
		});
	});

	describe("createUserFriendlyMessage", () => {
		it("should create user-friendly message with suggestions", () => {
			const errorInfo = {
				category: ErrorCategory.NETWORK,
				severity: ErrorSeverity.MEDIUM,
				message: "Connection failed",
				code: "NETWORK_ERROR",
				context: {},
				timestamp: new Date().toISOString(),
				retryable: true,
				suggestions: ["Check internet connection", "Verify API endpoint"],
			};

			const message = errorHandler.createUserFriendlyMessage(errorInfo);

			expect(message).toContain("Connection failed");
			expect(message).toContain("Suggestions:");
			expect(message).toContain("• Check internet connection");
			expect(message).toContain("• Verify API endpoint");
			expect(message).toContain(
				"This error may be temporary and will be retried automatically",
			);
		});

		it("should create message without suggestions for non-retryable errors", () => {
			const errorInfo = {
				category: ErrorCategory.VALIDATION,
				severity: ErrorSeverity.HIGH,
				message: "Invalid syntax",
				code: "VALIDATION_ERROR",
				context: {},
				timestamp: new Date().toISOString(),
				retryable: false,
			};

			const message = errorHandler.createUserFriendlyMessage(errorInfo);

			expect(message).toBe("Invalid syntax");
			expect(message).not.toContain("retried automatically");
		});
	});

	describe("shouldRetry", () => {
		it("should return true for retryable errors", () => {
			const networkError = new NetworkError("Connection failed");
			expect(errorHandler.shouldRetry(networkError)).toBe(true);

			const timeoutError = new Error("ETIMEDOUT");
			expect(errorHandler.shouldRetry(timeoutError)).toBe(true);
		});

		it("should return false for non-retryable errors", () => {
			const validationError = new ValidationError("Invalid JSON");
			expect(errorHandler.shouldRetry(validationError)).toBe(false);

			const configError = new Error("Missing required token");
			expect(errorHandler.shouldRetry(configError)).toBe(false);
		});
	});
});

describe("Convenience functions", () => {
	beforeEach(() => {
		jest.spyOn(console, "error").mockImplementation();
		jest.spyOn(console, "warn").mockImplementation();
		jest.spyOn(console, "log").mockImplementation();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("handleError", () => {
		it("should handle errors using global handler", () => {
			const error = new NetworkError("Test error");
			const result = handleError(error, "test context");

			expect(result.category).toBe(ErrorCategory.NETWORK);
			expect(result.context.context).toBe("test context");
		});
	});

	describe("shouldRetryError", () => {
		it("should check retry status using global handler", () => {
			const networkError = new NetworkError("Connection failed");
			expect(shouldRetryError(networkError)).toBe(true);

			const validationError = new ValidationError("Invalid data");
			expect(shouldRetryError(validationError)).toBe(false);
		});
	});
});
