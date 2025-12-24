/**
 * Validation utilities for Devbox configuration and data structures
 */

import { DevboxConfig, ValidationError } from '../types';
import { PATTERNS } from '../constants';

/**
 * Validate a DevboxConfig object
 * @param config - The configuration object to validate
 * @throws ValidationError if the configuration is invalid
 */
export function validateDevboxConfig(config: unknown): asserts config is DevboxConfig {
  if (!config || typeof config !== 'object') {
    throw new ValidationError('Configuration must be an object');
  }

  const cfg = config as Record<string, unknown>;

  // Validate packages array
  if (!Array.isArray(cfg.packages)) {
    throw new ValidationError('Configuration must have a "packages" array');
  }

  if (cfg.packages.length === 0) {
    throw new ValidationError('Packages array cannot be empty');
  }

  // Validate each package specification
  for (let i = 0; i < cfg.packages.length; i++) {
    const pkg = cfg.packages[i];
    if (typeof pkg !== 'string') {
      throw new ValidationError(`Package at index ${i} must be a string`);
    }
    if (pkg.trim().length === 0) {
      throw new ValidationError(`Package at index ${i} cannot be empty`);
    }
  }

  // Validate optional shell configuration
  if (cfg.shell !== undefined) {
    if (typeof cfg.shell !== 'object' || cfg.shell === null) {
      throw new ValidationError('Shell configuration must be an object');
    }

    const shell = cfg.shell as Record<string, unknown>;

    if (shell.init_hook !== undefined) {
      if (!Array.isArray(shell.init_hook)) {
        throw new ValidationError('Shell init_hook must be an array');
      }
      for (let i = 0; i < shell.init_hook.length; i++) {
        if (typeof shell.init_hook[i] !== 'string') {
          throw new ValidationError(`Shell init_hook at index ${i} must be a string`);
        }
      }
    }

    if (shell.scripts !== undefined) {
      if (typeof shell.scripts !== 'object' || shell.scripts === null) {
        throw new ValidationError('Shell scripts must be an object');
      }
      const scripts = shell.scripts as Record<string, unknown>;
      for (const [key, value] of Object.entries(scripts)) {
        if (typeof value !== 'string' && !Array.isArray(value)) {
          throw new ValidationError(`Shell script "${key}" must be a string or array`);
        }
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            if (typeof value[i] !== 'string') {
              throw new ValidationError(`Shell script "${key}" at index ${i} must be a string`);
            }
          }
        }
      }
    }
  }

  // Validate optional nixpkgs configuration
  if (cfg.nixpkgs !== undefined) {
    if (typeof cfg.nixpkgs !== 'object' || cfg.nixpkgs === null) {
      throw new ValidationError('Nixpkgs configuration must be an object');
    }

    const nixpkgs = cfg.nixpkgs as Record<string, unknown>;
    if (typeof nixpkgs.commit !== 'string') {
      throw new ValidationError('Nixpkgs commit must be a string');
    }
    if (nixpkgs.commit.trim().length === 0) {
      throw new ValidationError('Nixpkgs commit cannot be empty');
    }
  }
}

/**
 * Parse and validate a JSON string as DevboxConfig
 * @param jsonString - The JSON string to parse
 * @returns Parsed and validated DevboxConfig
 * @throws ValidationError if parsing or validation fails
 */
export function parseDevboxConfig(jsonString: string): DevboxConfig {
  let parsed: unknown;
  
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  validateDevboxConfig(parsed);
  return parsed;
}

/**
 * Validate a package name
 * @param packageName - The package name to validate
 * @throws ValidationError if the package name is invalid
 */
export function validatePackageName(packageName: string): void {
  if (typeof packageName !== 'string') {
    throw new ValidationError('Package name must be a string');
  }
  
  if (packageName.trim().length === 0) {
    throw new ValidationError('Package name cannot be empty');
  }

  // Allow more flexible package names for Devbox ecosystem
  const trimmed = packageName.trim();
  if (trimmed.includes(' ')) {
    throw new ValidationError('Package name cannot contain spaces');
  }
}

/**
 * Validate a version string
 * @param version - The version string to validate
 * @throws ValidationError if the version is invalid
 */
export function validateVersion(version: string): void {
  if (typeof version !== 'string') {
    throw new ValidationError('Version must be a string');
  }
  
  if (version.trim().length === 0) {
    throw new ValidationError('Version cannot be empty');
  }

  if (!PATTERNS.VERSION.test(version)) {
    throw new ValidationError(`Invalid version format: ${version}`);
  }
}

/**
 * Validate that a configuration object has the required structure for serialization
 * @param config - The configuration to validate for serialization
 * @throws ValidationError if the configuration cannot be safely serialized
 */
export function validateForSerialization(config: DevboxConfig): void {
  try {
    JSON.stringify(config);
  } catch (error) {
    throw new ValidationError(`Configuration cannot be serialized: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}