# Devbox Updater Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix production-breaking PR workflow bugs and contract mismatches so this action never pushes package updates to the wrong branch, always targets the repo default branch, and only exposes inputs/outputs that actually work.

**Architecture:** Keep the existing Phase 1–5 orchestration in `src/index.ts`. Concentrate correctness in three seams: (1) `PullRequestManager` owns branch/PR base resolution and existing-PR detection; (2) `FileManager` owns file mutation and safe git/devbox process execution; (3) `action.yml` + examples document only implemented contracts. Prefer argv-based process execution over shell string interpolation. Do not expand into object-form packages or multi-PR-per-package in this plan (YAGNI for later work).

**Tech Stack:** TypeScript, Node 20 (`runs.using`), Jest + ts-jest, `@actions/core` / `@actions/exec` / `@actions/github`, ncc bundle to `dist/`.

**Spec source:** Code review findings in session (P0–P1). Out of scope for this plan: packages object-map support, full multi-PR grouping productization, semver library replacement, API concurrency pool.

---

## File map

| File | Responsibility after this plan |
|------|--------------------------------|
| `src/index.ts` | Always check out the target update branch before apply/commit/push; pass default-branch-aware PR manager usage |
| `src/utils/pr-manager.ts` | Resolve default base branch; create branch/PR against it; detect existing PRs by branch prefix only; expose `ensureOnBranch` |
| `src/utils/file-manager.ts` | Safe argv exec for git/devbox; cleanup backup after success; commit message via `-m` without shell quoting bugs |
| `src/types/index.ts` | Keep `ActionConfig` aligned with truly used inputs (no phantom fields required) |
| `action.yml` | Remove or clearly mark unimplemented inputs/outputs; align defaults with code |
| `package.json` | Align `engines.node` with `node20` action runtime |
| `examples/*.yml` | Working minimal workflow: checkout + install devbox + write permissions |
| `README.md` | Document only real inputs/outputs and the existing-PR branch behavior |
| `tests/utils/pr-manager.test.ts` | Default base branch, tighter PR match, create PR/branch base |
| `tests/utils/file-manager.test.ts` | Safe exec / commit message path coverage where mockable |
| `tests/index.test.ts` | Existing-PR path checks out PR branch before apply |

---

### Task 1: Default base branch for createBranch + createUpdatePR

**Files:**
- Modify: `src/utils/pr-manager.ts`
- Test: `tests/utils/pr-manager.test.ts`

- [ ] **Step 1: Write failing tests for default-branch usage**

Append to `tests/utils/pr-manager.test.ts` inside `describe("Default Branch")` (or a new `describe("PR Creation")`):

```typescript
test("createBranch uses repository default branch when base not provided", async () => {
	mockOctokit.rest.repos.get.mockResolvedValue({
		data: { default_branch: "develop" },
	});
	mockOctokit.rest.repos.getBranch.mockResolvedValue({
		data: { commit: { sha: "abc123" } },
	});
	mockOctokit.rest.git.createRef.mockResolvedValue({});

	await prManager.createBranch("devbox/nodejs-20-0-0");

	expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
		owner: "test-owner",
		repo: "test-repo",
		branch: "develop",
	});
	expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
		owner: "test-owner",
		repo: "test-repo",
		ref: "refs/heads/devbox/nodejs-20-0-0",
		sha: "abc123",
	});
});

test("createUpdatePR uses repository default branch as base", async () => {
	mockOctokit.rest.repos.get.mockResolvedValue({
		data: { default_branch: "develop" },
	});
	mockOctokit.rest.pulls.create.mockResolvedValue({
		data: { number: 42 },
	});

	const summary = {
		totalUpdates: 1,
		hasChanges: true,
		summary: "one update",
		updates: [
			{
				packageName: "nodejs",
				currentVersion: "18.0.0",
				latestVersion: "20.0.0",
				updateAvailable: true,
			},
		],
	};

	const prNumber = await prManager.createUpdatePR(
		summary,
		"devbox/nodejs-20-0-0",
	);

	expect(prNumber).toBe(42);
	expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith(
		expect.objectContaining({
			base: "develop",
			head: "devbox/nodejs-20-0-0",
		}),
	);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/utils/pr-manager.test.ts -t "createBranch uses repository default|createUpdatePR uses repository default"`

