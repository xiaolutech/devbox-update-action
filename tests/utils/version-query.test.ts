/**
 * Tests for version query functionality
 */

import axios from "axios";
import { NetworkError, ValidationError } from "../../src/types";
import type { ParsedPackage } from "../../src/utils/package-parser";
import {
	createVersionQueryService,
	VersionQueryService,
} from "../../src/utils/version-query";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("VersionQueryService", () => {
	let service: VersionQueryService;

	beforeEach(() => {
		service = new VersionQueryService();
		jest.clearAllMocks();
	});

	describe("getLatestVersion", () => {
		it("should return latest version for valid package", async () => {
			const mockResponse = {
				data: {
					name: "nodejs",
					version: "20.10.0",
					summary: "Node.js JavaScript runtime",
				},
			};

			mockedAxios.get.mockResolvedValueOnce(mockResponse);

			const version = await service.getLatestVersion("nodejs");

			expect(version).toBe("20.10.0");
			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.stringContaining("resolve?name=nodejs&version=latest"),
				expect.objectContaining({
					timeout: expect.any(Number),
					headers: expect.objectContaining({
						Accept: "application/json",
						"User-Agent": "devbox-updater-action/1.0.0",
					}),
				}),
			);
		});

		it("should throw ValidationError for response without version", async () => {
			const mockResponse = {
				data: {
					name: "nodejs",
					summary: "Node.js JavaScript runtime",
					// Missing version field
				},
			};

			mockedAxios.get.mockResolvedValueOnce(mockResponse);

			await expect(service.getLatestVersion("nodejs")).rejects.toThrow(
				ValidationError,
			);
		});

		it("should throw NetworkError for API failure", async () => {
			mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

			await expect(service.getLatestVersion("nodejs")).rejects.toThrow(
				NetworkError,
			);
		});
	});

	describe("getPackageInfo", () => {
		it("should return package info for valid package", async () => {
			const mockResponse = {
				data: {
					name: "nodejs",
					summary: "Node.js JavaScript runtime",
					homepage_url: "https://nodejs.org",
					license: "MIT",
					releases: [],
				},
			};

			mockedAxios.get.mockResolvedValueOnce(mockResponse);

			const info = await service.getPackageInfo("nodejs");

			expect(info).toEqual(mockResponse.data);
			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.stringContaining("pkg?name=nodejs"),
				expect.any(Object),
			);
		});

		it("should throw NetworkError for API failure", async () => {
			mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

			await expect(service.getPackageInfo("nodejs")).rejects.toThrow(
				NetworkError,
			);
		});
	});

	describe("checkForUpdates", () => {
		it("should detect update available", async () => {
			const mockResponse = {
				data: {
					name: "nodejs",
					version: "20.10.0",
					summary: "Node.js JavaScript runtime",
				},
			};

			mockedAxios.get.mockResolvedValueOnce(mockResponse);

			const parsedPackage: ParsedPackage = {
				name: "nodejs",
				version: "18.0.0",
				fullSpec: "nodejs@18.0.0",
			};

			const result = await service.checkForUpdates(parsedPackage);

			expect(result).toEqual({
				packageName: "nodejs",
				currentVersion: "18.0.0",
				latestVersion: "20.10.0",
				updateAvailable: true,
			});
		});

		it("should handle package without version", async () => {
			const mockResponse = {
				data: {
					name: "nodejs",
					version: "20.10.0",
					summary: "Node.js JavaScript runtime",
				},
			};

			mockedAxios.get.mockResolvedValueOnce(mockResponse);

			const parsedPackage: ParsedPackage = {
				name: "nodejs",
				version: undefined,
				fullSpec: "nodejs",
			};

			const result = await service.checkForUpdates(parsedPackage);

			expect(result).toEqual({
				packageName: "nodejs",
				currentVersion: "unknown",
				latestVersion: "20.10.0",
				updateAvailable: true,
			});
		});

		it("should handle API errors gracefully", async () => {
			mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

			const parsedPackage: ParsedPackage = {
				name: "nodejs",
				version: "18.0.0",
				fullSpec: "nodejs@18.0.0",
			};

			const result = await service.checkForUpdates(parsedPackage);

			expect(result).toEqual({
				packageName: "nodejs",
				currentVersion: "18.0.0",
				latestVersion: "unknown",
				updateAvailable: false,
			});
		});
	});

	describe("checkMultiplePackagesForUpdates", () => {
		it("should check multiple packages", async () => {
			const mockResponses = [
				{
					data: {
						name: "nodejs",
						version: "20.10.0",
						summary: "Node.js JavaScript runtime",
					},
				},
				{
					data: {
						name: "python",
						version: "3.12.0",
						summary: "Python programming language",
					},
				},
			];

			mockedAxios.get
				.mockResolvedValueOnce(mockResponses[0])
				.mockResolvedValueOnce(mockResponses[1]);

			const packages: ParsedPackage[] = [
				{ name: "nodejs", version: "18.0.0", fullSpec: "nodejs@18.0.0" },
				{ name: "python", version: "3.11.0", fullSpec: "python@3.11.0" },
			];

			const results = await service.checkMultiplePackagesForUpdates(packages);

			expect(results).toHaveLength(2);
			expect(results[0].packageName).toBe("nodejs");
			expect(results[1].packageName).toBe("python");
		});

		it("should handle partial failures", async () => {
			mockedAxios.get
				.mockResolvedValueOnce({
					data: {
						name: "nodejs",
						version: "20.10.0",
						summary: "Node.js JavaScript runtime",
					},
				})
				.mockRejectedValueOnce(new Error("Network error"));

			const packages: ParsedPackage[] = [
				{ name: "nodejs", version: "18.0.0", fullSpec: "nodejs@18.0.0" },
				{ name: "python", version: "3.11.0", fullSpec: "python@3.11.0" },
			];

			const results = await service.checkMultiplePackagesForUpdates(packages);

			expect(results).toHaveLength(2);
			expect(results[0].updateAvailable).toBe(true);
			expect(results[1].updateAvailable).toBe(false);
		});
	});

	describe("configuration", () => {
		it("should allow setting custom configuration", () => {
			const customConfig = { timeout: 5000, maxRetries: 5 };
			service.setConfig(customConfig);

			const config = service.getConfig();
			expect(config.timeout).toBe(5000);
			expect(config.maxRetries).toBe(5);
		});
	});

	describe("createVersionQueryService", () => {
		it("should create new service instance", () => {
			const service = createVersionQueryService();
			expect(service).toBeInstanceOf(VersionQueryService);
		});
	});
});
