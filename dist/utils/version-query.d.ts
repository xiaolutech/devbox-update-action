/**
 * Version query functionality for Devbox Search API integration
 */
import type { DevboxPackageInfo, UpdateCandidate } from "../types";
import { type ApiRequestConfig } from "./api-config";
import type { ParsedPackage } from "./package-parser";
/**
 * Version query service for interacting with Devbox Search API
 */
export declare class VersionQueryService {
    private config;
    private updateLatest;
    constructor(updateLatest?: boolean);
    /**
     * Query the latest version of a package from Devbox Search API
     * @param packageName - Name of the package to query
     * @returns Latest version string
     * @throws NetworkError if API request fails
     * @throws ValidationError if response is invalid
     */
    getLatestVersion(packageName: string): Promise<string>;
    /**
     * Query detailed package information from Devbox Search API
     * @param packageName - Name of the package to query
     * @returns Package information object
     * @throws NetworkError if API request fails
     */
    getPackageInfo(packageName: string): Promise<DevboxPackageInfo>;
    /**
     * Check if a package has updates available
     * @param parsedPackage - Parsed package information
     * @returns UpdateCandidate object with update information
     */
    checkForUpdates(parsedPackage: ParsedPackage): Promise<UpdateCandidate>;
    /**
     * Check for updates for multiple packages
     * @param packages - Array of parsed packages
     * @returns Array of UpdateCandidate objects
     */
    checkMultiplePackagesForUpdates(packages: ParsedPackage[]): Promise<UpdateCandidate[]>;
    /**
     * Make an API request with retry logic and error handling
     * @param url - URL to request
     * @returns Response data
     * @throws NetworkError if all retries fail
     */
    private makeApiRequest;
    /**
     * Check if an error is an Axios error
     * @param error - Error to check
     * @returns true if it's an Axios error
     */
    private isAxiosError;
    /**
     * Set custom configuration for API requests
     * @param config - Partial configuration to override defaults
     */
    setConfig(config: Partial<typeof this.config>): void;
    /**
     * Get current configuration
     * @returns Current API configuration
     */
    getConfig(): ApiRequestConfig;
}
/**
 * Create a new VersionQueryService instance
 * @param updateLatest - Whether to update latest packages
 * @returns New VersionQueryService instance
 */
export declare function createVersionQueryService(updateLatest?: boolean): VersionQueryService;
/**
 * Convenience function to get the latest version of a package
 * @param packageName - Name of the package
 * @param updateLatest - Whether to update latest packages
 * @returns Latest version string
 */
export declare function getLatestPackageVersion(packageName: string, updateLatest?: boolean): Promise<string>;
/**
 * Convenience function to check for updates for a single package
 * @param parsedPackage - Parsed package information
 * @param updateLatest - Whether to update latest packages
 * @returns UpdateCandidate object
 */
export declare function checkPackageForUpdates(parsedPackage: ParsedPackage, updateLatest?: boolean): Promise<UpdateCandidate>;