Expected: FAIL because `createBranch` defaults to `"main"` and `createUpdatePR` hardcodes `base: "main"`.

- [ ] **Step 3: Implement default-branch resolution**

In `src/utils/pr-manager.ts`:

1. Change `createBranch` signature so the second argument is optional and resolved via `getDefaultBranch()`:

```typescript
async createBranch(branchName: string, baseBranch?: string): Promise<void> {
	const resolvedBase = baseBranch ?? (await this.getDefaultBranch());
	try {
		core.info(`Creating branch: ${branchName} from ${resolvedBase}`);

		const { data: baseRef } = await this.octokit.rest.repos.getBranch({
			owner: this.owner,
			repo: this.repo,
			branch: resolvedBase,
		});

		await this.octokit.rest.git.createRef({
			owner: this.owner,
			repo: this.repo,
			ref: `refs/heads/${branchName}`,
			sha: baseRef.commit.sha,
		});

		core.info(`Successfully created branch: ${branchName}`);
	} catch (error) {
		const githubError = new GitHubError(
			`Failed to create branch ${branchName}: ${error instanceof Error ? error.message : "Unknown error"}`,
			{ error, branchName, baseBranch: resolvedBase },
		);
		core.error(githubError.message);
		throw githubError;
	}
}
```

2. Change `createUpdatePR` to resolve base the same way:

```typescript
async createUpdatePR(
	summary: UpdateSummary,
	branchName: string,
): Promise<number> {
	try {
		core.info(
			`Creating pull request for ${summary.totalUpdates} package updates...`,
		);

		const title = this.generatePRTitle(summary);
		const body = this.formatChangeDescription(summary.updates);
		const base = await this.getDefaultBranch();

		const { data: pr } = await this.octokit.rest.pulls.create({
			owner: this.owner,
			repo: this.repo,
			title,
			body,
			head: branchName,
			base,
		});

		core.info(`Created pull request #${pr.number}: ${title}`);
		return pr.number;
	} catch (error) {
		const githubError = new GitHubError(
			`Failed to create pull request: ${error instanceof Error ? error.message : "Unknown error"}`,
			{ error, summary, branchName },
		);
		core.error(githubError.message);
		throw githubError;
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/utils/pr-manager.test.ts -t "createBranch uses repository default|createUpdatePR uses repository default|getDefaultBranch"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/pr-manager.ts tests/utils/pr-manager.test.ts
git commit -m "$(cat <<'EOF'
fix: use repository default branch for branch and PR creation

Hardcoding main breaks repos whose default branch is master/develop.
EOF
)"
```

---

### Task 2: Tighten existing-PR detection (branch prefix only)

**Files:**
- Modify: `src/utils/pr-manager.ts` (`checkExistingPR`)
- Test: `tests/utils/pr-manager.test.ts`

- [ ] **Step 1: Write failing tests**

Add under `describe("PR Detection")`:

```typescript
test("checkExistingPR ignores title-only matches without branch prefix", async () => {
	mockOctokit.rest.pulls.list.mockResolvedValue({
		data: [
			{
				number: 7,
				title: "Update Devbox docs manually",
				body: "human pr",
				state: "open",
				updated_at: "2026-01-02T00:00:00Z",
				head: { ref: "docs/devbox-update-notes" },
			},
		],
	});

	const existingPR = await prManager.checkExistingPR();
	expect(existingPR).toBeNull();
});

