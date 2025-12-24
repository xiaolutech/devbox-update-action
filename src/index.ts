/**
 * Main entry point for the Devbox Updater GitHub Action
 * Implements requirements 1.1, 2.1, 3.1: Complete workflow orchestration
 */

import * as core from "@actions/core";
import type { ActionConfig, ActionOutputs } from "./types";
import { errorHandler } from "./utils/error-handler";
import { FileManager } from "./utils/file-manager";
import { log } from "./utils/logger";
import { createPackageScanner } from "./utils/package-scanner";
import { PullRequestManager } from "./utils/pr-manager";
import { retryWithBackoff } from "./utils/retry-mechanism";

/**
 * Main action execution function
 * Orchestrates the complete package update workflow
 */
async function run(): Promise<void> {
	const startTime = Date.now();
	const outputs: ActionOutputs = {
		changes: false,
		update_summary: "No updates processed",
		pr_updated: false,
		existing_pr_found: false,
	};

	try {
		// Get and validate action inputs
		const config: ActionConfig = {
			token: core.getInput("token", { required: true }),
			devboxVersion: core.getInput("devbox-version") || "latest",
			branchPrefix: core.getInput("branch-prefix") || "devbox-updates",
			prTitle: core.getInput("pr-title") || "Update Devbox packages",
			maxRetries: parseInt(core.getInput("max-retries") || "3", 10),
			updateLatest: core.getInput("update-latest").toLowerCase() === "true",
		};

		// Validate configuration
		validateConfig(config);

		log.info("🚀 Starting Devbox package updater...");
		log.debug("Configuration loaded", {
			devboxVersion: config.devboxVersion,
			branchPrefix: config.branchPrefix,
			maxRetries: config.maxRetries.toString(),
			updateLatest: config.updateLatest.toString(),
		});

		// Initialize components
		log.startOperation("Initializing components");
		const packageScanner = createPackageScanner(undefined, config.updateLatest);
		const fileManager = new FileManager();
		const prManager = new PullRequestManager(config.token, config.branchPrefix);
		log.endOperation();

		// Phase 1: Discovery - Scan for package updates
		log.setPhase("Phase 1: Package Discovery");
		log.info("🔍 Scanning for package updates...");

		const scanStartTime = Date.now();
		const updateSummary = await retryWithBackoff(
			() => packageScanner.generateUpdateSummary(),
			"Package scanning",
			{ maxRetries: config.maxRetries },
		);
		log.timing("Package scanning", scanStartTime);

		log.info(`📊 Scan completed: ${updateSummary.totalUpdates} updates found`);
		log.packageUpdates(updateSummary.updates);
		outputs.update_summary = updateSummary.summary;
		log.endPhase();

		// Check if any updates are available
		if (!updateSummary.hasChanges) {
			log.success("All packages are up to date. No action needed.");
			outputs.changes = false;
			setActionOutputs(outputs);

			// Log final summary
			log.actionSummary({
				totalUpdates: 0,
				prUpdated: false,
				existingPrFound: false,
				hasErrors: false,
			});

			log.timing("Total execution time", startTime);
			return;
		}

		// Phase 2: Check for existing PRs
		log.setPhase("Phase 2: PR Detection");
		log.info("🔎 Checking for existing update PRs...");

		const existingPR = await prManager.checkExistingPR();
		outputs.existing_pr_found = existingPR !== null;

		if (existingPR) {
			log.info(
				`📝 Found existing PR #${existingPR.number}: ${existingPR.title}`,
			);
			log.debug("Existing PR details", {
				number: existingPR.number,
				branch: existingPR.branch,
				state: existingPR.state,
				updatedAt: existingPR.updatedAt,
			});
		} else {
			log.info("No existing update PRs found");
		}
		log.endPhase();

		// Phase 3: Apply updates to files
		log.setPhase("Phase 3: File Updates");
		log.info("📝 Applying package updates...");

		const updateStartTime = Date.now();
		const _updatedConfig = await fileManager.applyUpdates(
			updateSummary.updates,
		);
		log.timing("File updates", updateStartTime);

		log.success(`Successfully updated ${updateSummary.totalUpdates} packages`);
		outputs.changes = true;
		log.endPhase();

		// Phase 4: Create or update pull request
		log.setPhase("Phase 4: PR Management");
		log.info("🔄 Managing pull request...");

		const prStartTime = Date.now();
		if (existingPR) {
			// Update existing PR
			log.startOperation("Updating existing PR");
			await prManager.updateExistingPR(existingPR, updateSummary);
			outputs.pr_number = existingPR.number;
			outputs.pr_updated = true;
			log.success(`Updated existing PR #${existingPR.number}`);
			log.endOperation();
		} else {
			// Create new PR
			log.startOperation("Creating new PR");
			const branchName = await prManager.getOrCreateUpdateBranch(
				updateSummary.updates,
			);
			log.debug("Branch created/selected", { branchName });

			const prNumber = await prManager.createUpdatePR(
				updateSummary,
				branchName,
			);
			outputs.pr_number = prNumber;
			outputs.pr_updated = false;
			log.success(`Created new PR #${prNumber} on branch ${branchName}`);
			log.endOperation();
		}
		log.timing("PR management", prStartTime);
		log.endPhase();

		// Set final outputs
		setActionOutputs(outputs);

		// Log final summary
		log.actionSummary({
			totalUpdates: updateSummary.totalUpdates,
			prNumber: outputs.pr_number,
			prUpdated: outputs.pr_updated,
			existingPrFound: outputs.existing_pr_found,
			hasErrors: false,
		});

		log.timing("Total execution time", startTime);
		log.success("Devbox updater completed successfully!");
	} catch (error) {
		// Handle errors with proper classification and reporting
		const errorInfo = errorHandler.handleError(
			error,
			"Main workflow execution",
		);
		const userFriendlyMessage =
			errorHandler.createUserFriendlyMessage(errorInfo);

		log.error(`Action failed: ${userFriendlyMessage}`);
		core.setFailed(`Action failed: ${userFriendlyMessage}`);
		outputs.error_message = userFriendlyMessage;
		setActionOutputs(outputs);

		// Log additional diagnostic information
		log.error("Error details", {
			category: errorInfo.category,
			code: errorInfo.code,
			severity: errorInfo.severity,
			retryable: errorInfo.retryable,
			context: errorInfo.context,
		});

		// Log final summary with error
		log.actionSummary({
			totalUpdates: 0,
			prNumber: outputs.pr_number,
			prUpdated: outputs.pr_updated,
			existingPrFound: outputs.existing_pr_found,
			hasErrors: true,
		});

		log.timing("Total execution time (with error)", startTime);
	}
}

