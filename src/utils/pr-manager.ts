/**
 * Pull Request Manager Component
 * Handles GitHub PR detection, creation, and updates for Devbox package updates
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import type {
	ExistingPRInfo,
	MergeStrategy,
	UpdateCandidate,
	UpdateSummary,
} from "../types";
import { GitHubError } from "../types";

export class PullRequestManager {
	private octokit: ReturnType<typeof github.getOctokit>;
	private owner: string;
	private repo: string;
	private branchPrefix: string;
	private singlePackageMode: boolean;

	constructor(
		token: string,
		branchPrefix = "devbox",
		singlePackageMode = true,
	) {
		this.octokit = github.getOctokit(token);
		this.owner = github.context.repo.owner;
		this.repo = github.context.repo.repo;
		this.branchPrefix = branchPrefix;
		this.singlePackageMode = singlePackageMode;
	}

	/**
	 * Check for existing pull requests related to Devbox updates
	 * Implements requirement 6.1: Detect existing update PRs to avoid duplicates
	 */
	async checkExistingPR(): Promise<ExistingPRInfo | null> {
		try {
			core.info("Checking for existing Devbox update pull requests...");

			// Search for open PRs with our branch prefix (both old and new formats)
			const { data: pullRequests } = await this.octokit.rest.pulls.list({
				owner: this.owner,
				repo: this.repo,
				state: "open",
				per_page: 100,
			});

			// Filter PRs that match our branch patterns
			const devboxPRs = pullRequests.filter((pr) => {
				const branchName = pr.head.ref;
				return (
					branchName.startsWith(`${this.branchPrefix}/`) || // New Renovate-style format
					branchName.startsWith(`${this.branchPrefix}-`) || // Old format for backward compatibility
					(pr.title.toLowerCase().includes("devbox") &&
						pr.title.toLowerCase().includes("update"))
				);
			});

			if (devboxPRs.length === 0) {
				core.info("No existing Devbox update PRs found");
				return null;
			}

			// Return the most recent PR
			const latestPR = devboxPRs.sort(
				(a, b) =>
					new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
			)[0];

			const existingPR: ExistingPRInfo = {
				number: latestPR.number,
				branch: latestPR.head.ref,
				title: latestPR.title,
				body: latestPR.body || "",
				state: latestPR.state as "open" | "closed" | "merged",
				updatedAt: latestPR.updated_at,
			};

			core.info(`Found existing PR #${existingPR.number}: ${existingPR.title}`);
			return existingPR;
		} catch (error) {
			const githubError = new GitHubError(
				`Failed to check for existing PRs: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ error, owner: this.owner, repo: this.repo },
			);
			core.warning(`Error checking existing PRs: ${githubError.message}`);
			return null;
		}
	}

	/**
	 * Search for PRs by branch name pattern
	 * Implements requirement 6.4: Consistent branch naming strategy
	 */
	async findPRByBranchPattern(pattern: string): Promise<ExistingPRInfo[]> {
		try {
			const { data: pullRequests } = await this.octokit.rest.pulls.list({
				owner: this.owner,
				repo: this.repo,
				state: "open",
				per_page: 100,
			});

			const matchingPRs = pullRequests.filter((pr) =>
				pr.head.ref.includes(pattern),
			);

			return matchingPRs.map((pr) => ({
				number: pr.number,
				branch: pr.head.ref,
				title: pr.title,
				body: pr.body || "",
				state: pr.state as "open" | "closed" | "merged",
				updatedAt: pr.updated_at,
			}));
		} catch (error) {
			core.warning(
				`Error searching PRs by pattern: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return [];
		}
	}

	/**
	 * Get detailed information about a specific PR
	 */
	async getPRDetails(prNumber: number): Promise<ExistingPRInfo | null> {
		try {
			const { data: pr } = await this.octokit.rest.pulls.get({
				owner: this.owner,
				repo: this.repo,
				pull_number: prNumber,
			});

			return {
				number: pr.number,
				branch: pr.head.ref,
				title: pr.title,
				body: pr.body || "",
				state: pr.state as "open" | "closed" | "merged",
				updatedAt: pr.updated_at,
			};
		} catch (error) {
			core.warning(
				`Error getting PR details for #${prNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return null;
		}
	}

	/**
	 * Create a new pull request for Devbox updates
	 * Implements requirements 3.1, 3.2: Create PR with detailed summary and version changes
	 */
	async createUpdatePR(
		summary: UpdateSummary,
		branchName: string,
	): Promise<number> {
		try {
			core.info(
				`Creating pull request for ${summary.totalUpdates} package updates...`,
			);

			const title = this.generatePRTitle(summary);
			const body = this.formatChangeDescription(summary.updates);

			const { data: pr } = await this.octokit.rest.pulls.create({
				owner: this.owner,
				repo: this.repo,
				title,
				body,
				head: branchName,
				base: "main",
			});

			core.info(`Created pull request #${pr.number}: ${title}`);
			return pr.number;
		} catch (error) {
			const githubError = new GitHubError(
				`Failed to create pull request: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ error, summary, branchName },
			);
			core.error(githubError.message);
			throw githubError;
		}
	}

	/**
	 * Update an existing pull request with new changes
	 * Implements requirement 6.2: Merge new updates with existing changes
	 */
	async updateExistingPR(
		pr: ExistingPRInfo,
		summary: UpdateSummary,
		strategy: MergeStrategy = {
			preserveExistingUpdates: true,
			conflictResolution: "merge",
			updateDescription: true,
		},
	): Promise<void> {
		try {
			core.info(
				`Updating existing PR #${pr.number} with ${summary.totalUpdates} new updates...`,
			);

			let updatedTitle = pr.title;
			let updatedBody = pr.body;

			if (strategy.updateDescription) {
				// Generate new title and body
				updatedTitle = this.generatePRTitle(summary);

				if (strategy.preserveExistingUpdates && pr.body) {
					// Merge with existing description
					updatedBody = this.mergeDescriptions(
						pr.body,
						summary.updates,
						strategy,
					);
				} else {
					// Replace with new description
					updatedBody = this.formatChangeDescription(summary.updates);
				}
			}

			await this.octokit.rest.pulls.update({
				owner: this.owner,
				repo: this.repo,
				pull_number: pr.number,
				title: updatedTitle,
				body: updatedBody,
			});

			core.info(`Updated PR #${pr.number} successfully`);
		} catch (error) {
			const githubError = new GitHubError(
				`Failed to update pull request #${pr.number}: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ error, pr, summary },
			);
			core.error(githubError.message);
			throw githubError;
		}
	}

	/**
	 * Generate a descriptive title for the pull request
	 */
	private generatePRTitle(summary: UpdateSummary): string {
		if (summary.totalUpdates === 1) {
			const update = summary.updates[0];
			return `chore: update ${update.packageName} from ${update.currentVersion} to ${update.latestVersion}`;
		}

		return `chore: update ${summary.totalUpdates} Devbox packages`;
	}

	/**
	 * Format the change description for pull request body
	 * Implements requirement 3.2, 3.3: Include detailed summary and version change information
	 */
	formatChangeDescription(updates: UpdateCandidate[]): string {
		if (updates.length === 0) {
			return "No package updates available.";
		}

		let description = "## 📦 Devbox Package Updates\n\n";
		description +=
			"This pull request updates the following packages to their latest versions:\n\n";

		// Group updates by type (major, minor, patch)
		const updatesByType = this.categorizeUpdates(updates);

		if (updatesByType.major.length > 0) {
			description += "### 🚨 Major Updates\n";
			updatesByType.major.forEach((update) => {
				description += `- **${update.packageName}**: \`${update.currentVersion}\` → \`${update.latestVersion}\`\n`;
			});
			description += "\n";
		}

		if (updatesByType.minor.length > 0) {
			description += "### ✨ Minor Updates\n";
			updatesByType.minor.forEach((update) => {
				description += `- **${update.packageName}**: \`${update.currentVersion}\` → \`${update.latestVersion}\`\n`;
			});
			description += "\n";
		}

		if (updatesByType.patch.length > 0) {
			description += "### 🐛 Patch Updates\n";
			updatesByType.patch.forEach((update) => {
				description += `- **${update.packageName}**: \`${update.currentVersion}\` → \`${update.latestVersion}\`\n`;
			});
			description += "\n";
		}

		if (updatesByType.other.length > 0) {
			description += "### 📋 Other Updates\n";
			updatesByType.other.forEach((update) => {
				description += `- **${update.packageName}**: \`${update.currentVersion}\` → \`${update.latestVersion}\`\n`;
			});
			description += "\n";
		}

		description += "---\n\n";
		description +=
			"🤖 This pull request was automatically generated by the Devbox Updater Action.\n";
		description +=
			"📝 Please review the changes and test your development environment before merging.\n";

		return description;
	}

	/**
	 * Merge new updates with existing PR description
	 */
	private mergeDescriptions(
		existingBody: string,
		newUpdates: UpdateCandidate[],
		strategy: MergeStrategy,
	): string {
		// For now, implement a simple strategy that appends new updates
		// In a more sophisticated implementation, we would parse the existing
		// description and merge intelligently

		const newDescription = this.formatChangeDescription(newUpdates);

		if (strategy.conflictResolution === "overwrite") {
			return newDescription;
		}

		// Simple merge: add a separator and append new updates
		return (
			existingBody +
			"\n\n---\n\n### 🔄 Additional Updates\n\n" +
			newDescription.split("## 📦 Devbox Package Updates\n\n")[1]
		);
	}

	/**
	 * Categorize updates by semantic version type
	 */
	private categorizeUpdates(updates: UpdateCandidate[]): {
		major: UpdateCandidate[];
		minor: UpdateCandidate[];
		patch: UpdateCandidate[];
		other: UpdateCandidate[];
	} {
		const result = {
			major: [] as UpdateCandidate[],
			minor: [] as UpdateCandidate[],
			patch: [] as UpdateCandidate[],
			other: [] as UpdateCandidate[],
		};

		updates.forEach((update) => {
			const versionType = this.getVersionChangeType(
				update.currentVersion,
				update.latestVersion,
			);
			result[versionType].push(update);
		});

		return result;
	}

	/**
	 * Determine the type of version change (major, minor, patch, other)
	 */
	private getVersionChangeType(
		current: string,
		latest: string,
	): "major" | "minor" | "patch" | "other" {
		// Simple semantic version parsing
		const currentParts = current.match(/^(\d+)\.(\d+)\.(\d+)/);
		const latestParts = latest.match(/^(\d+)\.(\d+)\.(\d+)/);

		if (!currentParts || !latestParts) {
			return "other";
		}

		const [, currentMajor, currentMinor, currentPatch] =
			currentParts.map(Number);
		const [, latestMajor, latestMinor, latestPatch] = latestParts.map(Number);

		if (latestMajor > currentMajor) return "major";
		if (latestMinor > currentMinor) return "minor";
		if (latestPatch > currentPatch) return "patch";

		return "other";
	}

	/**
	 * Generate a branch name for a specific package update
	 * Follows Renovate-style naming: devbox/package-name-version
	 * Example: biome@2.3.9 -> devbox/biome-2-3-9
	 * Special handling for 'latest': devbox/biome-latest or use resolved version if available
	 */
	generatePackageBranchName(
		packageName: string,
		targetVersion: string,
		resolvedVersion?: string,
	): string {
		// Extract package name (remove version if present)
		const cleanPackageName = packageName
			.split("@")[0]
			.replace(/[^a-zA-Z0-9-]/g, "-")
			.toLowerCase();

		// Handle 'latest' version specially
		let versionForBranch = targetVersion;
		if (targetVersion.toLowerCase() === "latest" && resolvedVersion) {
			// Use the resolved actual version if available
			versionForBranch = resolvedVersion;
		} else if (targetVersion.toLowerCase() === "latest") {
			// If we don't have resolved version, add timestamp to avoid conflicts
			const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
			versionForBranch = `latest-${timestamp}`;
		}

		// Replace dots and other special chars in version with hyphens
		const sanitizedVersion = versionForBranch.replace(/[^a-zA-Z0-9-]/g, "-");
		return `${this.branchPrefix}/${cleanPackageName}-${sanitizedVersion}`;
	}

	/**
	 * Generate a branch name for multiple package updates
	 * Format: devbox/multi-package-updates
	 */
	generateMultiPackageBranchName(): string {
		return `${this.branchPrefix}/multi-package-updates`;
	}

	/**
	 * Generate a consistent branch name for updates
	 * Implements requirement 3.1, 6.4: Consistent branch naming strategy
	 * Uses Renovate-style naming for better clarity
	 */
	generateBranchName(updates?: UpdateCandidate[]): string {
		// If we have updates, use them to determine the branch name
		if (updates && updates.length > 0) {
			if (this.singlePackageMode && updates.length === 1) {
				// Single package update: devbox/package-name-version
				const update = updates[0];
				// For single package, we have the resolved latest version in latestVersion
				return this.generatePackageBranchName(
					update.packageName,
					update.latestVersion,
					update.latestVersion, // The latestVersion is already resolved
				);
			} else {
				// Multiple packages or multi-package mode: devbox/multi-package-updates
				return this.generateMultiPackageBranchName();
			}
		}

		// Fallback to multi-package format
		return this.generateMultiPackageBranchName();
	}

	/**
	 * Determine if we should create separate PRs for each package
	 * Returns array of update groups - each group will get its own PR
	 */
	groupUpdatesForPRs(updates: UpdateCandidate[]): UpdateCandidate[][] {
		if (this.singlePackageMode) {
			// Create separate PR for each package
			return updates.map((update) => [update]);
		} else {
			// Create single PR for all packages
			return [updates];
		}
	}

	/**
	 * Generate a unique branch name to avoid conflicts
	 * Uses timestamp for uniqueness while maintaining Renovate-style format
	 */
	generateUniqueBranchName(packageName?: string): string {
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, -5); // Remove milliseconds and Z

		if (packageName) {
			const sanitizedPackage = packageName
				.replace(/[^a-zA-Z0-9\-_.]/g, "-")
				.toLowerCase();
			return `${this.branchPrefix}/${sanitizedPackage}-${timestamp}`;
		}

		return `${this.branchPrefix}/updates-${timestamp}`;
	}

	/**
	 * Check if a branch exists in the repository
	 */
	async branchExists(branchName: string): Promise<boolean> {
		try {
			await this.octokit.rest.repos.getBranch({
				owner: this.owner,
				repo: this.repo,
				branch: branchName,
			});
			return true;
		} catch {
			// Branch doesn't exist if we get a 404
			return false;
		}
	}

	/**
	 * Create a new branch from the default branch
	 * Implements requirement 3.1: Create descriptively named branch
	 */
	async createBranch(branchName: string, baseBranch = "main"): Promise<void> {
		try {
			core.info(`Creating branch: ${branchName} from ${baseBranch}`);

			// Get the SHA of the base branch
			const { data: baseRef } = await this.octokit.rest.repos.getBranch({
				owner: this.owner,
				repo: this.repo,
				branch: baseBranch,
			});

			// Create the new branch
			await this.octokit.rest.git.createRef({
				owner: this.owner,
				repo: this.repo,
				ref: `refs/heads/${branchName}`,
				sha: baseRef.commit.sha,
			});

			core.info(`Successfully created branch: ${branchName}`);
		} catch (error) {
			const githubError = new GitHubError(
				`Failed to create branch ${branchName}: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ error, branchName, baseBranch },
			);
			core.error(githubError.message);
			throw githubError;
		}
	}

	/**
	 * Get or create a branch for updates
	 * Returns existing branch if it exists, otherwise creates a new one
	 */
	async getOrCreateUpdateBranch(updates?: UpdateCandidate[]): Promise<string> {
		// Generate branch name based on updates
		let branchName = this.generateBranchName(updates);

		if (await this.branchExists(branchName)) {
			core.info(`Using existing branch: ${branchName}`);
			return branchName;
		}

		// If branch doesn't exist, create it
		try {
			await this.createBranch(branchName);
			return branchName;
		} catch (error) {
			// If creation fails (e.g., due to race condition), try a unique name
			core.warning(
				`Failed to create branch, trying unique name: ${error instanceof Error ? error.message : "Unknown error"}`,
			);

			const packageName =
				updates && updates.length === 1 ? updates[0].packageName : undefined;
			branchName = this.generateUniqueBranchName(packageName);
			await this.createBranch(branchName);
			return branchName;
		}
	}

	/**
	 * Delete a branch (cleanup after PR is merged)
	 */
	async deleteBranch(branchName: string): Promise<void> {
		try {
			await this.octokit.rest.git.deleteRef({
				owner: this.owner,
				repo: this.repo,
				ref: `heads/${branchName}`,
			});

			core.info(`Deleted branch: ${branchName}`);
		} catch (error) {
			core.warning(
				`Failed to delete branch ${branchName}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Get the default branch of the repository
	 */
	async getDefaultBranch(): Promise<string> {
		try {
			const { data: repo } = await this.octokit.rest.repos.get({
				owner: this.owner,
				repo: this.repo,
			});

			return repo.default_branch;
		} catch (error) {
			core.warning(
				`Failed to get default branch, using 'main': ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return "main";
		}
	}

	/**
	 * Validate branch name according to Git naming rules
	 */
	validateBranchName(branchName: string): boolean {
		// Git branch naming rules:
		// - Cannot start or end with a slash
		// - Cannot contain consecutive slashes
		// - Cannot contain certain characters: space, ~, ^, :, ?, *, [, \, ASCII control characters
		// - Cannot end with .lock
		// - Cannot be empty

		if (!branchName || branchName.length === 0) {
			return false;
		}

		if (branchName.startsWith("/") || branchName.endsWith("/")) {
			return false;
		}

		if (branchName.includes("//")) {
			return false;
		}

		if (branchName.endsWith(".lock")) {
			return false;
		}

		// Check for invalid characters
		const hasSpace = branchName.includes(" ");
		const hasInvalidChars = /[~^:?*[\\\]]/.test(branchName);
		const hasControlChars = branchName.split("").some((char) => {
			const code = char.charCodeAt(0);
			return (code >= 0 && code <= 31) || code === 127;
		});

		if (hasSpace || hasInvalidChars || hasControlChars) {
			return false;
		}

		return true;
	}
}
