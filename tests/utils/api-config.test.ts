/**
 * Tests for API configuration utilities
 */

import {
	buildPackageUrl,
	buildResolveUrl,
	calculateRetryDelay,
	getDefaultApiConfig,
	isRetryableError,
	validateApiConfig,
} from "../../src/utils/api-config";

describe("getDefaultApiConfig", () => {
	test("returns valid default configuration", () => {
		const config = getDefaultApiConfig();

		expect(config.timeout).toBeGreaterThan(0);
		expect(config.maxRetries).toBeGreaterThanOrEqual(0);
		expect(config.retryDelay).toBeGreaterThan(0);
		expect(config.retryMultiplier).toBeGreaterThan(1);
		expect(config.maxRetryDelay).toBeGreaterThan(config.retryDelay);
	});
});

describe("buildResolveUrl", () => {
	test("builds URL with package name and default version", () => {
		const url = buildResolveUrl("nodejs");

		expect(url).toContain("https://search.devbox.sh/v2/resolve");
		expect(url).toContain("name=nodejs");
		expect(url).toContain("version=latest");
	});

	test("builds URL with specific version", () => {
		const url = buildResolveUrl("nodejs", "18.0.0");

		expect(url).toContain("name=nodejs");
		expect(url).toContain("version=18.0.0");
	});
});

describe("buildPackageUrl", () => {
	test("builds package info URL", () => {
		const url = buildPackageUrl("nodejs");

		expect(url).toContain("https://search.devbox.sh/v2/pkg");
		expect(url).toContain("name=nodejs");
	});
});

describe("calculateRetryDelay", () => {
	test("calculates exponential backoff delay", () => {
		const config = getDefaultApiConfig();

		const delay0 = calculateRetryDelay(0, config);
		const delay1 = calculateRetryDelay(1, config);
		const delay2 = calculateRetryDelay(2, config);

		expect(delay1).toBeGreaterThan(delay0);
		expect(delay2).toBeGreaterThan(delay1);
		expect(delay2).toBeLessThanOrEqual(config.maxRetryDelay);
	});

	test("respects maximum retry delay", () => {
		const config = getDefaultApiConfig();
		const largeAttempt = calculateRetryDelay(10, config);

		expect(largeAttempt).toBeLessThanOrEqual(config.maxRetryDelay);
	});
});

describe("isRetryableError", () => {
	test("identifies retryable network errors", () => {
		const networkError = new Error("ECONNRESET");
		networkError.name = "NetworkError";

		expect(isRetryableError(networkError)).toBe(true);
	});

	test("identifies retryable HTTP status codes", () => {
		const serverError = { status: 500 };
		const rateLimitError = { status: 429 };

		expect(isRetryableError(serverError)).toBe(true);
		expect(isRetryableError(rateLimitError)).toBe(true);
	});

	test("identifies non-retryable errors", () => {
		const clientError = { status: 404 };
		const authError = { status: 401 };

		expect(isRetryableError(clientError)).toBe(false);
		expect(isRetryableError(authError)).toBe(false);
	});
});

describe("validateApiConfig", () => {
	test("validates without throwing for valid configuration", () => {
		expect(() => validateApiConfig()).not.toThrow();
	});
});