test("checkExistingPR still matches branch prefix format", async () => {
	mockOctokit.rest.pulls.list.mockResolvedValue({
		data: [
			{
				number: 9,
				title: "chore: update nodejs",
				body: "",
				state: "open",
				updated_at: "2026-01-02T00:00:00Z",
				head: { ref: "devbox/nodejs-20-0-0" },
			},
		],
	});

	const existingPR = await prManager.checkExistingPR();
	expect(existingPR?.number).toBe(9);
	expect(existingPR?.branch).toBe("devbox/nodejs-20-0-0");
});
```

Note: constructor default `branchPrefix` is `"devbox"`, so tests use that prefix. If a test constructs `new PullRequestManager("tok", "devbox-updates")`, match that prefix instead.

- [ ] **Step 2: Run tests to verify fail/pass baseline**

Run: `npm test -- tests/utils/pr-manager.test.ts -t "title-only matches|still matches branch prefix"`

Expected: title-only test FAILS while current filter accepts title keywords.

- [ ] **Step 3: Implement stricter filter**

Replace the filter inside `checkExistingPR` with:

```typescript
const devboxPRs = pullRequests.filter((pr) => {
	const branchName = pr.head.ref;
	return (
		branchName.startsWith(`${this.branchPrefix}/`) ||
		branchName.startsWith(`${this.branchPrefix}-`)
	);
});
```

Remove title-based matching entirely.

- [ ] **Step 4: Run PR detection suite**

Run: `npm test -- tests/utils/pr-manager.test.ts -t "PR Detection"`

Expected: all PASS (update any existing tests that relied on title-only matching).

- [ ] **Step 5: Commit**

```bash
git add src/utils/pr-manager.ts tests/utils/pr-manager.test.ts
git commit -m "$(cat <<'EOF'
fix: match existing update PRs by branch prefix only

Title keyword matching can attach updates to unrelated human PRs.
EOF
)"
```

---

### Task 3: Always land commits on the update branch (existing-PR path)

**Files:**
- Modify: `src/utils/pr-manager.ts` (make branch switch public or add `ensureWorkingBranch`)
- Modify: `src/index.ts`
- Test: `tests/index.test.ts` (or new focused orchestration test)

- [ ] **Step 1: Expose a public ensure-on-branch API**

In `src/utils/pr-manager.ts`, rename/promote private `switchToBranch` to public:

```typescript
/**
 * Ensure the local checkout is on the given branch (fetch + checkout).
 * Required before applying file updates so commits land on the PR head,
 * not the default branch from actions/checkout.
 */
async ensureOnBranch(branchName: string): Promise<void> {
	// Move existing switchToBranch body here unchanged, then:
	// keep private switchToBranch as a thin alias if needed, or replace call sites.
	await this.switchToBranch(branchName);
}
```

Prefer making `switchToBranch` itself `public async switchToBranch(...)` and call that from `index.ts` — fewer renames if all internal call sites already use it.

- [ ] **Step 2: Write failing orchestration test**

Current `tests/index.test.ts` only covers the no-update path and does not mock FileManager/PR manager deeply. Add a focused unit test by extracting nothing if possible; instead mock modules:

Create/extend `tests/index.test.ts`:

```typescript
jest.mock("../src/utils/package-scanner", () => ({
	createPackageScanner: jest.fn(),
}));
jest.mock("../src/utils/file-manager", () => ({
	FileManager: jest.fn(),
}));
jest.mock("../src/utils/pr-manager", () => ({
	PullRequestManager: jest.fn(),
}));
jest.mock("../src/utils/retry-mechanism", () => ({
	retryWithBackoff: jest.fn((fn: () => unknown) => fn()),
}));

import { createPackageScanner } from "../src/utils/package-scanner";
import { FileManager } from "../src/utils/file-manager";
import { PullRequestManager } from "../src/utils/pr-manager";

