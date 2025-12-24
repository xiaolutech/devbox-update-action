/**
 * Tests for type definitions and interfaces
 */

import {
  DevboxConfig,
  UpdateCandidate,
  UpdateSummary,
  ActionOutputs,
  ExistingPRInfo,
  MergeStrategy,
  DevboxPackageInfo,
  DevboxError,
  NetworkError,
  ValidationError,
  GitHubError
} from '../src/types';

describe('Type Definitions', () => {
  describe('DevboxConfig', () => {
    it('should accept valid configuration', () => {
      const config: DevboxConfig = {
        packages: ['nodejs@18', 'python@3.11'],
        shell: {
          init_hook: ['echo "Hello"'],
          scripts: {
            test: 'npm test'
          }
        },
        nixpkgs: {
          commit: 'abc123'
        }
      };

      expect(config.packages).toHaveLength(2);
      expect(config.shell?.scripts?.test).toBe('npm test');
    });

    it('should accept configuration with schema and array scripts', () => {
      const config: DevboxConfig = {
        $schema: 'https://raw.githubusercontent.com/jetify-com/devbox/0.15.0/.schema/devbox.schema.json',
        packages: ['oxipng@9.1.5', 'uv@0.9.15', 'just@1.43.1'],
        shell: {
          init_hook: ['echo "Welcome to devbox!" > /dev/null'],
          scripts: {
            test: ['echo "Error: no test specified" && exit 1']
          }
        }
      };

      expect(config.$schema).toBeDefined();
      expect(config.packages).toHaveLength(3);
      expect(Array.isArray(config.shell?.scripts?.test)).toBe(true);
    });

    it('should accept minimal configuration', () => {
      const config: DevboxConfig = {
        packages: ['nodejs']
      };

      expect(config.packages).toHaveLength(1);
      expect(config.shell).toBeUndefined();
    });
  });

  describe('UpdateCandidate', () => {
    it('should represent package update information', () => {
      const candidate: UpdateCandidate = {
        packageName: 'nodejs',
        currentVersion: '18.0.0',
        latestVersion: '18.1.0',
        updateAvailable: true
      };

      expect(candidate.updateAvailable).toBe(true);
      expect(candidate.packageName).toBe('nodejs');
    });
  });

  describe('UpdateSummary', () => {
    it('should summarize multiple updates', () => {
      const summary: UpdateSummary = {
        totalUpdates: 2,
        updates: [
          {
            packageName: 'nodejs',
            currentVersion: '18.0.0',
            latestVersion: '18.1.0',
            updateAvailable: true
          },
          {
            packageName: 'python',
            currentVersion: '3.10.0',
            latestVersion: '3.11.0',
            updateAvailable: true
          }
        ],
        hasChanges: true,
        summary: '2 packages updated'
      };

      expect(summary.totalUpdates).toBe(2);
      expect(summary.hasChanges).toBe(true);
    });
  });

  describe('Error Classes', () => {
    it('should create DevboxError with code and context', () => {
      const error = new DevboxError('Test error', 'TEST_CODE', { key: 'value' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('DevboxError');
    });

    it('should create NetworkError', () => {
      const error = new NetworkError('Network failed');
      
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should create ValidationError', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should create GitHubError', () => {
      const error = new GitHubError('GitHub API failed');
      
      expect(error.code).toBe('GITHUB_ERROR');
      expect(error.name).toBe('GitHubError');
    });
  });
});