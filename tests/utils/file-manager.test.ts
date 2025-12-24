/**
 * Tests for the FileManager component
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileManager } from '../../src/utils/file-manager';
import { DevboxConfig, UpdateCandidate, ValidationError, DevboxError } from '../../src/types';

// Mock fs and child_process modules
jest.mock('fs/promises');
jest.mock('child_process');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExec = jest.fn();

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: (cmd: string, options: any, callback: any) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    mockExec(cmd, options, callback);
  }
}));

describe('FileManager', () => {
  let fileManager: FileManager;
  let mockConfig: DevboxConfig;
  let mockUpdates: UpdateCandidate[];

  beforeEach(() => {
    fileManager = new FileManager('test-devbox.json', 'test-devbox.lock');
    
    mockConfig = {
      packages: ['nodejs@18.0.0', 'python@3.9.0', 'git'],
      shell: {
        init_hook: ['echo "Hello"'],
        scripts: {
          test: 'npm test'
        }
      }
    };

    mockUpdates = [
      {
        packageName: 'nodejs',
        currentVersion: '18.0.0',
        latestVersion: '18.1.0',
        updateAvailable: true
      },
      {
        packageName: 'python',
        currentVersion: '3.9.0',
        latestVersion: '3.9.0',
        updateAvailable: false
      }
    ];

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('readConfig', () => {
    it('should read and parse valid devbox.json', async () => {
      const configContent = JSON.stringify(mockConfig);
      mockFs.readFile.mockResolvedValue(configContent);

      const result = await fileManager.readConfig();

      expect(mockFs.readFile).toHaveBeenCalledWith('test-devbox.json', 'utf-8');
      expect(result).toEqual(mockConfig);
    });

    it('should throw ValidationError for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      await expect(fileManager.readConfig()).rejects.toThrow(ValidationError);
    });

    it('should throw DevboxError for missing file', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileManager.readConfig()).rejects.toThrow(DevboxError);
    });
  });

  describe('writeConfig', () => {
    it('should write config with proper formatting', async () => {
      mockFs.writeFile.mockResolvedValue();

      await fileManager.writeConfig(mockConfig);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-devbox.json',
        JSON.stringify(mockConfig, null, 2) + '\n',
        'utf-8'
      );
    });

    it('should throw ValidationError for invalid config', async () => {
      const invalidConfig = { packages: 'not-an-array' } as any;

      await expect(fileManager.writeConfig(invalidConfig)).rejects.toThrow(ValidationError);
    });
  });

  describe('updatePackages', () => {
    it('should update packages with new versions', () => {
      const result = fileManager.updatePackages(mockConfig, mockUpdates);

      expect(result.packages).toEqual([
        'nodejs@18.1.0', // Updated
        'python@3.9.0',  // No update available
        'git'             // No version specified
      ]);
      expect(result.shell).toEqual(mockConfig.shell); // Preserve other config
    });

    it('should preserve original config structure', () => {
      const result = fileManager.updatePackages(mockConfig, []);

      expect(result).toEqual(mockConfig);
      expect(result).not.toBe(mockConfig); // Should be a copy
    });

    it('should handle packages without versions', () => {
      const configWithoutVersions = {
        packages: ['nodejs', 'python', 'git']
      };

      const updates = [
        {
          packageName: 'nodejs',
          currentVersion: '',
          latestVersion: '18.1.0',
          updateAvailable: true
        }
      ];

      const result = fileManager.updatePackages(configWithoutVersions, updates);

      expect(result.packages).toEqual([
        'nodejs@18.1.0', // Updated with version
        'python',         // No update
        'git'             // No update
      ]);
    });
  });

  describe('createBackup', () => {
    it('should create backup with timestamp', async () => {
      mockFs.copyFile.mockResolvedValue();
      
      const backupPath = await fileManager.createBackup();

      expect(mockFs.copyFile).toHaveBeenCalledWith('test-devbox.json', backupPath);
      expect(backupPath).toMatch(/test-devbox\.json\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it('should throw DevboxError on backup failure', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('Permission denied'));

      await expect(fileManager.createBackup()).rejects.toThrow(DevboxError);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore config from backup', async () => {
      mockFs.copyFile.mockResolvedValue();

      await fileManager.restoreFromBackup('backup-path');

      expect(mockFs.copyFile).toHaveBeenCalledWith('backup-path', 'test-devbox.json');
    });

    it('should throw DevboxError on restore failure', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('Backup not found'));

      await expect(fileManager.restoreFromBackup('backup-path')).rejects.toThrow(DevboxError);
    });
  });
});