// inside describe, after input mocks:
it("checks out existing PR branch before applying updates", async () => {
	const updates = [
		{
			packageName: "nodejs",
			currentVersion: "18.0.0",
			latestVersion: "20.0.0",
			updateAvailable: true,
		},
	];
	const summary = {
		totalUpdates: 1,
		hasChanges: true,
		summary: "1 update",
		updates,
	};

	(createPackageScanner as jest.Mock).mockReturnValue({
		generateUpdateSummary: jest.fn().mockResolvedValue(summary),
	});

	const switchToBranch = jest.fn().mockResolvedValue(undefined);
	const checkExistingPR = jest.fn().mockResolvedValue({
		number: 11,
		branch: "devbox-updates/nodejs-20-0-0",
		title: "old",
		body: "",
		state: "open",
		updatedAt: "2026-01-01T00:00:00Z",
	});
	const updateExistingPR = jest.fn().mockResolvedValue(undefined);
	const getOrCreateUpdateBranch = jest.fn();
	const createUpdatePR = jest.fn();

	(PullRequestManager as unknown as jest.Mock).mockImplementation(() => ({
		checkExistingPR,
		switchToBranch,
		updateExistingPR,
		getOrCreateUpdateBranch,
		createUpdatePR,
	}));

	const applyUpdates = jest.fn().mockResolvedValue({});
	const commitChanges = jest.fn().mockResolvedValue(undefined);
	const pushChanges = jest.fn().mockResolvedValue(undefined);
	(FileManager as unknown as jest.Mock).mockImplementation(() => ({
		applyUpdates,
		commitChanges,
		pushChanges,
	}));

	mockCore.getInput.mockImplementation((name: string) => {
		const map: Record<string, string> = {
			token: "test-token",
			"devbox-version": "latest",
			"branch-prefix": "devbox-updates",
			"pr-title": "Update Devbox packages",
			"max-retries": "3",
			"update-latest": "false",
		};
		return map[name] ?? "";
	});

	await run();

	expect(switchToBranch).toHaveBeenCalledWith(
		"devbox-updates/nodejs-20-0-0",
	);
	// Order: switch before apply
	const switchOrder = switchToBranch.mock.invocationCallOrder[0];
	const applyOrder = applyUpdates.mock.invocationCallOrder[0];
	expect(switchOrder).toBeLessThan(applyOrder);
	expect(getOrCreateUpdateBranch).not.toHaveBeenCalled();
	expect(updateExistingPR).toHaveBeenCalled();
	expect(createUpdatePR).not.toHaveBeenCalled();
});
```

If existing index tests break because of new mocks, gate the heavy mocks only for this test via `jest.doMock` / isolateModules, or split into `tests/index.existing-pr.test.ts` with its own mock setup at top of file.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/index.test.ts -t "checks out existing PR branch"`

Expected: FAIL — `switchToBranch` not called on existing-PR path.

- [ ] **Step 4: Fix orchestration in `src/index.ts`**

Replace Phase 2–4 structure so both paths end on the correct branch before file updates:

```typescript
// Phase 2: Check for existing PRs
const existingPR = await prManager.checkExistingPR();
outputs.existing_pr_found = existingPR !== null;

// Phase 3: Ensure we are on the update branch
log.setPhase("Phase 3: Branch Management");
let branchName: string;
if (existingPR) {
	log.info(
		`📝 Found existing PR #${existingPR.number}: ${existingPR.title}`,
	);
	branchName = existingPR.branch;
	await prManager.switchToBranch(branchName);
	log.success(`Checked out existing PR branch: ${branchName}`);
} else {
	log.info("No existing update PRs found");
	branchName = await prManager.getOrCreateUpdateBranch(updateSummary.updates);
	log.success(`Created/selected branch: ${branchName}`);
}
log.endPhase();

// Phase 4: Apply updates (always on branchName)
log.setPhase("Phase 4: File Updates");
await fileManager.applyUpdates(updateSummary.updates, false);
await fileManager.commitChanges(
	updateSummary.updates.filter((u) => u.updateAvailable),
);
await fileManager.pushChanges();
// ...

