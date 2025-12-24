/**
 * Core type definitions for the Devbox Updater Action
 */

// Devbox configuration structure
export interface DevboxConfig {
  $schema?: string;
  packages: string[];
  shell?: {
    init_hook?: string[];
    scripts?: Record<string, string | string[]>;
  };
  nixpkgs?: {
    commit: string;
  };
}

// Package update candidate information
export interface UpdateCandidate {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

// Summary of all updates found
export interface UpdateSummary {
  totalUpdates: number;
  updates: UpdateCandidate[];
  hasChanges: boolean;
  summary: string;
}

// GitHub Action outputs
export interface ActionOutputs {
  changes: boolean;
  update_summary: string;
  pr_number?: number;
  pr_updated: boolean;
  existing_pr_found: boolean;
  error_message?: string;
}

// Existing pull request information
export interface ExistingPRInfo {
  number: number;
  branch: string;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  updatedAt: string;
}

// Strategy for merging updates with existing PRs
export interface MergeStrategy {
  preserveExistingUpdates: boolean;
  conflictResolution: 'fail' | 'overwrite' | 'merge';
  updateDescription: boolean;
}

// Devbox Search API response types
export interface DevboxPackageInfo {
  name: string;
  summary: string;
  homepage_url: string;
  license: string;
  releases: DevboxRelease[];
}

export interface DevboxRelease {
  version: string;
  last_updated: string;
  platforms: DevboxPlatform[];
  platforms_summary: string;
  outputs_summary: string;
}

export interface DevboxPlatform {
  arch: string;
  os: string;
  system: string;
  attribute_path: string;
  commit_hash: string;
  date: string;
  outputs: DevboxOutput[];
}

export interface DevboxOutput {
  name: string;
  path: string;
  default: boolean;
}

export interface DevboxResolveResponse {
  name: string;
  version: string;
  summary: string;
  systems: Record<string, DevboxSystemInfo>;
}

export interface DevboxSystemInfo {
  flake_installable: {
    ref: {
      type: string;
      owner: string;
      repo: string;
      rev: string;
    };
    attr_path: string;
  };
  last_updated: string;
  outputs: DevboxOutput[];
}

// Configuration for the action
export interface ActionConfig {
  token: string;
  devboxVersion: string;
  branchPrefix: string;
  prTitle: string;
  maxRetries: number;
}

// Error types for better error handling
export class DevboxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DevboxError';
  }
}

export class NetworkError extends DevboxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends DevboxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class GitHubError extends DevboxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GITHUB_ERROR', context);
    this.name = 'GitHubError';
  }
}

// Re-export utility types
export type { ParsedPackage } from '../utils/package-parser';