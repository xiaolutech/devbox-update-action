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
export function parsePackageSpec(packageSpec: string): ParsedPackage {
  const atIndex = packageSpec.lastIndexOf('@');
  
  if (atIndex === -1 || atIndex === 0) {
    // No version specified or @ at the beginning (scoped package without version)
    return {
      name: packageSpec,
      version: undefined,
      fullSpec: packageSpec
    };
  }
  
  // Check if this might be a scoped package like @types/node@1.0.0
  const beforeAt = packageSpec.substring(0, atIndex);
  const afterAt = packageSpec.substring(atIndex + 1);
  
  // If the part before @ contains a slash, it's likely a scoped package
  if (beforeAt.includes('/')) {
    return {
      name: beforeAt,
      version: afterAt,
      fullSpec: packageSpec
    };
  }
  
  // Regular package with version
  return {
    name: beforeAt,
    version: afterAt,
    fullSpec: packageSpec
  };
}

/**
 * Create a package specification string from name and version
 * @param name - Package name
 * @param version - Package version (optional)
 * @returns Package specification string
 */
export function createPackageSpec(name: string, version?: string): string {
  if (!version) {
    return name;
  }
  return `${name}@${version}`;
}

/**
 * Extract all package names from a DevboxConfig
 * @param packages - Array of package specifications
 * @returns Array of parsed package information
 */
export function parseAllPackages(packages: string[]): ParsedPackage[] {
  return packages.map(parsePackageSpec);
}