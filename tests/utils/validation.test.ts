/**
 * Tests for validation utilities
 */

import { ValidationError } from "../../src/types";
import {
	parseDevboxConfig,
	validateDevboxConfig,
	validateForSerialization,
	validatePackageName,
	validateVersion,
} from "../../src/utils/validation";

describe("validateDevboxConfig", () => {
	test("validates valid configuration", () => {
		const validConfig = {
			packages: ["nodejs", "python@3.9"],
		};

		expect(() => validateDevboxConfig(validConfig)).not.toThrow();
	});

	test("throws for non-object input", () => {
		expect(() => validateDevboxConfig(null)).toThrow(ValidationError);
		expect(() => validateDevboxConfig("string")).toThrow(ValidationError);
		expect(() => validateDevboxConfig(123)).toThrow(ValidationError);
	});

	test("throws for missing packages array", () => {
		expect(() => validateDevboxConfig({})).toThrow(ValidationError);
		expect(() => validateDevboxConfig({ packages: "not-array" })).toThrow(
			ValidationError,
		);
	});

	test("throws for empty packages array", () => {
		expect(() => validateDevboxConfig({ packages: [] })).toThrow(
			ValidationError,
		);
	});

	test("validates optional shell configuration", () => {
		const configWithShell = {
			packages: ["nodejs"],
			shell: {
				init_hook: ['echo "hello"'],
				scripts: {
					test: "npm test",
					build: ["npm run build", "npm run package"],
				},
			},
		};

		expect(() => validateDevboxConfig(configWithShell)).not.toThrow();
	});

	test("validates optional nixpkgs configuration", () => {
		const configWithNixpkgs = {
			packages: ["nodejs"],
			nixpkgs: {
				commit: "abc123def456",
			},
		};

		expect(() => validateDevboxConfig(configWithNixpkgs)).not.toThrow();
	});
});

describe("parseDevboxConfig", () => {
	test("parses valid JSON configuration", () => {
		const jsonString = '{"packages": ["nodejs", "python"]}';
		const result = parseDevboxConfig(jsonString);

		expect(result).toEqual({
			packages: ["nodejs", "python"],
		});
	});

	test("throws for invalid JSON", () => {
		expect(() => parseDevboxConfig("invalid json")).toThrow(ValidationError);
		expect(() => parseDevboxConfig('{"packages": [}')).toThrow(ValidationError);
	});
});

describe("validatePackageName", () => {
	test("validates valid package names", () => {
		expect(() => validatePackageName("nodejs")).not.toThrow();
		expect(() => validatePackageName("python-3")).not.toThrow();
		expect(() => validatePackageName("package_name")).not.toThrow();
	});

	test("throws for invalid package names", () => {
		expect(() => validatePackageName("")).toThrow(ValidationError);
		expect(() => validatePackageName("  ")).toThrow(ValidationError);
		expect(() => validatePackageName("package with spaces")).toThrow(
			ValidationError,
		);
	});
});

describe("validateVersion", () => {
	test("validates valid versions", () => {
		expect(() => validateVersion("1.0.0")).not.toThrow();
		expect(() => validateVersion("2.1.3-beta")).not.toThrow();
		expect(() => validateVersion("latest")).not.toThrow();
	});

	test("throws for invalid versions", () => {
		expect(() => validateVersion("")).toThrow(ValidationError);
		expect(() => validateVersion("  ")).toThrow(ValidationError);
	});
});

describe("validateForSerialization", () => {
	test("validates serializable configuration", () => {
		const config = {
			packages: ["nodejs", "python"],
		};

		expect(() => validateForSerialization(config)).not.toThrow();
	});
});