// Phase 5
if (existingPR) {
	await prManager.updateExistingPR(existingPR, updateSummary);
	outputs.pr_number = existingPR.number;
	outputs.pr_updated = true;
} else {
	const prNumber = await prManager.createUpdatePR(updateSummary, branchName);
	outputs.pr_number = prNumber;
	outputs.pr_updated = false;
}
```

Also make `switchToBranch` public in `pr-manager.ts` if it is still private.

Optional hardening inside `updateExistingPR`: after title/body update, do not assume commits are present; orchestration already pushed.

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/index.test.ts tests/utils/pr-manager.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/utils/pr-manager.ts tests/index.test.ts tests/index.existing-pr.test.ts 2>/dev/null
git add src/index.ts src/utils/pr-manager.ts tests/
git commit -m "$(cat <<'EOF'
fix: checkout existing PR branch before applying package updates

Prevents commits from being pushed to the default branch when an
open update PR already exists.
EOF
)"
```

---

### Task 4: Safe process execution for git and devbox

**Files:**
- Modify: `src/utils/file-manager.ts`
- Modify: `src/utils/pr-manager.ts` (git fetch/checkout/push)
- Test: `tests/utils/file-manager.test.ts`

- [ ] **Step 1: Write a focused test for commit invocation shape**

If FileManager currently uses `child_process.exec` and is hard to unit-test, introduce a small internal helper or inject exec. Minimal approach:

In `src/utils/file-manager.ts` add:

```typescript
import * as exec from "@actions/exec";

async function runCommand(
	command: string,
	args: string[],
	options: { cwd?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	let stdout = "";
	let stderr = "";
	const exitCode = await exec.exec(command, args, {
		cwd: options.cwd,
		// @actions/exec uses listeners; map timeout if available via Abort — keep simple:
		silent: true,
		ignoreReturnCode: true,
		listeners: {
			stdout: (data: Buffer) => {
				stdout += data.toString();
			},
			stderr: (data: Buffer) => {
				stderr += data.toString();
			},
		},
	});
	if (exitCode !== 0) {
		const error = new Error(
			`Command failed (${exitCode}): ${command} ${args.join(" ")}\n${stderr || stdout}`,
		) as Error & { code?: number; stdout?: string; stderr?: string };
		error.code = exitCode;
		error.stdout = stdout;
		error.stderr = stderr;
		throw error;
	}
	return { stdout, stderr, exitCode };
}
```

Then rewrite critical calls:

```typescript
// commit
await runCommand("git", ["config", "user.name", "github-actions[bot]"]);
await runCommand("git", [
	"config",
	"user.email",
	"github-actions[bot]@users.noreply.github.com",
]);
await runCommand("git", ["add", this.configPath, this.lockPath]);
const { stdout: statusOutput } = await runCommand("git", [
	"status",
	"--porcelain",
]);
if (!statusOutput.trim()) {
	console.log("No changes to commit");
	return;
}
const commitMessage = this.generateCommitMessage(updates);
await runCommand("git", ["commit", "-m", commitMessage]);

// push
const { stdout: branchOutput } = await runCommand("git", [
	"branch",
	"--show-current",
]);
const currentBranch = branchOutput.trim();
if (currentBranch) {
	await runCommand("git", ["push", "-u", "origin", currentBranch], {
		// timeout left to runner defaults unless you wrap with Promise.race
	});
}

// devbox add
await runCommand(
	"devbox",
	["add", `${update.packageName}@${update.latestVersion}`],
	{ cwd: path.dirname(path.resolve(this.configPath)) },
);
```

In `pr-manager.ts` `switchToBranch` / `pushBranch`:

```typescript
import * as exec from "@actions/exec";

await exec.exec("git", ["fetch", "origin"]);
await exec.exec("git", ["checkout", branchName]);
await exec.exec("git", ["push", "-u", "origin", branchName]);
```

Do **not** interpolate branch names into a shell string.

- [ ] **Step 2: Unit test commit uses argv form (mock `@actions/exec`)**

```typescript
jest.mock("@actions/exec");
import * as exec from "@actions/exec";

// in a commitChanges test with mocked git status etc:
expect(exec.exec).toHaveBeenCalledWith(
	"git",
	["commit", "-m", expect.stringContaining("chore: update")],
	expect.any(Object),
);
// Never expect a single-string shell commit like: git commit -m "..."
```

