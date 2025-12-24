/**
 * Core type definitions for the Devbox Updater Action
 */
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
export interface UpdateCandidate {
    packageName: string;
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
}
export interface UpdateSummary {
    totalUpdates: number;
    updates: UpdateCandidate[];
    hasChanges: boolean;
    summary: string;
}
export interface ActionOutputs {
    changes: boolean;
    update_summary: string;
    pr_number?: number;
    pr_updated: boolean;
    existing_pr_found: boolean;
    error_message?: string;
}
export interface ExistingPRInfo {
    number: number;
    branch: string;
    title: string;
    body: string;
    state: 'open' | 'closed' | 'merged';
    updatedAt: string;
}
export interface MergeStrategy {
    preserveExistingUpdates: boolean;
    conflictResolution: 'fail' | 'overwrite' | 'merge';
    updateDescription: boolean;
}
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
export interface ActionConfig {
    token: string;
    devboxVersion: string;
    branchPrefix: string;
    prTitle: string;
    maxRetries: number;
}
export declare class DevboxError extends Error {
    readonly code: string;
    readonly context?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, context?: Record<string, unknown> | undefined);
}
export declare class NetworkError extends DevboxError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class ValidationError extends DevboxError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class GitHubError extends DevboxError {
    constructor(message: string, context?: Record<string, unknown>);
}
export type { ParsedPackage } from '../utils/package-parser';
//# sourceMappingURL=index.d.ts.map