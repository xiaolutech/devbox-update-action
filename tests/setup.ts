/**
 * Jest test setup configuration
 */

// Set test timeout
jest.setTimeout(30000);

// Mock GitHub Actions core module for testing
jest.mock("@actions/core", () => ({
	info: jest.fn(),
	warning: jest.fn(),
	error: jest.fn(),
	setFailed: jest.fn(),
	setOutput: jest.fn(),
	getInput: jest.fn(),
	debug: jest.fn(),
	startGroup: jest.fn(),
	endGroup: jest.fn(),
	summary: {
		addHeading: jest.fn(),
		addRaw: jest.fn(),
		write: jest.fn(),
	},
}));

// Mock GitHub Actions github module for testing
jest.mock("@actions/github", () => ({
	context: {
		repo: {
			owner: "test-owner",
			repo: "test-repo",
		},
		sha: "test-sha",
		ref: "refs/heads/main",
	},
	getOctokit: jest.fn(),
}));

// Mock exec module for testing
jest.mock("@actions/exec", () => ({
	exec: jest.fn(),
	getExecOutput: jest.fn(),
}));

// Global test utilities
global.console = {
	...console,
	// Suppress console.log in tests unless explicitly needed
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};
