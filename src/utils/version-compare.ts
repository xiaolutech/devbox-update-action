/**
 * Version comparison utilities for Devbox packages
 */

import { ValidationError } from "../types";

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
export function parseVersion(version: string): ParsedVersion {
	if (!version || typeof version !== "string") {
		throw new ValidationError("Version must be a non-empty string");
	}

	const trimmed = version.trim();
	if (trimmed.length === 0) {
		throw new ValidationError("Version cannot be empty");
	}

	// Handle semantic versioning pattern: major.minor.patch[-prerelease][+build]
	const semverMatch = trimmed.match(
		/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([^+]+))?(?:\+(.+))?$/,
	);

	if (semverMatch) {
		const [, major, minor = "0", patch = "0", prerelease, build] = semverMatch;
		return {
			major: parseInt(major, 10),
			minor: parseInt(minor, 10),
			patch: parseInt(patch, 10),
			prerelease,
			build,
			original: trimmed,
		};
	}

	// Handle date-based versions (20240101, 2024.01.01)
	const dateMatch = trimmed.match(/^(\d{4})[.-]?(\d{2})[.-]?(\d{2})$/);
	if (dateMatch) {
		const [, year, month, day] = dateMatch;
		return {
			major: parseInt(year, 10),
			minor: parseInt(month, 10),
			patch: parseInt(day, 10),
			original: trimmed,
		};
	}

	// Handle single number versions (just treat as major version)
	const numberMatch = trimmed.match(/^(\d+)$/);
	if (numberMatch) {
		return {
			major: parseInt(numberMatch[1], 10),
			minor: 0,
			patch: 0,
			original: trimmed,
		};
	}

	// For non-standard versions, try to extract numbers and compare lexicographically
	const numbers = trimmed.match(/\d+/g);
	if (numbers && numbers.length > 0) {
		return {
			major: parseInt(numbers[0], 10),
			minor: numbers.length > 1 ? parseInt(numbers[1], 10) : 0,
			patch: numbers.length > 2 ? parseInt(numbers[2], 10) : 0,
			prerelease: trimmed.includes("-")
				? trimmed.split("-").slice(1).join("-")
				: undefined,
			original: trimmed,
		};
	}

	// Fallback: treat as string version
	return {
		major: 0,
		minor: 0,
		patch: 0,
		prerelease: trimmed,
		original: trimmed,
	};
}

/**
 * Compare two version strings
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(version1: string, version2: string): number {
	if (version1 === version2) {
		return 0;
	}

	const v1 = parseVersion(version1);
	const v2 = parseVersion(version2);

	// Compare major version
	if (v1.major !== v2.major) {
		return v1.major < v2.major ? -1 : 1;
	}

	// Compare minor version
	if (v1.minor !== v2.minor) {
		return v1.minor < v2.minor ? -1 : 1;
	}

	// Compare patch version
	if (v1.patch !== v2.patch) {
		return v1.patch < v2.patch ? -1 : 1;
	}

	// Handle prerelease versions
	if (v1.prerelease && !v2.prerelease) {
		return -1; // Prerelease is less than release
	}
	if (!v1.prerelease && v2.prerelease) {
		return 1; // Release is greater than prerelease
	}
	if (v1.prerelease && v2.prerelease) {
		return v1.prerelease.localeCompare(v2.prerelease);
	}

	// If all numeric parts are equal and no prerelease, compare original strings
	return v1.original.localeCompare(v2.original);
}

/**
 * Check if version1 is greater than version2
 * @param version1 - First version
 * @param version2 - Second version
 * @returns true if version1 > version2
 */
export function isVersionGreater(version1: string, version2: string): boolean {
	return compareVersions(version1, version2) > 0;
}

/**
 * Check if version1 is less than version2
 * @param version1 - First version
 * @param version2 - Second version
 * @returns true if version1 < version2
 */
export function isVersionLess(version1: string, version2: string): boolean {
	return compareVersions(version1, version2) < 0;
}

/**
 * Check if two versions are equal
 * @param version1 - First version
 * @param version2 - Second version
 * @returns true if versions are equal
 */
export function isVersionEqual(version1: string, version2: string): boolean {
	return compareVersions(version1, version2) === 0;
}

/**
 * Find the latest version from an array of version strings
 * @param versions - Array of version strings
 * @returns The latest version string
 * @throws ValidationError if the array is empty
 */
export function findLatestVersion(versions: string[]): string {
	if (!Array.isArray(versions) || versions.length === 0) {
		throw new ValidationError("Versions array cannot be empty");
	}

	return versions.reduce((latest, current) => {
		return isVersionGreater(current, latest) ? current : latest;
	});
}

/**
 * Sort an array of versions in ascending order
 * @param versions - Array of version strings to sort
 * @returns New array with versions sorted in ascending order
 */
export function sortVersions(versions: string[]): string[] {
	return [...versions].sort(compareVersions);
}

/**
 * Sort an array of versions in descending order (latest first)
 * @param versions - Array of version strings to sort
 * @returns New array with versions sorted in descending order
 */
export function sortVersionsDescending(versions: string[]): string[] {
	return [...versions].sort((a, b) => compareVersions(b, a));
}
