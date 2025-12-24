# Devbox Package Updater Action

A GitHub Action that automatically checks and updates Devbox packages in your `devbox.json` and `devbox.lock` files.

## Features

- 🔍 **Automatic Package Discovery**: Scans your `devbox.json` for outdated packages
- 🚀 **Smart Updates**: Uses the Devbox Search API for accurate version information
- 📝 **Pull Request Creation**: Creates detailed pull requests with update summaries
- 🔄 **Incremental Updates**: Intelligently handles multiple runs by updating existing PRs
- 🛡️ **Error Handling**: Robust error handling with retry mechanisms
- ⚡ **Fast & Reliable**: Built with TypeScript and comprehensive testing

## Usage

### Basic Usage

```yaml
name: Update Devbox Packages
on:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Mondays
  workflow_dispatch: # Manual trigger

jobs:
  update-packages:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      metadata: read
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Devbox
        uses: jetpack-io/devbox-install-action@v0.11.0
        with:
          enable-cache: true
      
      - name: Update Devbox Packages
        uses: xiaolutech/devbox-update-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

> **⚠️ Important**: Make sure to include the `permissions` section in your workflow and enable "Allow GitHub Actions to create and approve pull requests" in your repository settings. See the [Permissions](#permissions) section for detailed setup instructions.

### Advanced Configuration

```yaml
- name: Install Devbox
  uses: jetpack-io/devbox-install-action@v0.11.0
  with:
    enable-cache: true

- name: Update Devbox Packages
  uses: xiaolutech/devbox-update-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    devbox-version: 'latest'
    branch-prefix: 'devbox-updates'
    pr-title: 'Update Devbox packages'
    max-retries: 3
    update-latest: true
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `token` | GitHub token for creating pull requests | Yes | `${{ github.token }}` |
| `devbox-version` | Version of Devbox to install | No | `latest` |
| `branch-prefix` | Prefix for update branch names | No | `devbox-updates` |
| `pr-title` | Title template for pull requests | No | `Update Devbox packages` |
| `max-retries` | Maximum number of retries for network operations | No | `3` |
| `update-latest` | Whether to refresh lock files for packages marked as "latest" | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `changes` | Whether any package updates were found and applied |
| `update-summary` | Summary of all package updates |
| `pr-number` | Pull request number if created |
| `pr-updated` | Whether an existing PR was updated |
| `existing-pr-found` | Whether an existing update PR was found |
| `error-message` | Error message if the action failed |

## How It Works

1. **Discovery**: Scans your `devbox.json` file for package dependencies
2. **Version Check**: Queries the Devbox Search API for the latest versions
3. **Update Detection**: Compares current versions with latest available versions
4. **File Updates**: Updates `devbox.json` and regenerates `devbox.lock`
5. **Pull Request**: Creates or updates a pull request with the changes

### Handling "latest" Packages

By default, packages marked as `latest` (e.g., `nodejs@latest`) are not updated to preserve the user's intent to always use the latest version. However, you can enable lock file refreshing for these packages:

- **`update-latest: false`** (default): Packages like `nodejs@latest` remain unchanged, and their lock files are not refreshed
- **`update-latest: true`**: The action will regenerate lock files for `latest` packages to ensure they resolve to the actual latest versions, while keeping `devbox.json` unchanged

This is useful when you want to periodically refresh the resolved versions in your lock file without changing your package specifications.

## Requirements

- A repository with a `devbox.json` file
- GitHub Actions enabled
- Repository configured to allow GitHub Actions to create pull requests (see [Permissions](#permissions))
- Node.js 22+ (for local development)

### Permissions

This action requires the following GitHub permissions:

- **`contents: write`** - To create and manage branches for pull requests
- **`pull-requests: write`** - To create and update pull requests
- **`metadata: read`** - To read repository information (usually granted by default)

#### Workflow Configuration

You can configure these permissions in your workflow file:

```yaml
jobs:
  update-packages:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      # ... your steps
```

#### Repository Settings

**Important**: If you encounter the error "GitHub Actions is not permitted to create or approve pull requests", you need to enable this feature in your repository settings:

1. Go to your GitHub repository
2. Click **Settings** tab
3. Navigate to **Actions** → **General** in the left sidebar
4. Scroll down to **Workflow permissions** section
5. Select **Read and write permissions**
6. ✅ Check **Allow GitHub Actions to create and approve pull requests**
7. Click **Save**

![GitHub Actions Permissions](https://docs.github.com/assets/cb-45061/images/help/repository/actions-workflow-permissions-repository.png)

> **Note**: This is a repository-level setting that must be enabled by repository administrators. Without this setting, the action will fail with permission errors even if the workflow has the correct permissions configured.

## Troubleshooting

### Common Issues

#### "GitHub Actions is not permitted to create or approve pull requests"

This error occurs when the repository settings don't allow GitHub Actions to create PRs. See the [Permissions](#permissions) section for the complete setup guide.

#### "No commits between main and [branch-name]"

This error indicates that the action created a branch but didn't commit any changes to it. This can happen when:

1. **No actual updates were found**: The packages are already up to date
2. **File update failed**: The action detected updates but failed to apply them
3. **Git commit failed**: Files were updated but not committed to the branch

**Solution**: Check the action logs for any errors during the "File Updates" phase. The action should automatically commit changes after updating files.

#### "Devbox is not installed or not available in PATH"

The action requires Devbox to be installed to regenerate lock files. Make sure your workflow includes Devbox installation:

```yaml
- name: Install Devbox
  uses: jetpack-io/devbox-install-action@v0.11.0
  with:
    enable-cache: true

- name: Update Devbox Packages
  uses: xiaolutech/devbox-update-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

This action is built with TypeScript and uses:

- **Testing**: Jest with fast-check for property-based testing
- **Linting**: ESLint with TypeScript support
- **Building**: Vercel's ncc for bundling

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

### Important: Dist Directory

The `dist/` directory contains the compiled JavaScript code that GitHub Actions actually runs. This directory **must be committed** to the repository because:

- GitHub Actions runs the compiled JavaScript, not the TypeScript source
- All dependencies are bundled into `dist/index.js` for faster execution
- The `action.yml` file references `dist/index.js` as the main entry point

Always run `npm run build` before committing changes to ensure the `dist/` directory is up to date.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.