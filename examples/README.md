# Devbox Updater Action Examples

This directory contains example workflows for using the Devbox Package Updater GitHub Action.

## 📁 Example Files

- `devbox-updater-simple.yml` - Basic workflow example
- `devbox-updater.yml` - Standard workflow with error handling
- `devbox-updater-advanced.yml` - Advanced workflow with matrix strategy
- `README.md` - This documentation file

## 🚀 How to Use These Examples

To use any of these workflow examples in your repository:

1. **Copy the desired workflow file** from this `examples/` directory
2. **Move it to** `.github/workflows/` in your repository
3. **Customize the configuration** as needed for your project
4. **Commit and push** the workflow file

For example:
```bash
# Copy the basic example
cp examples/devbox-updater-simple.yml .github/workflows/
# Or copy the advanced example
cp examples/devbox-updater-advanced.yml .github/workflows/devbox-updater.yml
```

⚠️ **Important**: These files are examples only. They will not run automatically unless you copy them to the `.github/workflows/` directory in your repository.

## Quick Start

The simplest way to use this action is with the basic configuration:

```yaml
name: Update Devbox Packages

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/devbox-updater-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Example Workflows

### 1. Basic Workflow (`devbox-updater-simple.yml`)
- Minimal configuration
- Weekly updates on Sunday
- Uses default settings for all options

### 2. Standard Workflow (`devbox-updater.yml`)
- Scheduled and manual triggers
- Error handling and notifications
- Configurable inputs via workflow_dispatch
- Creates issues on failure

### 3. Advanced Workflow (`devbox-updater-advanced.yml`)
- Multiple schedule options
- Matrix strategy for multiple config files
- Advanced error handling and artifacts
- Comprehensive logging and summaries

## Configuration Options

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `devbox-version` | Version of Devbox to install | No | `latest` |
| `branch-prefix` | Prefix for update branch names | No | `devbox-updates` |
| `pr-title` | Title template for pull requests | No | `Update Devbox packages` |
| `pr-body-template` | Template for PR body content | No | Default template |
| `max-retries` | Maximum retry attempts | No | `3` |
| `retry-delay` | Initial retry delay in seconds | No | `1` |
| `update-latest` | Update packages marked as "latest" | No | `false` |
| `config-path` | Path to devbox.json file | No | `devbox.json` |
| `skip-packages` | Packages to skip (comma-separated) | No | `''` |
| `dry-run` | Run without making changes | No | `false` |

### Outputs

| Output | Description |
|--------|-------------|
| `changes` | Whether updates were found |
| `update-summary` | Summary of all updates |
| `pr-number` | Created PR number |
| `pr-url` | URL of the PR |
| `pr-updated` | Whether existing PR was updated |
| `existing-pr-found` | Whether existing PR was found |
| `updated-packages` | JSON array of updated packages |
| `skipped-packages` | JSON array of skipped packages |
| `error-message` | Error message if failed |

## Permissions Required

The action requires the following permissions:

```yaml
permissions:
  contents: read      # Read repository content
  pull-requests: write # Create and update PRs
  issues: write       # Create issues on failure (optional)
```

## Scheduling Options

### Common Cron Schedules

```yaml
# Daily at 2 AM UTC
- cron: '0 2 * * *'

# Weekly on Monday at 9 AM UTC
- cron: '0 9 * * 1'

# Monthly on the 1st at midnight UTC
- cron: '0 0 1 * *'

# Weekdays at 6 PM UTC
- cron: '0 18 * * 1-5'
```

## Advanced Usage

### Multiple Configuration Files

```yaml
strategy:
  matrix:
    config:
      - path: 'devbox.json'
        name: 'main'
      - path: 'backend/devbox.json'
        name: 'backend'
      - path: 'frontend/devbox.json'
        name: 'frontend'

steps:
  - uses: your-org/devbox-updater-action@v1
    with:
      config-path: ${{ matrix.config.path }}
      branch-prefix: devbox-updates-${{ matrix.config.name }}
```

### Conditional Execution

```yaml
- name: Check if devbox.json exists
  id: check
  run: echo "exists=$(test -f devbox.json && echo true || echo false)" >> $GITHUB_OUTPUT

- uses: your-org/devbox-updater-action@v1
  if: steps.check.outputs.exists == 'true'
```

### Custom PR Templates

```yaml
- uses: your-org/devbox-updater-action@v1
  with:
    pr-body-template: |
      ## 📦 Devbox Package Updates
      
      This PR updates the following packages:
      {updates}
      
      ### 📋 Summary
      {summary}
      
      ### ✅ Checklist
      - [ ] Review package changes
      - [ ] Test development environment
      - [ ] Update documentation if needed
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the workflow has proper permissions
2. **No Updates Found**: Check if packages are already up to date
3. **Network Failures**: The action includes retry logic with exponential backoff
4. **Devbox Command Failures**: Check the action logs for detailed error messages

### Debug Mode

Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository.

### Dry Run Mode

Test the action without making changes:

```yaml
- uses: your-org/devbox-updater-action@v1
  with:
    dry-run: true
```

## Security Considerations

- Use `secrets.GITHUB_TOKEN` for the token input
- Limit permissions to the minimum required
- Review generated PRs before merging
- Consider using branch protection rules

## Support

For issues and questions:
1. Check the [action logs](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/using-workflow-run-logs)
2. Review the [troubleshooting guide](#troubleshooting)
3. Open an issue in the repository