Adapt mocks so `exec.exec` returns 0 and feeds porcelain output via listeners if needed. If this becomes too heavy, export `runCommand` for direct testing of argument construction only and keep one integration-style test.

- [ ] **Step 3: Implement + run tests**

Run: `npm test -- tests/utils/file-manager.test.ts tests/utils/pr-manager.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/file-manager.ts src/utils/pr-manager.ts tests/utils/file-manager.test.ts
git commit -m "$(cat <<'EOF'
fix: run git and devbox via argv instead of shell strings

Avoids commit-message and package-name shell injection hazards.
EOF
)"
```

---

### Task 5: Align `update-latest` behavior with docs (keep `@latest` literal)

**Files:**
- Modify: `src/utils/file-manager.ts` (`applyUpdates`)
- Modify: `src/utils/version-query.ts` if needed for clarity only
- Test: `tests/utils/file-manager.test.ts` / version-query tests

**Intended behavior (document + implement):**

| `devbox.json` pin | `update-latest` | Action |
|-------------------|-----------------|--------|
| `pkg@1.2.3` | any | If newer exists → `devbox add pkg@NEWER` |
| `pkg@latest` | `false` | Skip entirely (`updateAvailable=false`) |
| `pkg@latest` | `true` | Refresh lock **without pinning**: run `devbox add pkg@latest` (or `devbox install` after ensuring JSON still says `@latest`), not `pkg@resolved` |

- [ ] **Step 1: Write failing test describing the contract**

```typescript
it("when updateLatest refresh, does not pin latest packages to concrete versions in devbox.json", async () => {
	// Arrange config with "nodejs@latest"
	// Mock runCommand/exec so devbox add is recorded
	// Apply update candidate:
	// { packageName: "nodejs", currentVersion: "latest", latestVersion: "22.1.0", updateAvailable: true }
	// Assert exec called with ["add", "nodejs@latest"] OR equivalent non-pinning command
	// Assert final devbox.json still contains "nodejs@latest" if readConfig is used
});
```

- [ ] **Step 2: Implement minimal fix in `applyUpdates` loop**

```typescript
for (const update of validUpdates) {
	const packageSpec =
		update.currentVersion === "latest"
			? `${update.packageName}@latest`
			: `${update.packageName}@${update.latestVersion}`;

	console.info(`Running: devbox add ${packageSpec}`);
	await runCommand("devbox", ["add", packageSpec], {
		cwd: path.dirname(path.resolve(this.configPath)),
	});
}
```

Remove reliance on dead `updatePackages` path **or** call it only if you stop using `devbox add` for non-latest packages. Prefer single path: always `devbox add` with the rule above.

Also delete or stop generating unused config backup if `devbox add` already rewrites files — optional cleanup:

```typescript
// after successful apply
try {
	await fs.unlink(backupPath);
} catch {
	// ignore cleanup failures
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/utils/file-manager.test.ts tests/utils/version-query.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/file-manager.ts tests/utils/file-manager.test.ts
git commit -m "$(cat <<'EOF'
fix: keep @latest pins when refreshing latest packages

devbox add pkg@resolved was incorrectly replacing intentional latest pins.
EOF
)"
```

---

### Task 6: Contract cleanup — action.yml, engines, examples, README

**Files:**
- Modify: `action.yml`
- Modify: `package.json`
- Modify: `examples/devbox-updater-simple.yml`
- Modify: `examples/devbox-updater.yml` (if broken)
- Modify: `README.md`
- Optionally modify: `src/index.ts` / `src/types/index.ts` to drop unused `prTitle`/`devboxVersion` **or** implement thin wiring

**Decision for this plan (YAGNI):** remove unimplemented inputs from `action.yml` rather than implementing them all.

- [ ] **Step 1: Edit `action.yml` to match code**

Keep only implemented inputs:

