/**
 * File manager component for handling devbox.json and devbox.lock operations
 */

import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import type { DevboxConfig, UpdateCandidate } from "../types";
import { DevboxError, ValidationError } from "../types";
import { createPackageSpec, parsePackageSpec } from "./package-parser";
import { validateDevboxConfig } from "./validation";

const execAsync = promisify(exec);

/**
 * File manager class for handling devbox configuration and lock file operations
 */
export class FileManager {
	private configPath: string;
	private lockPath: string;

	constructor(
		configPath: string = "devbox.json",
		lockPath: string = "devbox.lock",
	) {
		this.configPath = configPath;
		this.lockPath = lockPath;
	}

	/**
	 * Read and parse the devbox.json configuration file
	 * @returns Parsed DevboxConfig object
	 */
	async readConfig(): Promise<DevboxConfig> {
		try {
			const configContent = await fs.readFile(this.configPath, "utf-8");
			const config = JSON.parse(configContent) as DevboxConfig;

			// Validate the configuration
			try {
				validateDevboxConfig(config);
			} catch (validationError) {
				throw new ValidationError(
					`Invalid devbox.json configuration structure: ${validationError instanceof Error ? validationError.message : "Unknown validation error"}`,
				);
			}

			return config;
		} catch (error) {
			if (error instanceof ValidationError) {
				throw error;
			}
			if (error instanceof SyntaxError) {
				throw new ValidationError(
					`Invalid JSON in ${this.configPath}: ${error.message}`,
				);
			}
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				throw new DevboxError(
					`Configuration file not found: ${this.configPath}`,
					"FILE_NOT_FOUND",
				);
			}
			throw error;
		}
	}

	/**
	 * Write the devbox.json configuration file with proper formatting
	 * @param config - DevboxConfig object to write
	 */
	async writeConfig(config: DevboxConfig): Promise<void> {
		try {
			// Validate before writing
			try {
				validateDevboxConfig(config);
			} catch (validationError) {
				throw new ValidationError(
					`Cannot write invalid devbox.json configuration: ${validationError instanceof Error ? validationError.message : "Unknown validation error"}`,
				);
			}

			// Format JSON with proper indentation to preserve structure
			const configContent = JSON.stringify(config, null, 2);
			await fs.writeFile(this.configPath, `${configContent}\n`, "utf-8");
		} catch (error) {
			if (error instanceof ValidationError) {
				throw error;
			}
			throw new DevboxError(
				`Failed to write configuration file: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FILE_WRITE_ERROR",
				{ configPath: this.configPath },
			);
		}
	}

	/**
	 * Update packages in the devbox.json configuration
	 * @param config - Current DevboxConfig
	 * @param updates - Array of UpdateCandidate objects
	 * @returns Updated DevboxConfig
	 */
	updatePackages(
		config: DevboxConfig,
		updates: UpdateCandidate[],
	): DevboxConfig {
		// Create a deep copy of the configuration to avoid mutations
		const updatedConfig: DevboxConfig = JSON.parse(JSON.stringify(config));

		// Create a map of package names to their new versions for quick lookup
		const updateMap = new Map<string, string>();
		updates.forEach((update) => {
			if (update.updateAvailable) {
				// Special handling: don't update packages that are already 'latest'
				// They should remain as 'latest' in devbox.json, only lock file will be refreshed
				if (update.currentVersion !== "latest") {
					updateMap.set(update.packageName, update.latestVersion);
				}
			}
		});

		// Update the packages array
		updatedConfig.packages = config.packages.map((packageSpec) => {
			const parsed = parsePackageSpec(packageSpec);
			const newVersion = updateMap.get(parsed.name);

			if (newVersion) {
				return createPackageSpec(parsed.name, newVersion);
			}

			return packageSpec; // No update available or keeping 'latest', keep original
		});

		return updatedConfig;
	}

	/**
	 * Create a backup of the current configuration file
	 * @returns Path to the backup file
	 */
	async createBackup(): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupPath = `${this.configPath}.backup.${timestamp}`;

		try {
			await fs.copyFile(this.configPath, backupPath);
			return backupPath;
		} catch (error) {
			throw new DevboxError(
				`Failed to create backup: ${error instanceof Error ? error.message : "Unknown error"}`,
				"BACKUP_ERROR",
				{ configPath: this.configPath, backupPath },
			);
		}
	}

	/**
	 * Restore configuration from a backup file
	 * @param backupPath - Path to the backup file
	 */
	async restoreFromBackup(backupPath: string): Promise<void> {
		try {
			await fs.copyFile(backupPath, this.configPath);
		} catch (error) {
			throw new DevboxError(
				`Failed to restore from backup: ${error instanceof Error ? error.message : "Unknown error"}`,
				"RESTORE_ERROR",
				{ configPath: this.configPath, backupPath },
			);
		}
	}

	/**
	 * Regenerate the devbox.lock file by running devbox commands
	 */
	async regenerateLock(): Promise<void> {
		try {
			// First, ensure devbox is available
			await this.ensureDevboxInstalled();

			// Remove existing lock file to force regeneration
			try {
				await fs.unlink(this.lockPath);
			} catch (_error) {
				// Ignore if lock file doesn't exist
				if ((_error as NodeJS.ErrnoException).code !== "ENOENT") {
					console.warn(
						`Warning: Could not remove existing lock file: ${_error}`,
					);
				}
			}

			// Run devbox install to regenerate lock file
			const { stdout, stderr } = await execAsync("devbox install", {
				timeout: 300000, // 5 minute timeout
				cwd: path.dirname(this.configPath),
			});

			if (stderr && !stderr.includes("warning")) {
				console.warn("Devbox install warnings:", stderr);
			}

			// Verify that lock file was created
			try {
				await fs.access(this.lockPath);
			} catch {
				throw new DevboxError(
					"Lock file was not generated after devbox install",
					"LOCK_GENERATION_FAILED",
					{ lockPath: this.lockPath, stdout, stderr },
				);
			}
		} catch (error) {
			if (error instanceof DevboxError) {
				throw error;
			}

			const execError = error as {
				code?: number;
				signal?: string;
				stdout?: string;
				stderr?: string;
			};
			throw new DevboxError(
				`Failed to regenerate lock file: ${execError.stderr || execError.stdout || "Unknown error"}`,
				"DEVBOX_COMMAND_FAILED",
				{
					code: execError.code,
					signal: execError.signal,
					stdout: execError.stdout,
					stderr: execError.stderr,
				},
			);
		}
	}

	/**
	 * Ensure devbox is installed and available
	 */
	private async ensureDevboxInstalled(): Promise<void> {
		try {
			await execAsync("devbox version", { timeout: 10000 });
		} catch (error) {
			throw new DevboxError(
				"Devbox is not installed or not available in PATH. Please install devbox first.",
				"DEVBOX_NOT_FOUND",
				{ error: error instanceof Error ? error.message : "Unknown error" },
			);
		}
	}

	/**
	 * Validate that the lock file is consistent with the configuration
	 */
	async validateLockFile(): Promise<boolean> {
		try {
			// Check if lock file exists
			await fs.access(this.lockPath);

			// Read lock file to ensure it's valid JSON
			const lockContent = await fs.readFile(this.lockPath, "utf-8");
			JSON.parse(lockContent); // Will throw if invalid JSON

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Apply updates to the configuration file with backup and validation
	 * @param updates - Array of UpdateCandidate objects
	 * @returns Updated DevboxConfig
	 */
	async applyUpdates(updates: UpdateCandidate[]): Promise<DevboxConfig> {
		// Filter to only include updates that are actually available
		const validUpdates = updates.filter((update) => update.updateAvailable);
		const failedLookups = updates.filter(
			(update) => update.latestVersion === "lookup-failed",
		);
		const skippedUpdates = updates.filter(
			(update) =>
				!update.updateAvailable && update.latestVersion !== "lookup-failed",
		);

		// Log information about skipped packages (Requirement 5.1)
		if (failedLookups.length > 0) {
			console.info(
				`🚫 Skipping ${failedLookups.length} package(s) due to lookup failures:`,
			);
			failedLookups.forEach((update) => {
				console.info(
					`   - ${update.packageName} (could not be found in registry)`,
				);
			});
		}

		if (skippedUpdates.length > 0) {
			console.debug(
				`ℹ️  Skipping ${skippedUpdates.length} package(s) that are already up to date`,
			);
		}

		if (validUpdates.length === 0) {
			throw new DevboxError("No valid updates to apply", "NO_UPDATES");
		}

		console.info(`📝 Proceeding with ${validUpdates.length} valid update(s)`);

		// Check if we have any non-latest updates (that would change devbox.json)
		const configUpdates = validUpdates.filter(
			(update) => update.currentVersion !== "latest",
		);
		const latestOnlyUpdates = validUpdates.filter(
			(update) => update.currentVersion === "latest",
		);

		// Create backup before making changes
		const backupPath = await this.createBackup();

		try {
			// Read current configuration
			const currentConfig = await this.readConfig();
			let updatedConfig = currentConfig;

			// Apply updates to devbox.json only if there are non-latest updates
			if (configUpdates.length > 0) {
				updatedConfig = this.updatePackages(currentConfig, configUpdates);
				await this.writeConfig(updatedConfig);
			}

			// Always regenerate lock file if there are any updates (including latest-only)
			// This ensures that 'latest' packages get their lock file refreshed
			await this.regenerateLock();

			// Validate that lock file was generated correctly
			if (!(await this.validateLockFile())) {
				throw new DevboxError(
					"Generated lock file is invalid",
					"INVALID_LOCK_FILE",
				);
			}

			// Commit the changes to Git
			await this.commitChanges(validUpdates);

			// Log what was updated
			if (configUpdates.length > 0) {
				console.log(
					`Updated ${configUpdates.length} package(s) in devbox.json`,
				);
			}
			if (latestOnlyUpdates.length > 0) {
				console.log(
					`Refreshed lock file for ${latestOnlyUpdates.length} 'latest' package(s)`,
				);
			}

			return updatedConfig;
		} catch (error) {
			// Restore from backup on failure
			try {
				await this.restoreFromBackup(backupPath);
			} catch (restoreError) {
				// Log restore error but throw original error
				console.error("Failed to restore from backup:", restoreError);
			}
			throw error;
		}
	}

	/**
	 * Commit changes to Git with a descriptive message
	 * @param updates - Array of UpdateCandidate objects that were applied
	 */
	private async commitChanges(updates: UpdateCandidate[]): Promise<void> {
		try {
			// Configure git user for the commit (required for GitHub Actions)
			await execAsync('git config user.name "github-actions[bot]"');
			await execAsync(
				'git config user.email "github-actions[bot]@users.noreply.github.com"',
			);

			// Add the changed files
			await execAsync(`git add ${this.configPath} ${this.lockPath}`);

			// Check if there are actually changes to commit
			const { stdout: statusOutput } = await execAsync(
				"git status --porcelain",
			);
			if (!statusOutput.trim()) {
				console.log("No changes to commit");
				return;
			}

			// Generate commit message
			const commitMessage = this.generateCommitMessage(updates);

			// Commit the changes
			await execAsync(`git commit -m "${commitMessage}"`);

			console.log(`Committed changes: ${commitMessage}`);
		} catch (error) {
			const execError = error as {
				code?: number;
				signal?: string;
				stdout?: string;
				stderr?: string;
			};

			// If there are no changes to commit, that's not an error
			if (
				execError.stdout?.includes("nothing to commit") ||
				execError.stderr?.includes("nothing to commit")
			) {
				console.log("No changes to commit");
				return;
			}

			throw new DevboxError(
				`Failed to commit changes: ${execError.stderr || execError.stdout || "Unknown error"}`,
				"GIT_COMMIT_FAILED",
				{
					code: execError.code,
					signal: execError.signal,
					stdout: execError.stdout,
					stderr: execError.stderr,
				},
			);
		}
	}

	/**
	 * Generate a descriptive commit message for the updates
	 * @param updates - Array of UpdateCandidate objects
	 * @returns Formatted commit message
	 */
	private generateCommitMessage(updates: UpdateCandidate[]): string {
		if (updates.length === 1) {
			const update = updates[0];
			return `chore: update ${update.packageName} from ${update.currentVersion} to ${update.latestVersion}`;
		}

		if (updates.length <= 3) {
			const packageNames = updates.map((u) => u.packageName).join(", ");
			return `chore: update ${packageNames}`;
		}

		return `chore: update ${updates.length} Devbox packages`;
	}
}
