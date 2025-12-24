/**
 * File manager component for handling devbox.json and devbox.lock operations
 */
import type { DevboxConfig, UpdateCandidate } from "../types";
/**
 * File manager class for handling devbox configuration and lock file operations
 */
export declare class FileManager {
    private configPath;
    private lockPath;
    constructor(configPath?: string, lockPath?: string);
    /**
     * Read and parse the devbox.json configuration file
     * @returns Parsed DevboxConfig object
     */
    readConfig(): Promise<DevboxConfig>;
    /**
     * Write the devbox.json configuration file with proper formatting
     * @param config - DevboxConfig object to write
     */
    writeConfig(config: DevboxConfig): Promise<void>;
    /**
     * Update packages in the devbox.json configuration
     * @param config - Current DevboxConfig
     * @param updates - Array of UpdateCandidate objects
     * @returns Updated DevboxConfig
     */
    updatePackages(config: DevboxConfig, updates: UpdateCandidate[]): DevboxConfig;
    /**
     * Create a backup of the current configuration file
     * @returns Path to the backup file
     */
    createBackup(): Promise<string>;
    /**
     * Restore configuration from a backup file
     * @param backupPath - Path to the backup file
     */
    restoreFromBackup(backupPath: string): Promise<void>;
    /**
     * Regenerate the devbox.lock file by running devbox commands
     */
    regenerateLock(): Promise<void>;
    /**
     * Ensure devbox is installed and available
     */
    private ensureDevboxInstalled;
    /**
     * Validate that the lock file is consistent with the configuration
     */
    validateLockFile(): Promise<boolean>;
    /**
     * Apply updates to the configuration file with backup and validation
     * @param updates - Array of UpdateCandidate objects
     * @param commitAndPush - Whether to commit and push changes (default: true)
     * @returns Updated DevboxConfig
     */
    applyUpdates(updates: UpdateCandidate[], commitAndPush?: boolean): Promise<DevboxConfig>;
    /**
     * Commit changes to Git with a descriptive message
     * @param updates - Array of UpdateCandidate objects that were applied
     */
    commitChanges(updates: UpdateCandidate[]): Promise<void>;
    /**
     * Push committed changes to remote repository
     */
    pushChanges(): Promise<void>;
    /**
     * Generate a descriptive commit message for the updates
     * @param updates - Array of UpdateCandidate objects
     * @returns Formatted commit message
     */
    private generateCommitMessage;
}
