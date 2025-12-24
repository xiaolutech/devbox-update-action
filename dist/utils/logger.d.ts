/**
 * Structured logging system for the Devbox Updater Action
 * Implements requirement 4.4: Clear logging and GitHub Action output
 */
/**
 * Log levels for structured logging
 */
export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
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
export declare class ActionLogger {
    private config;
    private currentPhase?;
    private operationStack;
    constructor(config?: Partial<LoggerConfig>);
    /**
     * Set the current execution phase
     * @param phase - Name of the current phase
     */
    setPhase(phase: string): void;
    /**
     * End the current phase
     */
    endPhase(): void;
    /**
     * Start a new operation (creates a nested group)
     * @param operation - Name of the operation
     */
    startOperation(operation: string): void;
    /**
     * End the current operation
     */
    endOperation(): void;
    /**
     * Log a debug message
     * @param message - Log message
     * @param context - Additional context data
     */
    debug(message: string, context?: Record<string, unknown>): void;
    /**
     * Log an info message
     * @param message - Log message
     * @param context - Additional context data
     */
    info(message: string, context?: Record<string, unknown>): void;
    /**
     * Log a warning message
     * @param message - Log message
     * @param context - Additional context data
     */
    warn(message: string, context?: Record<string, unknown>): void;
    /**
     * Log an error message
     * @param message - Log message
     * @param context - Additional context data
     */
    error(message: string, context?: Record<string, unknown>): void;
    /**
     * Log a success message with special formatting
     * @param message - Success message
     * @param context - Additional context data
     */
    success(message: string, context?: Record<string, unknown>): void;
    /**
     * Log a progress message with special formatting
     * @param message - Progress message
     * @param context - Additional context data
     */
    progress(message: string, context?: Record<string, unknown>): void;
    /**
     * Log package update information in a structured format
     * @param updates - Array of update candidates
     */
    logPackageUpdates(updates: Array<{
        packageName: string;
        currentVersion: string;
        latestVersion: string;
    }>): void;
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
    }): void;
    /**
     * Core logging method
     * @param level - Log level
     * @param message - Log message
     * @param context - Additional context data
     */
    private log;
    /**
     * Check if a log level should be logged
     * @param level - Log level to check
     * @returns true if the level should be logged
     */
    private shouldLog;
    /**
     * Format a log message
     * @param entry - Log entry to format
     * @returns Formatted message string
     */
    private formatMessage;
    /**
     * Create a progress indicator for long-running operations
     * @param total - Total number of items
     * @param current - Current item number
     * @param itemName - Name of the item being processed
     */
    logProgress(total: number, current: number, itemName?: string): void;
    /**
     * Create a simple text-based progress bar
     * @param percentage - Completion percentage (0-100)
     * @returns Progress bar string
     */
    private createProgressBar;
    /**
     * Log timing information for operations
     * @param operationName - Name of the operation
     * @param startTime - Start time in milliseconds
     * @param endTime - End time in milliseconds (defaults to now)
     */
    logTiming(operationName: string, startTime: number, endTime?: number): void;
    /**
     * Format duration in a human-readable way
     * @param milliseconds - Duration in milliseconds
     * @returns Formatted duration string
     */
    private formatDuration;
}
/**
 * Global logger instance
 */
export declare const logger: ActionLogger;
/**
 * Convenience functions for common logging patterns
 */
export declare const log: {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
    success: (message: string, context?: Record<string, unknown>) => void;
    progress: (message: string, context?: Record<string, unknown>) => void;
    setPhase: (phase: string) => void;
    endPhase: () => void;
    startOperation: (operation: string) => void;
    endOperation: () => void;
    packageUpdates: (updates: Array<{
        packageName: string;
        currentVersion: string;
        latestVersion: string;
    }>) => void;
    actionSummary: (summary: {
        totalUpdates: number;
        prNumber?: number;
        prUpdated: boolean;
        existingPrFound: boolean;
        hasErrors: boolean;
    }) => void;
    timing: (operationName: string, startTime: number, endTime?: number) => void;
    progressBar: (total: number, current: number, itemName?: string) => void;
};
