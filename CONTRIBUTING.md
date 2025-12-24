# Contributing to Devbox Updater Action

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Make your changes in the `src/` directory
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Build the action: `npm run build`

## Important: The `dist/` Directory

The `dist/` directory contains the compiled JavaScript code that GitHub Actions runs. This directory **must be committed** to the repository.

### Before Committing

Always run the following commands before committing:

```bash
npm run all  # Runs lint, test, and build
```

This ensures:
- Code passes linting
- All tests pass
- The `dist/` directory is up to date

### Why `dist/` is Committed

Unlike typical Node.js projects, GitHub Actions require the compiled code to be committed because:

1. **Runtime Environment**: GitHub Actions runners don't compile TypeScript
2. **Performance**: Avoids compilation time during action execution
3. **Dependencies**: All dependencies are bundled into `dist/index.js`
4. **Reliability**: Ensures the exact code that was tested is what runs

## Testing

### Unit Tests
```bash
npm test
```

### Property-Based Tests
The project uses `fast-check` for property-based testing. These tests are automatically run with the regular test suite.

### Testing the Action Locally
You can test the action locally by running:
```bash
node dist/index.js
```

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run all` to ensure everything passes
5. Commit your changes (including the updated `dist/` directory)
6. Push to your fork
7. Create a pull request

The CI will automatically check that the `dist/` directory is up to date.

## Release Process

1. Update the version in `package.json`
2. Run `npm run all`
3. Commit the changes
4. Create a new release on GitHub
5. Update the major version tag (e.g., `v1`, `v2`) to point to the latest release