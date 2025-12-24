/**
 * Structured logging system for the Devbox Updater Action
 * Implements requirement 4.4: Clear logging and GitHub Action output
 */

import * as core from "@actions/core";

/**
 * Log levels for structured logging
 */
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

/**
 * Log entry structure
 */
export interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	context?: Record<string, unknown>;
	phase?: string;
	operation?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
	enableTimestamps: boolean;
	enableContext: boolean;
	logLevel: LogLevel;
	enablePhaseTracking: boolean;
}

/**
 * Structured logger class for GitHub Actions
 */
export class ActionLogger {
	private config: LoggerConfig;
	private currentPhase?: string;
	private operationStack: string[] = [];

	constructor(config: Partial<LoggerConfig> = {}) {
		this.config = {
			enableTimestamps: true,
			enableContext: true,
			logLevel: LogLevel.INFO,
			enablePhaseTracking: true,
			...config,
		};
	}

	/**
	 * Set the current execution phase
	 * @param phase - Name of the current phase
	 */
	setPhase(phase: string): void {
		this.currentPhase = phase;
		if (this.config.enablePhaseTracking) {
			core.startGroup(`📋 ${phase}`);
		}
	}

	/**
	 * End the current phase
	 */
	endPhase(): void {
		if (this.config.enablePhaseTracking && this.currentPhase) {
			core.endGroup();
		}
		this.currentPhase = undefined;
	}

	/**
	 * Start a new operation (creates a nested group)
	 * @param operation - Name of the operation
	 */
	startOperation(operation: string): void {
		this.operationStack.push(operation);
		core.startGroup(`🔧 ${operation}`);
	}

	/**
	 * End the current operation
	 */
	endOperation(): void {
		if (this.operationStack.length > 0) {
			this.operationStack.pop();
			core.endGroup();
		}
	}

