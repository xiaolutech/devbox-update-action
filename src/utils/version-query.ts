/**
 * Version query functionality for Devbox Search API integration
 */

import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import { NetworkError, ValidationError } from '../types';
import type { DevboxResolveResponse, DevboxPackageInfo, UpdateCandidate } from '../types';
import type { ParsedPackage } from './package-parser';
import { buildResolveUrl, buildPackageUrl, getDefaultApiConfig, calculateRetryDelay, isRetryableError } from './api-config';
import { compareVersions } from './version-compare';

/**
 * Version query service for interacting with Devbox Search API
 */
export class VersionQueryService {
  private config = getDefaultApiConfig();

  /**
   * Query the latest version of a package from Devbox Search API
   * @param packageName - Name of the package to query
   * @returns Latest version string
   * @throws NetworkError if API request fails
   * @throws ValidationError if response is invalid
   */
  async getLatestVersion(packageName: string): Promise<string> {
    const url = buildResolveUrl(packageName, 'latest');
    
    try {
      const response = await this.makeApiRequest<DevboxResolveResponse>(url);
      
      if (!response.version) {
        throw new ValidationError(
          `No version information found for package: ${packageName}`,
          { packageName, response }
        );
      }
      
      return response.version;
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new NetworkError(
        `Failed to get latest version for package ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
        { packageName, url, error }
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
        { packageName, url, error }
      );
    }
  }

  /**
   * Check if a package has updates available
   * @param parsedPackage - Parsed package information
   * @returns UpdateCandidate object with update information
   */
  async checkForUpdates(parsedPackage: ParsedPackage): Promise<UpdateCandidate> {
    try {
      const latestVersion = await this.getLatestVersion(parsedPackage.name);
      const currentVersion = parsedPackage.version || 'unknown';
      
      // If no current version is specified, consider it as needing update
      const updateAvailable = !parsedPackage.version || compareVersions(latestVersion, currentVersion) > 0;
      
      return {
        packageName: parsedPackage.name,
        currentVersion,
        latestVersion,
        updateAvailable
      };
    } catch (error) {
      // If we can't get version info, assume no update is available
      return {
        packageName: parsedPackage.name,
        currentVersion: parsedPackage.version || 'unknown',
        latestVersion: 'unknown',
        updateAvailable: false
      };
    }
  }

  /**
   * Check for updates for multiple packages
   * @param packages - Array of parsed packages
   * @returns Array of UpdateCandidate objects
   */
  async checkMultiplePackagesForUpdates(packages: ParsedPackage[]): Promise<UpdateCandidate[]> {
    const updatePromises = packages.map(pkg => this.checkForUpdates(pkg));
    
    // Use Promise.allSettled to handle individual package failures gracefully
    const results = await Promise.allSettled(updatePromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<UpdateCandidate> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Make an API request with retry logic and error handling
   * @param url - URL to request
   * @returns Response data
   * @throws NetworkError if all retries fail
   */
  private async makeApiRequest<T>(url: string): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response: AxiosResponse<T> = await axios.get(url, {
          timeout: this.config.timeout,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'devbox-updater-action/1.0.0'
          }
        });
        
        return response.data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        // Don't retry on the last attempt or if error is not retryable
        if (attempt === this.config.maxRetries || !isRetryableError(err)) {
          break;
        }
        
        // Wait before retrying
        const delay = calculateRetryDelay(attempt, this.config);
        await this.sleep(delay);
      }
    }
    
    // Convert axios errors to our NetworkError type
    if (lastError && this.isAxiosError(lastError)) {
      const axiosError = lastError as AxiosError;
      throw new NetworkError(
        `API request failed after ${this.config.maxRetries + 1} attempts: ${axiosError.message}`,
        {
          url,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          attempts: this.config.maxRetries + 1
        }
      );
    }
    
    throw new NetworkError(
      `API request failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      { url, attempts: this.config.maxRetries + 1, error: lastError }
    );
  }

  /**
   * Sleep for the specified number of milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
  getConfig() {
    return { ...this.config };
  }
}

/**
 * Create a new VersionQueryService instance
 * @returns New VersionQueryService instance
 */
export function createVersionQueryService(): VersionQueryService {
  return new VersionQueryService();
}

/**
 * Convenience function to get the latest version of a package
 * @param packageName - Name of the package
 * @returns Latest version string
 */
export async function getLatestPackageVersion(packageName: string): Promise<string> {
  const service = createVersionQueryService();
  return service.getLatestVersion(packageName);
}

/**
 * Convenience function to check for updates for a single package
 * @param parsedPackage - Parsed package information
 * @returns UpdateCandidate object
 */
export async function checkPackageForUpdates(parsedPackage: ParsedPackage): Promise<UpdateCandidate> {
  const service = createVersionQueryService();
  return service.checkForUpdates(parsedPackage);
}