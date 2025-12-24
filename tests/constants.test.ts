/**
 * Tests for constants and configuration values
 */

import { DEVBOX_API, FILES, GITHUB, DEFAULTS, PATTERNS } from '../src/constants';

describe('Constants', () => {
  describe('DEVBOX_API', () => {
    it('should have correct API configuration', () => {
      expect(DEVBOX_API.BASE_URL).toBe('https://search.devbox.sh/v2');
      expect(DEVBOX_API.ENDPOINTS.RESOLVE).toBe('/resolve');
      expect(DEVBOX_API.ENDPOINTS.PACKAGE).toBe('/pkg');
      expect(DEVBOX_API.TIMEOUT).toBe(30000);
      expect(DEVBOX_API.MAX_RETRIES).toBe(3);
    });
  });

  describe('FILES', () => {
    it('should define correct file names', () => {
      expect(FILES.DEVBOX_CONFIG).toBe('devbox.json');
      expect(FILES.DEVBOX_LOCK).toBe('devbox.lock');
    });
  });

  describe('GITHUB', () => {
    it('should have GitHub-related constants', () => {
      expect(GITHUB.DEFAULT_BRANCH_PREFIX).toBe('devbox-updates');
      expect(GITHUB.DEFAULT_PR_TITLE).toBe('Update Devbox packages');
      expect(GITHUB.PR_LABELS).toContain('dependencies');
      expect(GITHUB.PR_LABELS).toContain('devbox');
      expect(GITHUB.MAX_PR_BODY_LENGTH).toBe(65536);
    });
  });

  describe('PATTERNS', () => {
    it('should validate package names correctly', () => {
      expect(PATTERNS.PACKAGE_NAME.test('nodejs')).toBe(true);
      expect(PATTERNS.PACKAGE_NAME.test('nodejs@18')).toBe(true);
      expect(PATTERNS.PACKAGE_NAME.test('my-package')).toBe(true);
      expect(PATTERNS.PACKAGE_NAME.test('my_package')).toBe(true);
      expect(PATTERNS.PACKAGE_NAME.test('invalid package')).toBe(false);
      expect(PATTERNS.PACKAGE_NAME.test('')).toBe(false);
    });

    it('should validate versions correctly', () => {
      expect(PATTERNS.VERSION.test('1.0.0')).toBe(true);
      expect(PATTERNS.VERSION.test('18.1.0-beta')).toBe(true);
      expect(PATTERNS.VERSION.test('latest')).toBe(true);
      expect(PATTERNS.VERSION.test('invalid version!')).toBe(false);
    });

    it('should validate branch names correctly', () => {
      expect(PATTERNS.BRANCH_NAME.test('feature/update')).toBe(true);
      expect(PATTERNS.BRANCH_NAME.test('devbox-updates')).toBe(true);
      expect(PATTERNS.BRANCH_NAME.test('invalid branch name')).toBe(false);
    });
  });
});