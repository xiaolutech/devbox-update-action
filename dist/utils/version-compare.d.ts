/**
 * Version comparison utilities for Devbox packages
 */
/**
 * Represents a parsed semantic version
 */
interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
    original: string;
}
/**
 * Parse a version string into components
 * Handles semantic versioning (1.2.3) and other common formats
 * @param version - The version string to parse
 * @returns Parsed version components
 */
export declare function parseVersion(version: string): ParsedVersion;
/**
 * Compare two version strings
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export declare function compareVersions(version1: string, version2: string): number;
/**
 * Check if version1 is greater than version2
 * @param version1 - First version
 * @param version2 - Second version
 * @returns true if version1 > version2
 */
export declare function isVersionGreater(version1: string, version2: string): boolean;
/**
 * Check if version1 is less than version2
 * @param version1 - First version
 * @param version2 - Second version
 * @returns true if version1 < version2
 */
export declare function isVersionLess(version1: string, version2: string): boolean;
/**
 * Check if two versions are equal
 * @param version1 - First version
 * @param version2 - Second version
 * @returns true if versions are equal
 */
export declare function isVersionEqual(version1: string, version2: string): boolean;
/**
 * Find the latest version from an array of version strings
 * @param versions - Array of version strings
 * @returns The latest version string
 * @throws ValidationError if the array is empty
 */
export declare function findLatestVersion(versions: string[]): string;
/**
 * Sort an array of versions in ascending order
 * @param versions - Array of version strings to sort
 * @returns New array with versions sorted in ascending order
 */
export declare function sortVersions(versions: string[]): string[];
/**
 * Sort an array of versions in descending order (latest first)
 * @param versions - Array of version strings to sort
 * @returns New array with versions sorted in descending order
 */
export declare function sortVersionsDescending(versions: string[]): string[];
export {};
//# sourceMappingURL=version-compare.d.ts.map