/**
 * Pull Request Manager Component
 * Handles GitHub PR detection, creation, and updates for Devbox package updates
 */
import type { ExistingPRInfo, MergeStrategy, UpdateCandidate, UpdateSummary } from "../types";
export declare class PullRequestManager {
    private octokit;
    private owner;
    private repo;
    private branchPrefix;
    private singlePackageMode;
    constructor(token: string, branchPrefix?: string, singlePackageMode?: boolean);
    /**
     * Check for existing pull requests related to Devbox updates
     * Implements requirement 6.1: Detect existing update PRs to avoid duplicates
     */
    checkExistingPR(): Promise<ExistingPRInfo | null>;
    /**
     * Search for PRs by branch name pattern
     * Implements requirement 6.4: Consistent branch naming strategy
     */
    findPRByBranchPattern(pattern: string): Promise<ExistingPRInfo[]>;
    /**
     * Get detailed information about a specific PR
     */
    getPRDetails(prNumber: number): Promise<ExistingPRInfo | null>;
    /**
     * Create a new pull request for Devbox updates
     * Implements requirements 3.1, 3.2: Create PR with detailed summary and version changes
     */
    createUpdatePR(summary: UpdateSummary, branchName: string): Promise<number>;
    /**
     * Update an existing pull request with new changes
     * Implements requirement 6.2: Merge new updates with existing changes
     */
    updateExistingPR(pr: ExistingPRInfo, summary: UpdateSummary, strategy?: MergeStrategy): Promise<void>;
    /**
     * Generate a descriptive title for the pull request
     */
    private generatePRTitle;
    /**
     * Format the change description for pull request body
     * Implements requirement 3.2, 3.3: Include detailed summary and version change information
     */
    formatChangeDescription(updates: UpdateCandidate[]): string;
    /**
     * Merge new updates with existing PR description
     */
    private mergeDescriptions;
    /**
     * Categorize updates by semantic version type
     */
    private categorizeUpdates;
    /**
     * Determine the type of version change (major, minor, patch, other)
     */
    private getVersionChangeType;
    /**
     * Generate a branch name for a specific package update
     * Follows Renovate-style naming: devbox/package-name-version
     * Example: biome@2.3.9 -> devbox/biome-2-3-9
     * Special handling for 'latest': devbox/biome-latest or use resolved version if available
     */
    generatePackageBranchName(packageName: string, targetVersion: string, resolvedVersion?: string): string;
    /**
     * Generate a branch name for multiple package updates
     * Format: devbox/multi-package-updates
     */
    generateMultiPackageBranchName(): string;
    /**
     * Generate a consistent branch name for updates
     * Implements requirement 3.1, 6.4: Consistent branch naming strategy
     * Uses Renovate-style naming for better clarity
     */
    generateBranchName(updates?: UpdateCandidate[]): string;
    /**
     * Determine if we should create separate PRs for each package
     * Returns array of update groups - each group will get its own PR
     */
    groupUpdatesForPRs(updates: UpdateCandidate[]): UpdateCandidate[][];
    /**
     * Generate a unique branch name to avoid conflicts
     * Uses timestamp for uniqueness while maintaining Renovate-style format
     */
    generateUniqueBranchName(packageName?: string): string;
    /**
     * Check if a branch exists in the repository
     */
    branchExists(branchName: string): Promise<boolean>;
    /**
     * Create a new branch from the default branch
     * Implements requirement 3.1: Create descriptively named branch
     */
    createBranch(branchName: string, baseBranch?: string): Promise<void>;
    /**
     * Get or create a branch for updates
     * Returns existing branch if it exists, otherwise creates a new one
     */
    getOrCreateUpdateBranch(updates?: UpdateCandidate[]): Promise<string>;
    /**
     * Delete a branch (cleanup after PR is merged)
     */
    deleteBranch(branchName: string): Promise<void>;
    /**
     * Get the default branch of the repository
     */
    getDefaultBranch(): Promise<string>;
    /**
     * Validate branch name according to Git naming rules
     */
    validateBranchName(branchName: string): boolean;
}
