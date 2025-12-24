/**
 * Tests for Pull Request Manager Component
 */

import type { UpdateCandidate } from "../../src/types";
import { PullRequestManager } from "../../src/utils/pr-manager";

// Mock GitHub Actions modules
jest.mock("@actions/core");
jest.mock("@actions/github", () => ({
	getOctokit: jest.fn(),
	context: {
		repo: {
			owner: "test-owner",
			repo: "test-repo",
		},
	},
}));

describe("PullRequestManager", () => {
	let prManager: PullRequestManager;
	let mockOctokit: any;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Mock octokit
		mockOctokit = {
			rest: {
				pulls: {
					list: jest.fn(),
					get: jest.fn(),
					create: jest.fn(),
					update: jest.fn(),
				},
				repos: {
					getBranch: jest.fn(),
					get: jest.fn(),
				},
				git: {
					createRef: jest.fn(),
					deleteRef: jest.fn(),
				},
			},
		};

		// Mock getOctokit to return our mock
		const { getOctokit } = require("@actions/github");
		getOctokit.mockReturnValue(mockOctokit);

		prManager = new PullRequestManager("fake-token");
	});

	describe("Branch Management", () => {
		test("generateBranchName creates Renovate-style branch names for single package", () => {
			const updates: UpdateCandidate[] = [
				{
					packageName: "nodejs",
					currentVersion: "18.0.0",
					latestVersion: "20.0.0",
					updateAvailable: true,
				},
			];

			const branchName = prManager.generateBranchName(updates);
			expect(branchName).toBe("devbox/nodejs-20-0-0");
		});

		test("generateBranchName handles latest versions correctly", () => {
			const updates: UpdateCandidate[] = [
				{
					packageName: "biome@latest",
					currentVersion: "2.2.0",
					latestVersion: "2.3.9", // This is the resolved latest version
					updateAvailable: true,
				},
			];

			const branchName = prManager.generateBranchName(updates);
			expect(branchName).toBe("devbox/biome-2-3-9");
		});

		test("generateBranchName creates multi-package branch names", () => {
			const updates: UpdateCandidate[] = [
				{
					packageName: "nodejs",
					currentVersion: "18.0.0",
					latestVersion: "20.0.0",
					updateAvailable: true,
				},
				{
					packageName: "python",
					currentVersion: "3.9.0",
					latestVersion: "3.10.0",
					updateAvailable: true,
				},
			];

			const branchName = prManager.generateBranchName(updates);
			expect(branchName).toBe("devbox/multi-package-updates");
		});

		test("generatePackageBranchName sanitizes package names and versions", () => {
			// Test with @ symbol and dots in version
			expect(prManager.generatePackageBranchName("biome@2.3.9", "2.3.9")).toBe(
				"devbox/biome-2-3-9",
			);

			// Test with complex package name
			expect(
				prManager.generatePackageBranchName(
					"github.com/go-git/go-git/v5",
					"5.x",
				),
			).toBe("devbox/github-com-go-git-go-git-v5-5-x");

			// Test simple package
			expect(prManager.generatePackageBranchName("nodejs", "20.0.0")).toBe(
				"devbox/nodejs-20-0-0",
			);
		});

		test("generatePackageBranchName handles latest versions", () => {
			// Test with resolved latest version
			expect(
				prManager.generatePackageBranchName("biome", "latest", "2.3.9"),
			).toBe("devbox/biome-2-3-9");

			// Test with unresolved latest version (should add date)
			const branchName = prManager.generatePackageBranchName(
				"nodejs",
				"latest",
			);
			expect(branchName).toMatch(/^devbox\/nodejs-latest-\d{4}-\d{2}-\d{2}$/);

			// Test case insensitive
			expect(
				prManager.generatePackageBranchName("python", "LATEST", "3.12.0"),
			).toBe("devbox/python-3-12-0");
		});

		test("generateUniqueBranchName creates valid branch names", () => {
			const branchName = prManager.generateUniqueBranchName("nodejs");

			expect(branchName).toMatch(
				/^devbox\/nodejs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/,
			);
			expect(branchName.startsWith("devbox/nodejs-")).toBe(true);
		});

		test("generateUniqueBranchName without package name", () => {
			const branchName = prManager.generateUniqueBranchName();

			expect(branchName).toMatch(
				/^devbox\/updates-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/,
			);
			expect(branchName.startsWith("devbox/updates-")).toBe(true);
		});

		test("groupUpdatesForPRs creates separate groups in single package mode", () => {
			const updates: UpdateCandidate[] = [
				{
					packageName: "nodejs",
					currentVersion: "18.0.0",
					latestVersion: "20.0.0",
					updateAvailable: true,
				},
				{
					packageName: "python",
					currentVersion: "3.9.0",
					latestVersion: "3.10.0",
					updateAvailable: true,
				},
			];

			const groups = prManager.groupUpdatesForPRs(updates);
			expect(groups).toHaveLength(2);
			expect(groups[0]).toHaveLength(1);
			expect(groups[1]).toHaveLength(1);
			expect(groups[0][0].packageName).toBe("nodejs");
			expect(groups[1][0].packageName).toBe("python");
		});

		test("groupUpdatesForPRs creates single group in multi-package mode", () => {
			const multiPackagePRManager = new PullRequestManager(
				"fake-token",
				"devbox",
				false,
			);
			const updates: UpdateCandidate[] = [
				{
					packageName: "nodejs",
					currentVersion: "18.0.0",
					latestVersion: "20.0.0",
					updateAvailable: true,
				},
				{
					packageName: "python",
					currentVersion: "3.9.0",
					latestVersion: "3.10.0",
					updateAvailable: true,
				},
			];

			const groups = multiPackagePRManager.groupUpdatesForPRs(updates);
			expect(groups).toHaveLength(1);
			expect(groups[0]).toHaveLength(2);
		});

		test("validateBranchName validates branch names correctly", () => {
			// Valid branch names
			expect(prManager.validateBranchName("devbox/nodejs-20.0.0")).toBe(true);
			expect(
				prManager.validateBranchName("devbox/multi-package-updates-2024-01-15"),
			).toBe(true);
			expect(prManager.validateBranchName("feature/update-packages")).toBe(
				true,
			);
			expect(prManager.validateBranchName("main")).toBe(true);

			// Invalid branch names
			expect(prManager.validateBranchName("")).toBe(false);
			expect(prManager.validateBranchName("/invalid-start")).toBe(false);
			expect(prManager.validateBranchName("invalid-end/")).toBe(false);
			expect(prManager.validateBranchName("invalid//double-slash")).toBe(false);
			expect(prManager.validateBranchName("invalid.lock")).toBe(false);
			expect(prManager.validateBranchName("invalid space")).toBe(false);
			expect(prManager.validateBranchName("invalid~tilde")).toBe(false);
			expect(prManager.validateBranchName("invalid:colon")).toBe(false);
		});

		test("branchExists checks if branch exists", async () => {
			mockOctokit.rest.repos.getBranch.mockResolvedValue({
				data: { name: "existing-branch" },
			});

			const exists = await prManager.branchExists("existing-branch");
			expect(exists).toBe(true);
			expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
				owner: "test-owner",
				repo: "test-repo",
				branch: "existing-branch",
			});
		});

		test("branchExists returns false for non-existent branch", async () => {
			mockOctokit.rest.repos.getBranch.mockRejectedValue(
				new Error("Not found"),
			);

			const exists = await prManager.branchExists("non-existent-branch");
			expect(exists).toBe(false);
		});
	});

	describe("PR Description Formatting", () => {
		test("formatChangeDescription formats updates correctly", () => {
			const updates: UpdateCandidate[] = [
				{
					packageName: "nodejs",
					currentVersion: "18.0.0",
					latestVersion: "20.0.0",
					updateAvailable: true,
				},
				{
					packageName: "python",
					currentVersion: "3.9.0",
					latestVersion: "3.9.1",
					updateAvailable: true,
				},
			];

			const description = prManager.formatChangeDescription(updates);

			expect(description).toContain("## 📦 Devbox Package Updates");
			expect(description).toContain("nodejs");
			expect(description).toContain("18.0.0");
			expect(description).toContain("20.0.0");
			expect(description).toContain("python");
			expect(description).toContain("3.9.0");
			expect(description).toContain("3.9.1");
			expect(description).toContain(
				"🤖 This pull request was automatically generated",
			);
		});

		test("formatChangeDescription handles empty updates", () => {
			const description = prManager.formatChangeDescription([]);
			expect(description).toBe("No package updates available.");
		});

		test("formatChangeDescription categorizes updates by version type", () => {
			const updates: UpdateCandidate[] = [
				{
					packageName: "major-update",
					currentVersion: "1.0.0",
					latestVersion: "2.0.0",
					updateAvailable: true,
				},
				{
					packageName: "minor-update",
					currentVersion: "1.0.0",
					latestVersion: "1.1.0",
					updateAvailable: true,
				},
				{
					packageName: "patch-update",
					currentVersion: "1.0.0",
					latestVersion: "1.0.1",
					updateAvailable: true,
				},
			];

			const description = prManager.formatChangeDescription(updates);

			expect(description).toContain("### 🚨 Major Updates");
			expect(description).toContain("major-update");
			expect(description).toContain("### ✨ Minor Updates");
			expect(description).toContain("minor-update");
			expect(description).toContain("### 🐛 Patch Updates");
			expect(description).toContain("patch-update");
		});
	});

	describe("PR Detection", () => {
		test("checkExistingPR finds existing PRs by new branch format", async () => {
			const mockPR = {
				number: 123,
				title: "Update nodejs to 20.0.0",
				body: "Test PR body",
				state: "open",
				updated_at: "2024-01-15T10:30:00Z",
				head: { ref: "devbox/nodejs-20.0.0" },
			};

			mockOctokit.rest.pulls.list.mockResolvedValue({
				data: [mockPR],
			});

			const existingPR = await prManager.checkExistingPR();

			expect(existingPR).toEqual({
				number: 123,
				branch: "devbox/nodejs-20.0.0",
				title: "Update nodejs to 20.0.0",
				body: "Test PR body",
				state: "open",
				updatedAt: "2024-01-15T10:30:00Z",
			});
		});

		test("checkExistingPR finds existing PRs by old branch format (backward compatibility)", async () => {
			const mockPR = {
				number: 124,
				title: "Update Devbox packages",
				body: "Test PR body",
				state: "open",
				updated_at: "2024-01-15T10:30:00Z",
				head: { ref: "devbox-updates-2024-01-15" },
			};

			mockOctokit.rest.pulls.list.mockResolvedValue({
				data: [mockPR],
			});

			const existingPR = await prManager.checkExistingPR();

			expect(existingPR).toEqual({
				number: 124,
				branch: "devbox-updates-2024-01-15",
				title: "Update Devbox packages",
				body: "Test PR body",
				state: "open",
				updatedAt: "2024-01-15T10:30:00Z",
			});
		});

		test("checkExistingPR returns null when no PRs found", async () => {
			mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });

			const existingPR = await prManager.checkExistingPR();
			expect(existingPR).toBeNull();
		});
	});

	describe("Default Branch", () => {
		test("getDefaultBranch returns repository default branch", async () => {
			mockOctokit.rest.repos.get.mockResolvedValue({
				data: { default_branch: "main" },
			});

			const defaultBranch = await prManager.getDefaultBranch();
			expect(defaultBranch).toBe("main");
		});

		test("getDefaultBranch falls back to main on error", async () => {
			mockOctokit.rest.repos.get.mockRejectedValue(new Error("API Error"));

			const defaultBranch = await prManager.getDefaultBranch();
			expect(defaultBranch).toBe("main");
		});
	});
});
