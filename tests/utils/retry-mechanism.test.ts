/**
 * Tests for retry mechanism component
 */

import { NetworkError } from "../../src/types";
import {
	RetryMechanism,
	retryFetch,
	retryNetworkRequest,
	retryWithBackoff,
} from "../../src/utils/retry-mechanism";

// Mock the error handler to avoid console output in tests
jest.mock("../../src/utils/error-handler", () => ({
	handleError: jest.fn().mockReturnValue({
		category: "network",
		severity: "medium",
		message: "Mocked error",
		code: "NETWORK_ERROR",
		context: {},
		timestamp: new Date().toISOString(),
		retryable: true,
	}),
	shouldRetryError: jest.fn().mockImplementation((error) => {
		return (
			error instanceof NetworkError ||
			(error instanceof Error && error.message.includes("ECONNRESET"))
		);
	}),
}));

describe("RetryMechanism", () => {
	let retryMechanism: RetryMechanism;

	beforeEach(() => {
		retryMechanism = new RetryMechanism({
			maxRetries: 2,
			baseDelay: 10, // Short delays for tests
			maxDelay: 100,
			multiplier: 2,
			jitter: false, // Disable jitter for predictable tests
		});

		// Mock console methods to avoid noise in tests
		jest.spyOn(console, "log").mockImplementation();
		jest.spyOn(console, "error").mockImplementation();
		jest.spyOn(console, "warn").mockImplementation();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("executeWithRetry", () => {
		it("should succeed on first attempt", async () => {
			const operation = jest.fn().mockResolvedValue("success");

			const result = await retryMechanism.executeWithRetry(
				operation,
				"test operation",
			);

			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should retry on retryable errors and eventually succeed", async () => {
			const operation = jest
				.fn()
				.mockRejectedValueOnce(new NetworkError("Connection failed"))
				.mockResolvedValue("success");

			const result = await retryMechanism.executeWithRetry(
				operation,
				"test operation",
			);

			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(2);
		});

		it("should fail after max retries with retryable error", async () => {
			const error = new NetworkError("Persistent connection error");
			const operation = jest.fn().mockRejectedValue(error);

			await expect(
				retryMechanism.executeWithRetry(operation, "test operation"),
			).rejects.toThrow("Persistent connection error");

			expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});

		it("should not retry non-retryable errors", async () => {
			const error = new Error("Non-retryable error");
			const operation = jest.fn().mockRejectedValue(error);

			await expect(
				retryMechanism.executeWithRetry(operation, "test operation"),
			).rejects.toThrow("Non-retryable error");

			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should use custom retry configuration", async () => {
			const error = new NetworkError("Connection failed");
			const operation = jest.fn().mockRejectedValue(error);

			await expect(
				retryMechanism.executeWithRetry(operation, "test operation", {
					maxRetries: 1,
				}),
			).rejects.toThrow("Connection failed");

			expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
		});
	});

	describe("retryNetworkRequest", () => {
		it("should use API configuration for network requests", async () => {
			const operation = jest.fn().mockResolvedValue("network success");

			const result = await retryMechanism.retryNetworkRequest(
				operation,
				"API call",
			);

			expect(result).toBe("network success");
			expect(operation).toHaveBeenCalledTimes(1);
		});
	});

	describe("retryFetch", () => {
		it("should be defined and callable", () => {
			expect(typeof retryMechanism.retryFetch).toBe("function");
		});
	});

	describe("configuration", () => {
		it("should update configuration", () => {
			const newConfig = { maxRetries: 5, baseDelay: 2000 };
			retryMechanism.updateConfig(newConfig);

			const config = retryMechanism.getConfig();
			expect(config.maxRetries).toBe(5);
			expect(config.baseDelay).toBe(2000);
		});

		it("should get current configuration", () => {
			const config = retryMechanism.getConfig();
			expect(config).toHaveProperty("maxRetries");
			expect(config).toHaveProperty("baseDelay");
			expect(config).toHaveProperty("maxDelay");
			expect(config).toHaveProperty("multiplier");
			expect(config).toHaveProperty("jitter");
		});
	});
});

describe("Convenience functions", () => {
	beforeEach(() => {
		jest.spyOn(console, "log").mockImplementation();
		jest.spyOn(console, "error").mockImplementation();
		jest.spyOn(console, "warn").mockImplementation();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("retryWithBackoff", () => {
		it("should retry operation with backoff", async () => {
			const operation = jest.fn().mockResolvedValue("success");

			const result = await retryWithBackoff(operation, "test operation");

			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(1);
		});
	});

	describe("retryNetworkRequest", () => {
		it("should retry network request", async () => {
			const operation = jest.fn().mockResolvedValue("network result");

			const result = await retryNetworkRequest(operation, "API call");

			expect(result).toBe("network result");
			expect(operation).toHaveBeenCalledTimes(1);
		});
	});

	describe("retryFetch", () => {
		const mockFetch = jest.fn();
		global.fetch = mockFetch;

		beforeEach(() => {
			mockFetch.mockClear();
		});

		it("should be defined and callable", () => {
			expect(typeof retryFetch).toBe("function");
		});
	});
});
