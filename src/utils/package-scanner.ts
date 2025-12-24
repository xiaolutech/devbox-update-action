/**
 * Package scanner component for discovering and scanning Devbox packages
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationError } from '../types';
import type { DevboxConfig, UpdateCandidate, UpdateSummary } from '../types';
import type { ParsedPackage } from './package-parser';
import { parseAllPackages } from './package-parser';
import { validateDevboxConfig } from './validation';
import { FILES } from '../constants';
import type { VersionQueryService } from './version-query';
import { createVersionQueryService } from './version-query';

/**
 * Package scanner class for discovering packages and checking for updates
 */
export class PackageScanner {
  private configPath: string;
  private versionQueryService: VersionQueryService;

  constructor(configPath: string = FILES.DEVBOX_CONFIG) {
    this.configPath = configPath;
    this.versionQueryService = createVersionQueryService();
  }

  /**
   * Load and parse devbox.json configuration
   * @returns Parsed DevboxConfig object
   * @throws ValidationError if file doesn't exist or is invalid
   */
  async loadDevboxConfig(): Promise<DevboxConfig> {
    try {
      // Check if file exists
      await fs.access(this.configPath);
      
      // Read and parse the file
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configContent) as DevboxConfig;
      
      // Validate the configuration
      validateDevboxConfig(config);
      
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ValidationError(
          `Invalid JSON in ${this.configPath}: ${error.message}`,
          { path: this.configPath, error: error.message }
        );
      }
      
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ValidationError(
          `Devbox configuration file not found: ${this.configPath}`,
          { path: this.configPath }
        );
      }
      
      throw new ValidationError(
        `Failed to load devbox configuration: ${error instanceof Error ? error.message : String(error)}`,
        { path: this.configPath, error }
      );
    }
  }

  /**
   * Extract package list from DevboxConfig
   * @param config - DevboxConfig object
   * @returns Array of parsed package information
   */
  extractPackages(config: DevboxConfig): ParsedPackage[] {
    if (!config.packages || !Array.isArray(config.packages)) {
      return [];
    }

    return parseAllPackages(config.packages);
  }

  /**
   * Scan for packages in the devbox.json file
   * @returns Array of parsed package information
   * @throws ValidationError if configuration is invalid
   */
  async scanPackages(): Promise<ParsedPackage[]> {
    const config = await this.loadDevboxConfig();
    return this.extractPackages(config);
  }

  /**
   * Get the absolute path to the devbox.json file
   * @returns Absolute path to the configuration file
   */
  getConfigPath(): string {
    return path.resolve(this.configPath);
  }

  /**
   * Check if devbox.json exists
   * @returns true if the file exists, false otherwise
   */
  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get package count from configuration
   * @returns Number of packages in the configuration
   */
  async getPackageCount(): Promise<number> {
    try {
      const packages = await this.scanPackages();
      return packages.length;
    } catch {
      return 0;
    }
  }

  /**
   * Filter packages by name pattern
   * @param packages - Array of parsed packages
   * @param pattern - Regular expression pattern to match package names
   * @returns Filtered array of packages
   */
  filterPackagesByPattern(packages: ParsedPackage[], pattern: RegExp): ParsedPackage[] {
    return packages.filter(pkg => pattern.test(pkg.name));
  }

  /**
   * Get packages that have explicit versions
   * @param packages - Array of parsed packages
   * @returns Array of packages with versions
   */
  getPackagesWithVersions(packages: ParsedPackage[]): ParsedPackage[] {
    return packages.filter(pkg => pkg.version !== undefined);
  }

  /**
   * Get packages without explicit versions
   * @param packages - Array of parsed packages
   * @returns Array of packages without versions
   */
  getPackagesWithoutVersions(packages: ParsedPackage[]): ParsedPackage[] {
    return packages.filter(pkg => pkg.version === undefined);
  }

  /**
   * Scan packages and check for available updates
   * @returns Array of UpdateCandidate objects
   */
  async scanForUpdates(): Promise<UpdateCandidate[]> {
    const packages = await this.scanPackages();
    return this.versionQueryService.checkMultiplePackagesForUpdates(packages);
  }

  /**
   * Generate an update summary for all packages
   * @returns UpdateSummary object with comprehensive update information
   */
  async generateUpdateSummary(): Promise<UpdateSummary> {
    const updates = await this.scanForUpdates();
    const availableUpdates = updates.filter(update => update.updateAvailable);
    
    const summary = availableUpdates.length > 0
      ? `Found ${availableUpdates.length} package update(s) available:\n` +
        availableUpdates.map(update => 
          `- ${update.packageName}: ${update.currentVersion} → ${update.latestVersion}`
        ).join('\n')
      : 'All packages are up to date.';

    return {
      totalUpdates: availableUpdates.length,
      updates: availableUpdates,
      hasChanges: availableUpdates.length > 0,
      summary
    };
  }

  /**
   * Check if a specific package has updates available
   * @param packageName - Name of the package to check
   * @returns UpdateCandidate object or null if package not found
   */
  async checkPackageForUpdates(packageName: string): Promise<UpdateCandidate | null> {
    const packages = await this.scanPackages();
    const targetPackage = packages.find(pkg => pkg.name === packageName);
    
    if (!targetPackage) {
      return null;
    }
    
    return this.versionQueryService.checkForUpdates(targetPackage);
  }

  /**
   * Get the version query service instance
   * @returns VersionQueryService instance
   */
  getVersionQueryService(): VersionQueryService {
    return this.versionQueryService;
  }
}

/**
 * Create a new PackageScanner instance
 * @param configPath - Optional path to devbox.json (defaults to './devbox.json')
 * @returns New PackageScanner instance
 */
export function createPackageScanner(configPath?: string): PackageScanner {
  return new PackageScanner(configPath);
}

/**
 * Convenience function to scan packages from default devbox.json
 * @returns Array of parsed package information
 */
export async function scanDevboxPackages(): Promise<ParsedPackage[]> {
  const scanner = createPackageScanner();
  return scanner.scanPackages();
}

/**
 * Convenience function to scan for updates from default devbox.json
 * @returns Array of UpdateCandidate objects
 */
export async function scanForDevboxUpdates(): Promise<UpdateCandidate[]> {
  const scanner = createPackageScanner();
  return scanner.scanForUpdates();
}

/**
 * Convenience function to generate update summary from default devbox.json
 * @returns UpdateSummary object
 */
export async function generateDevboxUpdateSummary(): Promise<UpdateSummary> {
  const scanner = createPackageScanner();
  return scanner.generateUpdateSummary();
}