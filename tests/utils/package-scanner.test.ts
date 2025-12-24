/**
 * Tests for package scanner functionality
 */

import * as fs from "fs/promises";
import * as path from "path";
import { type DevboxConfig, ValidationError } from "../../src/types";
import {
	createPackageScanner,
	PackageScanner,
} from "../../src/utils/package-scanner";

// Mock the version-query module to avoid actual API calls in tests
jest.mock("../../src/utils/version-query", () => ({
	createVersionQueryService: () => ({
		checkMultiplePackagesForUpdates: jest.fn().mockResolvedValue([]),
		checkForUpdates: jest.fn().mockResolvedValue({
			packageName: "test-package",
			currentVersion: "1.0.0",
			latestVersion: "1.1.0",
			updateAvailable: true,
		}),
	}),
}));

describe("PackageScanner", () => {
	const testConfigPath = path.join(__dirname, "../fixtures/test-devbox.json");
	const validConfig: DevboxConfig = {
		packages: ["nodejs@18", "python@3.11", "git"],
		shell: {
			init_hook: ['echo "Hello World"'],
		},
	};

	beforeEach(async () => {
		// Create test config file
		await fs.writeFile(testConfigPath, JSON.stringify(validConfig, null, 2));
	});

	afterEach(async () => {
		// Clean up test files
		try {
			await fs.unlink(testConfigPath);
		} catch {
			// Ignore if file doesn't exist
		}
	});

	describe("constructor", () => {
		it("should create scanner with default config path", () => {
			const scanner = new PackageScanner();
			expect(scanner.getConfigPath()).toContain("devbox.json");
		});

		it("should create scanner with custom config path", () => {
			const scanner = new PackageScanner(testConfigPath);
			expect(scanner.getConfigPath()).toBe(path.resolve(testConfigPath));
		});
	});

	describe("loadDevboxConfig", () => {
		it("should load valid devbox.json", async () => {
			const scanner = new PackageScanner(testConfigPath);
			const config = await scanner.loadDevboxConfig();

			expect(config).toEqual(validConfig);
		});

		it("should throw ValidationError for non-existent file", async () => {
			const scanner = new PackageScanner("non-existent.json");

			await expect(scanner.loadDevboxConfig()).rejects.toThrow(ValidationError);
		});

		it("should throw ValidationError for invalid JSON", async () => {
			const invalidJsonPath = path.join(__dirname, "../fixtures/invalid.json");
			await fs.writeFile(invalidJsonPath, "{ invalid json }");

			const scanner = new PackageScanner(invalidJsonPath);

			await expect(scanner.loadDevboxConfig()).rejects.toThrow(ValidationError);

			// Clean up
			await fs.unlink(invalidJsonPath);
		});
	});

	describe("extractPackages", () => {
		it("should extract packages from valid config", () => {
			const scanner = new PackageScanner();
			const packages = scanner.extractPackages(validConfig);

			expect(packages).toHaveLength(3);
			expect(packages[0]).toEqual({
				name: "nodejs",
				version: "18",
				fullSpec: "nodejs@18",
			});
			expect(packages[1]).toEqual({
				name: "python",
				version: "3.11",
				fullSpec: "python@3.11",
			});
			expect(packages[2]).toEqual({
				name: "git",
				version: undefined,
				fullSpec: "git",
			});
		});

		it("should return empty array for config without packages", () => {
			const scanner = new PackageScanner();
			const emptyConfig: DevboxConfig = { packages: [] };
			const packages = scanner.extractPackages(emptyConfig);

			expect(packages).toEqual([]);
		});
	});

	describe("scanPackages", () => {
		it("should scan and parse packages from file", async () => {
			const scanner = new PackageScanner(testConfigPath);
			const packages = await scanner.scanPackages();

			expect(packages).toHaveLength(3);
			expect(packages.map((p) => p.name)).toEqual(["nodejs", "python", "git"]);
		});
	});

	describe("configExists", () => {
		it("should return true for existing config", async () => {
			const scanner = new PackageScanner(testConfigPath);
			const exists = await scanner.configExists();

			expect(exists).toBe(true);
		});

		it("should return false for non-existent config", async () => {
			const scanner = new PackageScanner("non-existent.json");
			const exists = await scanner.configExists();

			expect(exists).toBe(false);
		});
	});

	describe("getPackageCount", () => {
		it("should return correct package count", async () => {
			const scanner = new PackageScanner(testConfigPath);
			const count = await scanner.getPackageCount();

			expect(count).toBe(3);
		});

		it("should return 0 for non-existent config", async () => {
			const scanner = new PackageScanner("non-existent.json");
			const count = await scanner.getPackageCount();

			expect(count).toBe(0);
		});
	});

	describe("package filtering", () => {
		const packages = [
			{ name: "nodejs", version: "18", fullSpec: "nodejs@18" },
			{ name: "python", version: "3.11", fullSpec: "python@3.11" },
			{ name: "git", version: undefined, fullSpec: "git" },
		];

		it("should filter packages by pattern", () => {
			const scanner = new PackageScanner();
			const filtered = scanner.filterPackagesByPattern(packages, /^node/);

			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe("nodejs");
		});

		it("should get packages with versions", () => {
			const scanner = new PackageScanner();
			const withVersions = scanner.getPackagesWithVersions(packages);

			expect(withVersions).toHaveLength(2);
			expect(withVersions.map((p) => p.name)).toEqual(["nodejs", "python"]);
		});

		it("should get packages without versions", () => {
			const scanner = new PackageScanner();
			const withoutVersions = scanner.getPackagesWithoutVersions(packages);

			expect(withoutVersions).toHaveLength(1);
			expect(withoutVersions[0].name).toBe("git");
		});
	});

	describe("createPackageScanner", () => {
		it("should create scanner with default path", () => {
			const scanner = createPackageScanner();
			expect(scanner).toBeInstanceOf(PackageScanner);
		});

		it("should create scanner with custom path", () => {
			const scanner = createPackageScanner(testConfigPath);
			expect(scanner.getConfigPath()).toBe(path.resolve(testConfigPath));
		});
	});
});
