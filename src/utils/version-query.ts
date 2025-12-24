/**
 * Version query functionality for Devbox Search API integration
 */

import type { AxiosError, AxiosResponse } from "axios";
import axios from "axios";
import type {
	DevboxPackageInfo,
	DevboxResolveResponse,
	UpdateCandidate,
} from "../types";
import { NetworkError, ValidationError } from "../types";
import {
	type ApiRequestConfig,
	buildPackageUrl,
	buildResolveUrl,
	getDefaultApiConfig,
} from "./api-config";
import type { ParsedPackage } from "./package-parser";
import { retryNetworkRequest } from "./retry-mechanism";
import { compareVersions } from "./version-compare";

/**
 * Version query service for interacting with Devbox Search API
 */
export class VersionQueryService {
	private config = getDefaultApiConfig();
	private updateLatest: boolean;

	constructor(updateLatest: boolean = false) {
		this.updateLatest = updateLatest;
	}

	/**
	 * Query the latest version of a package from Devbox Search API
	 * @param packageName - Name of the package to query
	 * @returns Latest version string
	 * @throws NetworkError if API request fails
	 * @throws ValidationError if response is invalid
	 */
	async getLatestVersion(packageName: string): Promise<string> {
		const url = buildResolveUrl(packageName, "latest");

		try {
			const response = await this.makeApiRequest<DevboxResolveResponse>(url);

			if (!response.version) {
				throw new ValidationError(
					`No version information found for package: ${packageName}`,
					{ packageName, response },
				);
			}

			return response.version;
		} catch (error) {
			if (error instanceof NetworkError || error instanceof ValidationError) {
				throw error;
			}

			throw new NetworkError(
				`Failed to get latest version for package ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
				{ packageName, url, error },
			);
		}
	}

	/**
	 * Query detailed package information from Devbox Search API
	 * @param packageName - Name of the package to query
	 * @returns Package information object
	 * @throws NetworkError if API request fails
	 */
	async getPackageInfo(packageName: string): Promise<DevboxPackageInfo> {
		const url = buildPackageUrl(packageName);

		try {
			const response = await this.makeApiRequest<DevboxPackageInfo>(url);
			return response;
		} catch (error) {
			if (error instanceof NetworkError) {
				throw error;
			}

			throw new NetworkError(
				`Failed to get package info for ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
				{ packageName, url, error },
			);
		}
	}

	/**
	 * Check if a package has updates available
	 * @param parsedPackage - Parsed package information
	 * @returns UpdateCandidate object with update information
	 */
	async checkForUpdates(
		parsedPackage: ParsedPackage,
	): Promise<UpdateCandidate> {
		try {
			const latestVersion = await this.getLatestVersion(parsedPackage.name);
			const currentVersion = parsedPackage.version || "unknown";

			// Special handling for 'latest' version
			if (parsedPackage.version === "latest") {
				// For 'latest' packages, we only consider them as needing update if updateLatest is enabled
				return {
					packageName: parsedPackage.name,
					currentVersion: "latest",
					latestVersion,
					updateAvailable: this.updateLatest, // Controlled by configuration
				};
			}

			// If no current version is specified, consider it as needing update
			const updateAvailable =
				!parsedPackage.version ||
				compareVersions(latestVersion, currentVersion) > 0;

			return {
				packageName: parsedPackage.name,
				currentVersion,
				latestVersion,
				updateAvailable,
			};
		} catch (error) {
			// Requirement 5.1: Skip missing packages and continue processing others
			console.warn(
				`⚠️  Package lookup failed for '${parsedPackage.name}': ${error instanceof Error ? error.message : String(error)}`,
			);
			console.info(
				`🔄 Skipping package '${parsedPackage.name}' and continuing with other packages`,
			);

			// Return a candidate indicating the package couldn't be checked
			return {
				packageName: parsedPackage.name,
				currentVersion: parsedPackage.version || "unknown",
				latestVersion: "lookup-failed",
				updateAvailable: false, // Don't attempt to update packages we can't query
			};
		}
	}

