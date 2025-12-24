/**
 * Validation utilities for Devbox configuration and data structures
 */
import { type DevboxConfig } from "../types";
/**
 * Validate a DevboxConfig object
 * @param config - The configuration object to validate
 * @throws ValidationError if the configuration is invalid
 */
export declare function validateDevboxConfig(config: unknown): asserts config is DevboxConfig;
/**
 * Parse and validate a JSON string as DevboxConfig
 * @param jsonString - The JSON string to parse
 * @returns Parsed and validated DevboxConfig
 * @throws ValidationError if parsing or validation fails
 */
export declare function parseDevboxConfig(jsonString: string): DevboxConfig;
/**
 * Validate a package name
 * @param packageName - The package name to validate
 * @throws ValidationError if the package name is invalid
 */
export declare function validatePackageName(packageName: string): void;
/**
 * Validate a version string
 * @param version - The version string to validate
 * @throws ValidationError if the version is invalid
 */
export declare function validateVersion(version: string): void;
/**
 * Validate that a configuration object has the required structure for serialization
 * @param config - The configuration to validate for serialization
 * @throws ValidationError if the configuration cannot be safely serialized
 */
export declare function validateForSerialization(config: DevboxConfig): void;