```yaml
inputs:
  token:
    description: 'GitHub token for creating pull requests and accessing repository content'
    required: true
  branch-prefix:
    description: 'Prefix for update branch names'
    required: false
    default: 'devbox-updates'
  max-retries:
    description: 'Maximum number of retries for network operations'
    required: false
    default: '3'
  update-latest:
    description: 'Whether to refresh lock files for packages marked as "latest" without pinning them'
    required: false
    default: 'false'
```

Remove (for now): `devbox-version`, `pr-title`, `pr-body-template`, `retry-delay`, `config-path`, `skip-packages`, `dry-run`.

Outputs keep only those set in `setActionOutputs`:

```yaml
outputs:
  changes:
    description: 'Whether any package updates were found and applied'
  update-summary:
    description: 'Summary of all package updates'
  pr-number:
    description: 'Pull request number if created or updated'
  pr-updated:
    description: 'Whether an existing PR was updated'
  existing-pr-found:
    description: 'Whether an existing update PR was found'
  error-message:
    description: 'Error message if the action failed'
```

Remove unused: `pr-url`, `updated-packages`, `skipped-packages`.

Remove invalid `permissions.metadata` if present in `action.yml` (workflow-level only). Keep:

```yaml
runs:
  using: 'node20'
  main: 'dist/index.js'
```

- [ ] **Step 2: Align `package.json` engines**

```json
"engines": {
  "node": ">=20.0.0"
}
```

- [ ] **Step 3: Fix simple example**

`examples/devbox-updater-simple.yml`:

```yaml
name: Simple Devbox Updates

on:
  schedule:
    - cron: '0 0 * * 0'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Devbox
        uses: jetify-com/devbox-install-action@v0.12.0
        with:
          enable-cache: true

      - name: Update Devbox packages
        uses: ./
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

Verify the install-action org/name/version against current public action (README currently uses `jetpack-io/devbox-install-action@v0.11.0` — keep **one** consistent reference; prefer whatever README already documents if still published).

- [ ] **Step 4: Trim `src/index.ts` config**

Either stop reading removed inputs, or keep reading with defaults for backward compatibility. Preferred:

```typescript
const config: ActionConfig = {
	token: core.getInput("token", { required: true }),
	branchPrefix: core.getInput("branch-prefix") || "devbox-updates",
	maxRetries: parseInt(core.getInput("max-retries") || "3", 10),
	updateLatest: core.getInput("update-latest").toLowerCase() === "true",
};
```

Update `ActionConfig` in `src/types/index.ts` accordingly (remove `devboxVersion`, `prTitle` if unused).

Update `validateConfig` and any tests that mock those inputs.

- [ ] **Step 5: Update README Inputs/Outputs tables** to match `action.yml`. State clearly: **Devbox must be installed in a prior step**; this action does not install Devbox.

- [ ] **Step 6: Run full test + build**

```bash
npm test
npm run build
```

Expected: tests PASS; `dist/index.js` regenerated.

- [ ] **Step 7: Commit**

```bash
git add action.yml package.json examples README.md src/index.ts src/types/index.ts tests dist
git commit -m "$(cat <<'EOF'
docs: align action contract with implemented inputs and outputs