	/**
	 * Check for updates for multiple packages
	 * @param packages - Array of parsed packages
	 * @returns Array of UpdateCandidate objects
	 */
	async checkMultiplePackagesForUpdates(
		packages: ParsedPackage[],
	): Promise<UpdateCandidate[]> {
		console.info(`🔍 Checking ${packages.length} packages for updates...`);

		const updatePromises = packages.map(async (pkg, index) => {
			console.debug(
				`Checking package ${index + 1}/${packages.length}: ${pkg.name}`,
			);
			return this.checkForUpdates(pkg);
		});

		// Use Promise.allSettled to handle individual package failures gracefully
		const results = await Promise.allSettled(updatePromises);

		const successfulResults = results
			.filter(
				(result): result is PromiseFulfilledResult<UpdateCandidate> =>
					result.status === "fulfilled",
			)
			.map((result) => result.value);

		const failedResults = results.filter(
			(result) => result.status === "rejected",
		);

		// Log statistics about package lookup results
		const lookupFailures = successfulResults.filter(
			(result) => result.latestVersion === "lookup-failed",
		);

		if (failedResults.length > 0) {
			console.warn(
				`⚠️  ${failedResults.length} packages failed completely during lookup`,
			);
		}

		if (lookupFailures.length > 0) {
			console.warn(
				`⚠️  ${lookupFailures.length} packages could not be found in registry:`,
			);
			lookupFailures.forEach((pkg) => {
				console.warn(`   - ${pkg.packageName} (skipped)`);
			});
		}

		const successfulLookups = successfulResults.filter(
			(result) => result.latestVersion !== "lookup-failed",
		);
		console.info(
			`✅ Successfully checked ${successfulLookups.length}/${packages.length} packages`,
		);

		return successfulResults;
	}

	/**
	 * Make an API request with retry logic and error handling
	 * @param url - URL to request
	 * @returns Response data
	 * @throws NetworkError if all retries fail
	 */
	private async makeApiRequest<T>(url: string): Promise<T> {
		return retryNetworkRequest(async () => {
			try {
				const response: AxiosResponse<T> = await axios.get(url, {
					timeout: this.config.timeout,
					headers: {
						Accept: "application/json",
						"User-Agent": "devbox-updater-action/1.0.0",
					},
				});

				return response.data;
			} catch (err) {
				// Convert axios errors to our NetworkError type for proper classification
				if (this.isAxiosError(err)) {
					const axiosError = err as AxiosError;
					throw new NetworkError(`API request failed: ${axiosError.message}`, {
						url,
						status: axiosError.response?.status,
						statusText: axiosError.response?.statusText,
					});
				}

				// Re-throw other errors as-is for proper classification
				throw err;
			}
		}, `API request to ${url}`);
	}

	/**
	 * Check if an error is an Axios error
	 * @param error - Error to check
	 * @returns true if it's an Axios error
	 */
	private isAxiosError(error: unknown): error is AxiosError {
		return axios.isAxiosError(error);
	}

	/**
	 * Set custom configuration for API requests
	 * @param config - Partial configuration to override defaults
	 */
	setConfig(config: Partial<typeof this.config>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 * @returns Current API configuration
	 */
	getConfig(): ApiRequestConfig {
		return { ...this.config };
	}
}

/**
 * Create a new VersionQueryService instance
 * @param updateLatest - Whether to update latest packages
 * @returns New VersionQueryService instance
 */
export function createVersionQueryService(
	updateLatest: boolean = false,
): VersionQueryService {
	return new VersionQueryService(updateLatest);
}

/**
 * Convenience function to get the latest version of a package
 * @param packageName - Name of the package
 * @param updateLatest - Whether to update latest packages
 * @returns Latest version string
 */
export async function getLatestPackageVersion(
	packageName: string,
	updateLatest: boolean = false,
): Promise<string> {
	const service = createVersionQueryService(updateLatest);
	return service.getLatestVersion(packageName);
}

/**
 * Convenience function to check for updates for a single package
 * @param parsedPackage - Parsed package information
 * @param updateLatest - Whether to update latest packages
 * @returns UpdateCandidate object
 */
export async function checkPackageForUpdates(
	parsedPackage: ParsedPackage,
	updateLatest: boolean = false,
): Promise<UpdateCandidate> {
	const service = createVersionQueryService(updateLatest);
	return service.checkForUpdates(parsedPackage);
}
