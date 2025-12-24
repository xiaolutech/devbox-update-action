/**
 * Utility functions for parsing Devbox package specifications
 */
export interface ParsedPackage {
    name: string;
    version?: string;
    fullSpec: string;
}
/**
 * Parse a package specification like "oxipng@9.1.5" or "nodejs"
 * @param packageSpec - The package specification string
 * @returns Parsed package information
 */
export declare function parsePackageSpec(packageSpec: string): ParsedPackage;
/**
 * Create a package specification string from name and version
 * @param name - Package name
 * @param version - Package version (optional)
 * @returns Package specification string
 */
export declare function createPackageSpec(name: string, version?: string): string;
/**
 * Extract all package names from a DevboxConfig
 * @param packages - Array of package specifications
 * @returns Array of parsed package information
 */
export declare function parseAllPackages(packages: string[]): ParsedPackage[];