Remove unimplemented inputs, fix example permissions/install, and
match Node engines to the node20 action runtime.
EOF
)"
```

---

### Task 7: Existing PR body overwrite (stop infinite append)

**Files:**
- Modify: `src/utils/pr-manager.ts` (`updateExistingPR` / `mergeDescriptions`)
- Test: `tests/utils/pr-manager.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
test("updateExistingPR overwrites body with current update set", async () => {
	mockOctokit.rest.pulls.update.mockResolvedValue({});
	const pr = {
		number: 3,
		branch: "devbox/multi-package-updates",
		title: "old",
		body: "## 📦 Devbox Package Updates\n\nold body",
		state: "open" as const,
		updatedAt: "2026-01-01T00:00:00Z",
	};
	const summary = {
		totalUpdates: 1,
		hasChanges: true,
		summary: "x",
		updates: [
			{
				packageName: "uv",
				currentVersion: "0.1.0",
				latestVersion: "0.2.0",
				updateAvailable: true,
			},
		],
	};

	await prManager.updateExistingPR(pr, summary, {
		preserveExistingUpdates: true,
		conflictResolution: "overwrite",
		updateDescription: true,
	});

	expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith(
		expect.objectContaining({
			body: expect.stringContaining("uv"),
		}),
	);
	const body = mockOctokit.rest.pulls.update.mock.calls[0][0].body as string;
	expect(body).not.toContain("Additional Updates");
	expect(body).not.toContain("old body");
});
```

- [ ] **Step 2: Change default merge strategy to overwrite**

In `updateExistingPR` default strategy:

```typescript
strategy: MergeStrategy = {
	preserveExistingUpdates: false,
	conflictResolution: "overwrite",
	updateDescription: true,
},
```

And when updating:

```typescript
updatedBody = this.formatChangeDescription(summary.updates);
```

Leave `mergeDescriptions` in place unused, or delete if no callers remain (prefer delete to avoid dead code).

- [ ] **Step 3: Run tests + commit**

```bash
npm test -- tests/utils/pr-manager.test.ts
git add src/utils/pr-manager.ts tests/utils/pr-manager.test.ts
git commit -m "$(cat <<'EOF'
fix: replace PR body with current update summary on refresh

Appending additional updates made PR descriptions grow without bound.
EOF
)"
```

---

### Task 8: Final verification gate

**Files:** none new

- [ ] **Step 1: Run full suite**

```bash
npm test
npm run lint
npm run build
```

Expected:
- All tests pass
- Lint clean (or only pre-existing issues you did not introduce)
- `dist/index.js` is current (check-dist workflow would pass)

- [ ] **Step 2: Manual checklist (no network required beyond prior mocks)**

Confirm by reading code:

1. Existing PR path calls `switchToBranch(existingPR.branch)` before `applyUpdates`
2. `createUpdatePR` / `createBranch` call `getDefaultBranch()`
3. `checkExistingPR` has no title keyword filter
4. `action.yml` inputs ⊆ what `src/index.ts` reads
5. Simple example has `contents: write` + Devbox install step
6. `update-latest` path does not `devbox add pkg@1.2.3` when current was `latest`

- [ ] **Step 3: Final commit only if dist or docs still dirty**

```bash
git status
# if dist drifted:
git add dist
git commit -m "chore: rebuild dist after critical fixes"
```

---

## Self-review

**Spec coverage (review P0/P1):**

| Finding | Task |
|---------|------|
| Existing PR commits land on default branch | Task 3 |
| Hardcoded `main` base | Task 1 |
| Title-based PR false positive | Task 2 |
| Unimplemented inputs/outputs | Task 6 |
| `update-latest` pins packages | Task 5 |
| Shell injection on git/devbox | Task 4 |
| Simple example missing install/write | Task 6 |
| PR body infinite append | Task 7 |
| Node engines vs node20 | Task 6 |

**Explicitly deferred (not bugs to ignore forever, but out of this plan):**

- `packages` object-map format support
- Real multi-package vs single-package PR productization (`groupUpdatesForPRs`)
- API concurrency limiting
- Full semver library
- Wiring `config-path` / `skip-packages` / `dry-run` (re-add when implemented)

**Placeholder scan:** none intentional — commands, code, and file paths are concrete.

**Type consistency:**

- `UpdateCandidate`, `UpdateSummary`, `ExistingPRInfo`, `ActionConfig` names match existing `src/types/index.ts`
- Public method used by index: `switchToBranch` (promoted public) or `ensureOnBranch` — implementer must pick one name and use it consistently in Task 3 (prefer public `switchToBranch` to minimize churn)

---

## Execution notes

- Prefer small commits per task as written.
- After Task 3, the action is safe enough for cautious production use; Tasks 4–7 reduce footguns and contract lies.
- Do not push unless the user asks.
- Rebuild `dist/` before claiming the action is shippable — GitHub runs `dist/index.js`, not `src/`.
