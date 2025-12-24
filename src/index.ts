/**
 * Main entry point for the Devbox Updater GitHub Action
 */

import * as core from '@actions/core';
import { ActionConfig } from './types';

/**
 * Main action execution function
 */
async function run(): Promise<void> {
  try {
    // Get action inputs
    const config: ActionConfig = {
      token: core.getInput('token', { required: true }),
      devboxVersion: core.getInput('devbox-version') || 'latest',
      branchPrefix: core.getInput('branch-prefix') || 'devbox-updates',
      prTitle: core.getInput('pr-title') || 'Update Devbox packages',
      maxRetries: parseInt(core.getInput('max-retries') || '3', 10)
    };

    core.info('Starting Devbox package updater...');
    core.info(`Configuration: ${JSON.stringify(config, null, 2)}`);

    // TODO: Implement main action logic in subsequent tasks
    // This will be implemented in later tasks according to the implementation plan

    // Set default outputs for now
    core.setOutput('changes', false);
    core.setOutput('update-summary', 'No updates processed yet - implementation pending');
    core.setOutput('pr-updated', false);
    core.setOutput('existing-pr-found', false);

    core.info('Devbox updater completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
    core.setOutput('error-message', errorMessage);
  }
}

// Execute the action
if (require.main === module) {
  run();
}

export { run };