/**
 * Set GitHub Action outputs
 * Implements requirement 4.4: Clear logging and output
 */
function setActionOutputs(outputs: ActionOutputs): void {
	log.startOperation("Setting action outputs");

	core.setOutput("changes", outputs.changes);
	core.setOutput("update-summary", outputs.update_summary);

	if (outputs.pr_number !== undefined) {
		core.setOutput("pr-number", outputs.pr_number);
	}

	core.setOutput("pr-updated", outputs.pr_updated);
	core.setOutput("existing-pr-found", outputs.existing_pr_found);

	if (outputs.error_message) {
		core.setOutput("error-message", outputs.error_message);
	}

	log.debug("Action outputs set", {
		changes: outputs.changes,
		update_summary: outputs.update_summary,
		pr_number: outputs.pr_number?.toString(),
		pr_updated: outputs.pr_updated,
		existing_pr_found: outputs.existing_pr_found,
		error_message: outputs.error_message,
	});
	log.endOperation();
}

/**
 * Validate action configuration
 * Ensures all required inputs are properly configured
 */
function validateConfig(config: ActionConfig): void {
	log.startOperation("Validating configuration");

	if (!config.token) {
		throw new Error("GitHub token is required but not provided");
	}

	if (config.maxRetries < 0 || config.maxRetries > 10) {
		throw new Error("Max retries must be between 0 and 10");
	}

	if (!config.branchPrefix || config.branchPrefix.trim().length === 0) {
		throw new Error("Branch prefix cannot be empty");
	}

	log.debug("Configuration validation passed");
	log.endOperation();
}

// Execute the action
if (require.main === module) {
	run();
}

export { run };
