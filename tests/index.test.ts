/**
 * Tests for the main action entry point
 */

import * as core from "@actions/core";
import { run } from "../src/index";

// Mock the core module
jest.mock("@actions/core");
const mockCore = core as jest.Mocked<typeof core>;

describe("Main Action", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should execute without errors with valid inputs", async () => {
		// Mock action inputs
		mockCore.getInput.mockImplementation((name: string) => {
			switch (name) {
				case "token":
					return "test-token";
				case "devbox-version":
					return "latest";
				case "branch-prefix":
					return "devbox-updates";
				case "pr-title":
					return "Update Devbox packages";
				case "max-retries":
					return "3";
				case "update-latest":
					return "false";
				default:
					return "";
			}
		});

		await run();

		expect(mockCore.info).toHaveBeenCalledWith(
			expect.stringContaining("Starting Devbox package updater"),
		);
		expect(mockCore.info).toHaveBeenCalledWith(
			expect.stringContaining("All packages are up to date"),
		);
		expect(mockCore.setOutput).toHaveBeenCalledWith("changes", false);
		expect(mockCore.setOutput).toHaveBeenCalledWith(
			"update-summary",
			expect.stringContaining("All packages are up to date"),
		);
		expect(mockCore.setFailed).not.toHaveBeenCalled();
	});

	it("should handle missing required token input", async () => {
		mockCore.getInput.mockImplementation((name: string) => {
			if (name === "token") {
				throw new Error("Input required and not supplied: token");
			}
			return "";
		});

		await run();

		expect(mockCore.setFailed).toHaveBeenCalledWith(
			expect.stringContaining("Input required and not supplied: token"),
		);
		expect(mockCore.setOutput).toHaveBeenCalledWith(
			"error-message",
			expect.stringContaining("Input required and not supplied: token"),
		);
	});

	it("should use default values for optional inputs", async () => {
		mockCore.getInput.mockImplementation((name: string) => {
			switch (name) {
				case "token":
					return "test-token";
				default:
					return ""; // Return empty string for optional inputs
			}
		});

		await run();

		// Check that the action runs successfully with defaults
		expect(mockCore.info).toHaveBeenCalledWith(
			expect.stringContaining("Starting Devbox package updater"),
		);
		expect(mockCore.setFailed).not.toHaveBeenCalled();
	});
});
