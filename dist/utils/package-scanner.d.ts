/**
 * Package scanner component for discovering and scanning Devbox packages
 */
import type { DevboxConfig, UpdateCandidate, UpdateSummary } from '../types';
import type { ParsedPackage } from './package-parser';
import type { VersionQueryService } from './version-query';
/**
 * Package scanner class for discovering packages and checking for updates
 */
export declare class PackageScanner {
    private configPath;
    private versionQueryService;
    constructor(configPath?: string);
    /**
     * Load and parse devbox.json configuration
     * @returns Parsed DevboxConfig object
     * @throws ValidationError if file doesn't exist or is invalid
     */
    loadDevboxConfig(): Promise<DevboxConfig>;
    /**
     * Extract package list from DevboxConfig
     * @param config - DevboxConfig object
     * @returns Array of parsed package information
     */
    extractPackages(config: DevboxConfig): ParsedPackage[];
    /**
     * Scan for packages in the devbox.json file
     * @returns Array of parsed package information
     * @throws ValidationError if configuration is invalid
     */
    scanPackages(): Promise<ParsedPackage[]>;
    /**
     * Get the absolute path to the devbox.json file
     * @returns Absolute path to the configuration file
     */
    getConfigPath(): string;
    /**
     * Check if devbox.json exists
     * @returns true if the file exists, false otherwise
     */
    configExists(): Promise<boolean>;
    /**
     * Get package count from configuration
     * @returns Number of packages in the configuration
     */
    getPackageCount(): Promise<number>;
    /**
     * Filter packages by name pattern
     * @param packages - Array of parsed packages
     * @param pattern - Regular expression pattern to match package names
     * @returns Filtered array of packages
     */
    filterPackagesByPattern(packages: ParsedPackage[], pattern: RegExp): ParsedPackage[];
    /**
     * Get packages that have explicit versions
     * @param packages - Array of parsed packages
     * @returns Array of packages with versions
     */
    getPackagesWithVersions(packages: ParsedPackage[]): ParsedPackage[];
    /**
     * Get packages without explicit versions
     * @param packages - Array of parsed packages
     * @returns Array of packages without versions
     */
    getPackagesWithoutVersions(packages: ParsedPackage[]): ParsedPackage[];
    /**
     * Scan packages and check for available updates
     * @returns Array of UpdateCandidate objects
     */
    scanForUpdates(): Promise<UpdateCandidate[]>;
    /**
     * Generate an update summary for all packages
     * @returns UpdateSummary object with comprehensive update information
     */
    generateUpdateSummary(): Promise<UpdateSummary>;
    /**
     * Check if a specific package has updates available
     * @param packageName - Name of the package to check
     * @returns UpdateCandidate object or null if package not found
     */
    checkPackageForUpdates(packageName: string): Promise<UpdateCandidate | null>;
    /**
     * Get the version query service instance
     * @returns VersionQueryService instance
     */
    getVersionQueryService(): VersionQueryService;
}
/**
 * Create a new PackageScanner instance
 * @param configPath - Optional path to devbox.json (defaults to './devbox.json')
 * @returns New PackageScanner instance
 */
export declare function createPackageScanner(configPath?: string): PackageScanner;
/**
 * Convenience function to scan packages from default devbox.json
 * @returns Array of parsed package information
 */
export declare function scanDevboxPackages(): Promise<ParsedPackage[]>;
/**
 * Convenience function to scan for updates from default devbox.json
 * @returns Array of UpdateCandidate objects
 */
export declare function scanForDevboxUpdates(): Promise<UpdateCandidate[]>;
/**
 * Convenience function to generate update summary from default devbox.json
 * @returns UpdateSummary object
 */
export declare function generateDevboxUpdateSummary(): Promise<UpdateSummary>;