	/**
	 * Log a debug message
	 * @param message - Log message
	 * @param context - Additional context data
	 */
	debug(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.DEBUG, message, context);
	}

	/**
	 * Log an info message
	 * @param message - Log message
	 * @param context - Additional context data
	 */
	info(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.INFO, message, context);
	}

	/**
	 * Log a warning message
	 * @param message - Log message
	 * @param context - Additional context data
	 */
	warn(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.WARN, message, context);
	}

	/**
	 * Log an error message
	 * @param message - Log message
	 * @param context - Additional context data
	 */
	error(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.ERROR, message, context);
	}

	/**
	 * Log a success message with special formatting
	 * @param message - Success message
	 * @param context - Additional context data
	 */
	success(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.INFO, `✅ ${message}`, context);
	}

	/**
	 * Log a progress message with special formatting
	 * @param message - Progress message
	 * @param context - Additional context data
	 */
	progress(message: string, context?: Record<string, unknown>): void {
		this.log(LogLevel.INFO, `🔄 ${message}`, context);
	}

	/**
	 * Log package update information in a structured format
	 * @param updates - Array of update candidates
	 */
	logPackageUpdates(
		updates: Array<{
			packageName: string;
			currentVersion: string;
			latestVersion: string;
		}>,
	): void {
		if (updates.length === 0) {
			this.info("No package updates available");
			return;
		}

		this.info(`Found ${updates.length} package update(s):`);
		updates.forEach((update, index) => {
			this.info(
				`  ${index + 1}. ${update.packageName}: ${update.currentVersion} → ${update.latestVersion}`,
			);
		});
	}

	/**
	 * Log GitHub Action summary
	 * @param summary - Summary information
	 */
	logActionSummary(summary: {
		totalUpdates: number;
		prNumber?: number;
		prUpdated: boolean;
		existingPrFound: boolean;
		hasErrors: boolean;
	}): void {
		core.summary.addHeading("🚀 Devbox Updater Results", 2);

		if (summary.hasErrors) {
			core.summary.addRaw("❌ Action completed with errors");
		} else if (summary.totalUpdates === 0) {
			core.summary.addRaw("✅ All packages are up to date");
		} else {
			core.summary.addRaw(
				`✅ Successfully processed ${summary.totalUpdates} package updates`,
			);
		}

		if (summary.prNumber) {
			if (summary.prUpdated) {
				core.summary.addRaw(`📝 Updated existing PR #${summary.prNumber}`);
			} else {
				core.summary.addRaw(`📝 Created new PR #${summary.prNumber}`);
			}
		}

		if (summary.existingPrFound && !summary.prUpdated) {
			core.summary.addRaw("🔍 Found existing PR but no updates were needed");
		}

		// Write the summary
		core.summary.write();
	}

	/**
	 * Core logging method
	 * @param level - Log level
	 * @param message - Log message
	 * @param context - Additional context data
	 */
	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
	): void {
		// Check if we should log this level
		if (!this.shouldLog(level)) {
			return;
		}

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context: this.config.enableContext ? context : undefined,
			phase: this.currentPhase,
			operation: this.operationStack[this.operationStack.length - 1],
		};

		const formattedMessage = this.formatMessage(entry);

		// Use appropriate GitHub Actions logging method
		switch (level) {
			case LogLevel.DEBUG:
				core.debug(formattedMessage);
				break;
			case LogLevel.INFO:
				core.info(formattedMessage);
				break;
			case LogLevel.WARN:
				core.warning(formattedMessage);
				break;
			case LogLevel.ERROR:
				core.error(formattedMessage);
				break;
		}

		// Log context separately if it exists and is enabled
		if (
			this.config.enableContext &&
			context &&
			Object.keys(context).length > 0
		) {
			const contextStr = JSON.stringify(context, null, 2);
			core.debug(`Context: ${contextStr}`);
		}
	}

	/**
	 * Check if a log level should be logged
	 * @param level - Log level to check
	 * @returns true if the level should be logged
	 */
	private shouldLog(level: LogLevel): boolean {
		const levels = [
			LogLevel.DEBUG,
			LogLevel.INFO,
			LogLevel.WARN,
			LogLevel.ERROR,
		];
		const currentLevelIndex = levels.indexOf(this.config.logLevel);
		const messageLevelIndex = levels.indexOf(level);
		return messageLevelIndex >= currentLevelIndex;
	}

	/**
	 * Format a log message
	 * @param entry - Log entry to format
	 * @returns Formatted message string
	 */
	private formatMessage(entry: LogEntry): string {
		const parts: string[] = [];

		// Add timestamp if enabled
		if (this.config.enableTimestamps) {
			const timestamp = new Date(entry.timestamp).toLocaleTimeString();
			parts.push(`[${timestamp}]`);
		}

		// Add phase if available
		if (entry.phase) {
			parts.push(`[${entry.phase}]`);
		}

		// Add operation if available
		if (entry.operation) {
			parts.push(`[${entry.operation}]`);
		}

		// Add the main message
		parts.push(entry.message);

		return parts.join(" ");
	}

	/**
	 * Create a progress indicator for long-running operations
	 * @param total - Total number of items
	 * @param current - Current item number
	 * @param itemName - Name of the item being processed
	 */
	logProgress(total: number, current: number, itemName?: string): void {
		const percentage = Math.round((current / total) * 100);
		const progressBar = this.createProgressBar(percentage);
		const item = itemName ? ` (${itemName})` : "";
		this.info(
			`Progress: ${progressBar} ${percentage}% (${current}/${total})${item}`,
		);
	}

	/**
	 * Create a simple text-based progress bar
	 * @param percentage - Completion percentage (0-100)
	 * @returns Progress bar string
	 */
	private createProgressBar(percentage: number): string {
		const width = 20;
		const filled = Math.round((percentage / 100) * width);
		const empty = width - filled;
		return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
	}

	/**
	 * Log timing information for operations
	 * @param operationName - Name of the operation
	 * @param startTime - Start time in milliseconds
	 * @param endTime - End time in milliseconds (defaults to now)
	 */
	logTiming(
		operationName: string,
		startTime: number,
		endTime: number = Date.now(),
	): void {
		const duration = endTime - startTime;
		const formattedDuration = this.formatDuration(duration);
		this.info(`⏱️  ${operationName} completed in ${formattedDuration}`);
	}

	/**
	 * Format duration in a human-readable way
	 * @param milliseconds - Duration in milliseconds
	 * @returns Formatted duration string
	 */
	private formatDuration(milliseconds: number): string {
		if (milliseconds < 1000) {
			return `${milliseconds}ms`;
		}

		const seconds = Math.round((milliseconds / 1000) * 100) / 100;
		if (seconds < 60) {
			return `${seconds}s`;
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.round((seconds % 60) * 100) / 100;
		return `${minutes}m ${remainingSeconds}s`;
	}
}

/**
 * Global logger instance
 */
export const logger = new ActionLogger();

/**
 * Convenience functions for common logging patterns
 */
export const log = {
	debug: (message: string, context?: Record<string, unknown>): void =>
		logger.debug(message, context),
	info: (message: string, context?: Record<string, unknown>): void =>
		logger.info(message, context),
	warn: (message: string, context?: Record<string, unknown>): void =>
		logger.warn(message, context),
	error: (message: string, context?: Record<string, unknown>): void =>
		logger.error(message, context),
	success: (message: string, context?: Record<string, unknown>): void =>
		logger.success(message, context),
	progress: (message: string, context?: Record<string, unknown>): void =>
		logger.progress(message, context),

	setPhase: (phase: string): void => logger.setPhase(phase),
	endPhase: (): void => logger.endPhase(),
	startOperation: (operation: string): void => logger.startOperation(operation),
	endOperation: (): void => logger.endOperation(),

	packageUpdates: (
		updates: Array<{
			packageName: string;
			currentVersion: string;
			latestVersion: string;
		}>,
	): void => logger.logPackageUpdates(updates),

	actionSummary: (summary: {
		totalUpdates: number;
		prNumber?: number;
		prUpdated: boolean;
		existingPrFound: boolean;
		hasErrors: boolean;
	}): void => logger.logActionSummary(summary),

	timing: (operationName: string, startTime: number, endTime?: number): void =>
		logger.logTiming(operationName, startTime, endTime),

	progressBar: (total: number, current: number, itemName?: string): void =>
		logger.logProgress(total, current, itemName),
};
