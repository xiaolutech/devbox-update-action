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
    steps:
      - uses: actions/checkout@v4
      
      - name: Update Devbox Packages
        uses: xiaolutech/devbox-update-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

```yaml
- name: Update Devbox Packages
  uses: xiaolutech/devbox-update-action@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    devbox-version: 'latest'
    branch-prefix: 'devbox-updates'
    pr-title: 'Update Devbox packages'
    max-retries: 3
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `token` | GitHub token for creating pull requests | Yes | `${{ github.token }}` |
| `devbox-version` | Version of Devbox to install | No | `latest` |
| `branch-prefix` | Prefix for update branch names | No | `devbox-updates` |
| `pr-title` | Title template for pull requests | No | `Update Devbox packages` |
| `max-retries` | Maximum number of retries for network operations | No | `3` |

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

## Requirements

- A repository with a `devbox.json` file
- GitHub Actions enabled
- Node.js 22+ (for local development)
- Appropriate permissions for the GitHub token (contents: write, pull-requests: write)

## Development

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